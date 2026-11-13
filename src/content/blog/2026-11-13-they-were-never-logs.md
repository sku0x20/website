---
title: "They Were Never Logs"
description: "Every UDP packet between eglu's cloud and ~5,000 hubs went to Loki as a line of hex text. It was analytics data all along. 10.6 GB a day into Loki became 190.6 MB in ClickHouse."
date: "Nov 13, 2026"
tags: ["ClickHouse", "Loki", "Grafana", "IoT", "Observability"]
---

Every packet between eglu's cloud and its hubs got written to Loki as a line of hex text. We called them hex logs. They were 86.4% of everything going into Loki.

I've put real work into making that faster. A while back I [profiled the backend and found hex formatting near the top](/blog/optimizing-hex-formatting), and swapped `String.format` for `HexFormat`. It was a good fix. It made the wrong thing cheaper.

---

## What "Hex Logs" Cost

Measured over a week, before any change:

- **51.8M lines and 10.6 GB a day** into Loki, from about **5,000 hubs**.
- Bursts up to **7,959 lines/s**, 13× the average, at no fixed time.
- A daily gzipped text backup: **1.065 GB a day**, sitting in cold storage, readable by nobody.

The inflation is the part that stings. One real day was **2.16 GB of actual packet bytes**. As hex log lines it was **8.61 GB**. That's 4× before Loki added its own overhead, and then gzip spent CPU clawing most of it back for the backup.

And for all that, it wasn't queryable in the ways that mattered:

- **One busy hub's day couldn't be fetched as one query.** The result was 7.5 MB, over Loki's 4 MiB limit. Grafana Explore's default 1,000 lines showed about 13 minutes of that hub. Getting the whole day meant ~12 two-hour slices of ~5 s each, about a minute (estimate).
- **Per-hub analysis was impossible.** "Which hubs send the most?" hits Loki's 500-series limit with 5,000 hubs. It refuses even one hour.

None of this is Loki's fault. It's a log store, and I'd handed it something that only looked like logs.

---

## The Click

I was messing around with Google Cloud associate certification material, which means a lot of BigQuery. Somewhere in there it clicked: this is analytics data.

Logs are for reading what happened. These packets are for asking questions. Which hub floods, which command dominates, what one hub said between 14:00 and 14:05. Append-only, a few columns read over many rows, never updated. That's the textbook case for a columnar store, and I already ran one: [ClickHouse holds eglu's device health data](/blog/moving-iot-telemetry-from-nested-folders-to-clickhouse) on the same VM.

Once the category changed, every downstream decision changed with it. Mostly, things got deleted.

---

## Bytes Stay Bytes

Every hub packet has the same frame: a fixed header, then a variable body. So the table stores the packet as raw byte slices in wire order. Look-alike, trimmed:

```sql
CREATE TABLE packets
(
    ts          DateTime64(3, 'UTC')       CODEC(Delta, ZSTD(1)),
    direction   Enum8('in' = 1, 'out' = 2) CODEC(ZSTD(1)),
    hub_id      FixedString(8)             CODEC(ZSTD(1)),
    counter     FixedString(2)             CODEC(Delta, ZSTD(1)),
    command     FixedString(1)             CODEC(ZSTD(1)),
    -- ...the other header slices, each FixedString
    body        String                     CODEC(ZSTD(3))
)
ENGINE = MergeTree
PARTITION BY toDate(ts)
ORDER BY (hub_id, ts)
TTL toDate(ts) + INTERVAL 30 DAY
SETTINGS ttl_only_drop_parts = 1;
```

The decisions:

- **No raw packet column.** `concat()` of the slices *is* the packet, byte for byte. A separate raw column would store everything twice.
- **No hex in storage.** Hex is produced in the dashboard SQL, only for the rows a human is looking at. Even the little-endian counter stays as raw bytes; `reinterpretAsUInt16` reads it with no byte swap.
- **`ORDER BY (hub_id, ts)`.** Every real question is "this hub, this window". I spent a while on `(hub_id, command, ts)` vs `(hub_id, ts, command)`. The numbers settled it: the busiest hub on day 1 had 158,211 rows, so one 8,192-row granule covers over an hour of it, and the median hub sends a packet about every 20 seconds. `ts` is near-unique at millisecond precision, so anything after it in the key is decoration.
- **Daily partitions.** I'd planned monthly, because partitions are for data management, not speed. Then retention became a strict 30 days. With monthly partitions and a 30-day TTL, you keep up to two months. Daily partitions with `ttl_only_drop_parts` drop a whole day at once, and one partition is exactly one day's backup file.
- **Store everything.** Pings, duplicates, retries, and ping ACKs. The hex log skipped outbound ping ACKs purely because of Loki volume. That's 19.4M rows a day that had never been recorded.

One quiet trap: `FixedString` zero-pads short values. Hand it 1 byte for a 2-byte slice and it stores 2, silently, and the packet is no longer the packet. One of the Java client's writers does exactly that, so the ingest uses a serializer with explicit columns and never pads.

---

## The Codec the Schema Lost

The design said ZSTD. The schema draft lost it somewhere, and the server default is LZ4. I only caught it because I ran a compression test before creating anything on prod: one real day (51.9M packets) from the gzipped backups, into a local ClickHouse of the same version.

| Variant | MB per day | vs 1.065 GB gzip |
|---|---|---|
| LZ4 (what I would have shipped) | 518.3 | 48.7% |
| ZSTD(1) everywhere | 264.5 | 24.8% |
| Delta on `ts`, ZSTD(3) on body, ZSTD(1) rest | 219.9 | 20.6% |
| Same, plus Delta on `counter` | **193.4** | **18.2%** |
| Delta + ZSTD(6) everywhere (smallest) | 164.5 | 15.4% |

Two things surprised me.

**Delta works on `FixedString`.** I'd assumed it couldn't, since the counter is raw bytes, not a number. ClickHouse accepts it as `Delta(2)` on `FixedString(2)`, and the counter went from 37.0 MB to 10.5 MB. I verified the round trip by hash; the bytes come back exact. That was the single largest gain in the table, and it was only in the test because the test tried it.

**Delta beat DoubleDelta on timestamps,** 60.2 MB vs 82.1 MB. Timestamps per hub only ever go up, but the gaps are irregular, so the second difference is noise.

I picked 193.4 MB, not the smallest. The smallest cost +60% CPU in the test, reads were no faster (9–12 ms for a busy hub's day on every variant), and the disk didn't need the extra 15%. A codec can be raised later with `ALTER ... MODIFY COLUMN`, and old parts age out under the TTL anyway. The CPU times were single runs under emulation on my laptop, so they only compare variants against each other. That was enough to say no.

---

## Batching: The Brief vs the Code

The plan said no batching in the JVM. Let ClickHouse's `async_insert` batch on the server, keep the app simple, and lose nothing on a crash.

Then I did the arithmetic. One insert per packet is one HTTP request per packet: 825 a second on average, 8,000 in a burst. `async_insert` saves ClickHouse from tiny parts. It doesn't save anyone from that.

So the backend batches after all, but it never waits:

- A **packet recorder** sits on the hub UDP path. Inbound packets are recorded on receive, before parsing, so duplicates are included. Outbound packets are recorded after a successful send, at the one place every send goes through.
- Rows go into a **bounded `ArrayBlockingQueue` of 100k**. The packet path calls `offer()`, never `put()`. If the queue is full, the row is dropped and counted. Hub traffic matters more than its record.
- One drainer thread sends a batch every **200 ms or at 5,000 rows**, in RowBinary over HTTP.
- **One retry, then drop with an error log.** Delivery is at least once, sometimes twice.
- `async_insert = 1` with `wait_for_async_insert = 0` is locked on the ingest user's profile, so every insert from it is async, whatever the client sends.

The cost of `wait_for_async_insert = 0` is that a failed flush on the server never reaches the app. I took that trade over juggling futures under load, and moved the signal to ClickHouse's side: an alert on any non-OK row in `system.asynchronous_insert_log`, and another if no packets arrive for 10 minutes.

No Kafka and no middle service. Their only job here would be batching, and that's done.

---

## Dashboards That Can't Hurt Ingest

This pattern started a week earlier, with device health. ClickHouse had no query limits at all; any query could take up to 7.5 GB of RAM on a 2-core VM that also takes ~17k device insert batches a day. I wanted Grafana on that data, and I didn't want a dashboard to be the reason inserts slowed down.

So Grafana got its own read-only user and profile:

- **One thread per query** (of 2 cores), lower scheduling priority than inserts, **1 GB** of memory, a **30 s** timeout, at most **200M rows** read, at most **2 concurrent** queries.
- Over a limit, the query fails. It doesn't quietly truncate. And Grafana can't raise any of it.

I tested it under live load: a 15-day query over all devices read 93M rows in 5.5 s while insert p95 stayed around 5 ms.

I skipped materialized views. They add work to every insert, and a failing view fails the insert, which would lose device data. Instead, ClickHouse's query cache is set to 15 minutes, matching how often devices report. A repeated chart went from **523 ms to 1 ms**.

I also tried OS-level thread priority for Grafana's queries. The official ClickHouse image blocks it by design, and the [upstream PR](https://github.com/ClickHouse/ClickHouse/pull/70945) to change that was closed without merging. Running ClickHouse as root or maintaining a custom image wasn't worth it, so ClickHouse's own priority setting does the job.

For packets, I added a second user, because "show me this hub's last hour" and "which hubs flood" are different jobs:

- **`grafana_live`**, for single-hub views: must use the primary key, capped at **2M rows read and 10k rows returned**. One hub's full day is far under that. A day across all hubs is about 70M rows, so it can't run a fleet scan.
- **`grafana_ro`** keeps the device-health limits and the query cache, for fleet analytics.

The limits live in ClickHouse, not in the dashboard, because anyone with Explore can type any SQL against a datasource.

Two things bit me here.

**The Grafana ClickHouse plugin adds 4 s to your timeout.** I set the datasource to 30 s. The plugin sent `max_execution_time = 34`, above the user's 30 s cap, so ClickHouse refused every live query with code 452. The datasource health check kept passing the whole time. Setting the plugin's timeout to 6 (which sends 10) fixed it.

**An empty hub box isn't an empty query.** `hub_id = unhex('')` doesn't narrow the key, so ClickHouse estimated the full scan and the 2M cap refused it. That's 46 refusals on day 1, all with an empty hub, none for a real one. The cap did its job, but the panel showed an error where it should have shown nothing. Guarding it with `match(hub, '^[0-9a-fA-F]{16}$') AND hub_id = unhex(hub)` lets ClickHouse fold an empty hub to `false` and read 0 parts.

---

## Backup: Parquet, Not Gzipped Text

Every night, one query exports yesterday's partition as Parquet straight to cold storage, under a Hive-style `dt=YYYY-MM-DD/` path. The scheduler is a container next to ClickHouse, not a cron line on the VM, with alerts for a failed run and for no run in 25 hours.

Parquet because it's open, columnar like the table, and anything reads it without me: BigQuery, DuckDB, Spark. No gzip on top, since that blocks column reads. No Iceberg for one append-only file a day with one writer; it can adopt the files later.

The gotcha: ClickHouse can export `String` columns as UTF-8 strings in Parquet, and the default has changed between versions. My body column is raw bytes, so it would be labeled as text. `output_format_parquet_string_as_string = 0` exports it as a plain byte array. I checked the Parquet types on the real file, and a full hub-day read back from it matches byte for byte.

---

## Day 1

Hex logs still went to Loki in parallel, which made Loki the reference. UTC day Nov 12, all measured:

| | Before: Loki | After: ClickHouse |
|---|---|---|
| Packets per day | 51.8M lines | **69.9M rows**: 50.5M like for like, plus 19.4M ping ACKs never logged before |
| Peak | 7,959 lines/s | 7,465 rows/s |
| Size per day | 10.6 GB into Loki; 1.065 GB gzipped backup | **190.6 MB** stored, 17.9% of the gzip |
| Backup per day | 1.065 GB gzipped text | **322 MB** Parquet |
| One busy hub, full day | fails as one query; ~1 min in slices (estimate) | **27–65 ms** per panel |
| Insert errors | — | **0 of 1,069,060** flushes |
| Data loss | — | **0** against Loki over 3 hours, including the 7,465/s burst hour |

The compression test predicted ~210 MB a day with ping ACKs. Prod came in at 190.6 MB. Single-hub dashboard queries: p50 24 ms, p95 58 ms. A full day across all hubs takes 3–10 s.

---

## What I Could See for the First Time

Per-hub traffic had never been visible, so day 1 also turned up things nobody had asked about:

- **The busiest hub** had 5 scheduled rules each reporting about once a second, until midnight. Every report costs a database read on the backend.
- **Two hubs** send more than 80% of their traffic as hub log packets.
- **The ingest user was writing 97.5% of ClickHouse's own query log**, about 0.22 GB a day. That would have taken the disk to ~80% within 90 days. I turned query logging off for that user only and removed its old rows: **652.9 MB → 51.8 MB**, no restart.

Next week the backend stops writing hex logs to Loki, and the gzipped text upload goes away.

---

## The Takeaway

The `HexFormat` fix was real engineering, and I'd do it again for something that has to be text. These packets never had to be text. The fastest hex formatting turned out to be not formatting at all, until a human asks to see a row.

Before tuning a pipeline, I now ask what the data actually is. The tuning only matters once that answer is right.
