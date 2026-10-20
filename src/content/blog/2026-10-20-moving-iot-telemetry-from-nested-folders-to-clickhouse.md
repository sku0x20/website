---
title: "Moving IoT Telemetry from Nested Folders to ClickHouse"
description: "IoT telemetry stored as protobuf files eight folders deep, with no way to query it. How 90 GB became 3.7 GB in ClickHouse."
date: "Oct 20, 2026"
tags: ["ClickHouse", "Databases", "IoT", "Go", "gRPC"]
---

The backend's idea of a time-series database was the filesystem.

Every sensor reading from every IoT device went straight to raw disk as a protobuf file. No database. Just `open()`, `write()`, and vibes. 2024 alone was 90 GB of it, and none of it could be queried. Today that year is 3.7 GB in ClickHouse, and you can ask it questions.

---

## The Crime Scene

Device IDs (EIDs) are 8 bytes, stored as 23-character strings like `7F-A3-1C-E9-04-B2-5D-88`. Dumping one folder per device into a single directory would give you one enormous flat directory that's miserable to list or back up. So, presumably to avoid that, every byte got its own folder:

```
7F/A3/1C/E9/04/B2/5D/88/2024_w37.health
```

Eight levels deep. Per device. EIDs are random (no vendor prefix, no shared ranges), so nothing gets shared between devices. Every single device pays for the full chain.

Every directory is an inode and at least one 4 KiB block. So before a single reading is stored:

- **8 directory inodes per device**
- **32 KiB of folders per device**, holding nothing but other folders

Inside the last folder sat one file per aligned week, holding that device's readings for the week. That's another ~52 inodes per device per year, each file rounding up to at least 4 KiB. The nesting meant to tame the directory problem just turned it into an inode-hungry storage tax.

Writes, at least, appended. Each batch opened the week file in append mode, wrote length-delimited protobuf messages with `writeDelimitedTo`, and closed it. Fine for one file. Less fine when thousands of devices are each opening, locking, appending a few bytes to, and closing their own file somewhere in an 8-deep tree. Tiny writes scattered all over the disk, and disk IO stayed high.

Reads? There weren't any. Nothing could query this data. A file has no index, so answering "what did this device's voltage look like last Tuesday" meant writing a script to walk the tree, `parseDelimitedFrom` every message in the week file from the very first one, and filter in memory. Nobody did. The data was write-only: years of telemetry, faithfully stored, never looked at.

---

## Searching for the Wrong Thing

I knew it needed a real database. I did not know what kind.

This was late 2024 to early 2025. AI chat existed, but it wasn't the agent that goes off and reads docs for you while you get coffee. So it was me, docs, and forum threads.

And I was searching for the wrong thing: "historic data." Storing historic data, querying historic data, databases for historic data. That road leads straight into Hadoop territory, Druid, and friends. Whole ecosystems built for companies with a data team, not one person with a pile of sensor readings.

After about three to four months of that, **ClickHouse** showed up. From there the vocabulary landed fast: OLTP, OLAP, columnar storage. Huge append-heavy writes, reads that scan ranges, almost never updates. That's **OLAP**, online analytical processing. I just didn't know the name of my own problem, so I couldn't search for it.

Then came the R&D phase: load data, query it, break it, check it actually holds up. It did.

---

## The Write Path

ClickHouse hates single-row inserts. Every insert creates a new part on disk, and a stream of tiny inserts leaves it drowning in parts and merging forever. It wants batches.

So the backend doesn't talk to ClickHouse at all:

1. Incoming readings get appended to an in-memory list.
2. A thread wakes up every **5 seconds**, drains the list, and ships the batch over **gRPC**.
3. A small **Go service** on the other end owns ClickHouse. It's the only thing that knows ClickHouse exists. It does the insert, enforces limits, and that's it.

The backend just knows "send telemetry here." Swapping the database later doesn't touch it.

### Reads and Writes Don't Share a Process

Reads go through the same Go service, but it runs in **modes**. One deployment handles writes, a separate one handles reads. Same binary, different job.

I didn't know the name for this at the time. It's basically CQRS. What I did know was simpler: some heavy query on the read side must never be able to saturate the write path. If the read side crashes, a query fails and gets retried. If the write side crashes, I'm losing data. Those two failure modes don't get to share a process.

```
devices ──▶ backend ──(5s batch, gRPC)──▶ Go service [write mode] ──▶ ClickHouse
                                                                          │
readers    ◀───────────────────────────── Go service [read mode]  ◀───────┘
```

---

## No Kafka. On Purpose.

The textbook architecture puts a broker like Kafka between producers and ClickHouse. I skipped it.

- **Volume and cost.** Ingestion isn't big enough to need one, and at this company size a broker cluster would mostly sit there costing money.
- **The data isn't critical.** It's device telemetry. If some readings never make it in, I'm fine. I don't need it durable.

That trade-off is explicit: if the backend crashes, whatever's sitting in its in-memory batch is gone. Up to five seconds of telemetry. I'll take it. If the data ever matters more, durability can be bolted on later. That's a different problem with a different budget.

---

## The Schema

Look-alike, trimmed to the parts that matter:

```sql
CREATE TABLE device_health (
    eid         FixedString(23) CODEC(ZSTD),
    timestamp   DateTime        CODEC(Delta, ZSTD),
    voltage     Float32         CODEC(ZSTD),
    rssi        Int32           CODEC(ZSTD),
    -- ...a few more metrics
) ENGINE = MergeTree
PRIMARY KEY (eid, toStartOfDay(timestamp))
PARTITION BY toYear(timestamp)
```

The decisions:

- **`eid` first in the key.** Every query is "this device, this time range." Nobody ever asks "all devices on Tuesday." ClickHouse's [sparse primary index](https://clickhouse.com/docs/guides/best-practices/sparse-primary-indexes#secondary-key-columns-can-not-be-inefficient) binary-searches on the first key column, so the column every query filters on goes first. Schema follows query patterns, not the other way around.
- **`FixedString(23)` for EIDs.** They're always 23 characters. No length prefix, no variable-width nonsense.
- **Yearly partitions.** A year is a self-contained chunk I can back up, move, and restore on its own. That turned out to matter a lot for the backfill, more on that below.
- **`Delta` on the timestamp.** This one deserves its own section.

### Where the Compression Actually Comes From

ClickHouse compresses out of the box, and columnar storage + ZSTD already does most of the heavy lifting. But the sizes still weren't low enough for my liking.

Timestamps were the obvious target. Within a device, readings arrive in order, roughly 15 minutes apart. Raw, each one is a full 32-bit value. Delta-encoded, they become the same small number repeated over and over, which ZSTD compresses to almost nothing. Since rows are sorted by `eid` first, each device's timestamps sit next to each other on disk, which is exactly what makes the deltas tiny.

Delta + ZSTD on the timestamp, ZSTD everywhere else, and sensible types. Prod numbers, per yearly partition:

| Year | Before (raw files) | After (ClickHouse) |
|---|---|---|
| 2024 | 90 GB | 3.7 GB |
| 2023 | 25 GB | 780 MB |

One smaller partition went from 17 GB on disk to 300 MB. For comparison, plain `tar.gz` of the same raw files came out at 1.1 GB. A database beat gzip at its own game by almost 4x, and the result is queryable.

That last part is the real win. The storage numbers are nice. Going from "write-only" to "it's a SQL query" is the actual before and after.

### What I'd Change

The primary key rounds the timestamp down to the day with `toStartOfDay(timestamp)`. I'd drop the rounding. Swapping in `toDate` wouldn't help either; it's the same idea with a smaller return type.

The reasoning at the time came from the "order key columns from low to high cardinality" advice. Rounding to the day lowers cardinality, so it felt right. But that advice exists to help the columns *after* the low-cardinality one: rows sharing a day sit together, so whatever comes next in the key stays well clustered. The day is the last thing in my key. There's nothing after it to help. `(eid, day, metric_type)` would be a different story.

What the rounding does cost:

- **Rows within a day aren't sorted by time.** With no explicit `ORDER BY`, the primary key *is* the sort key. Rows are sorted by device and day, and within a day they sit in insertion order. That happens to be time order because readings arrive in order, but nothing guarantees it. One out-of-order backfill and Delta's tiny deltas get big and messy.
- **Queries re-sort.** Rows can't come off disk already ordered by `timestamp`, so `ORDER BY timestamp` sorts at query time.
- **The index isn't any smaller.** ClickHouse keeps one index entry per granule (8192 rows) whatever the key is. `toStartOfDay` returns a `DateTime`, the same 4 bytes as the raw timestamp. `toDate` saves 2 bytes per granule. That's nothing.

`ORDER BY (eid, timestamp)` fixes all three. Rows are guaranteed time-sorted per device, Delta always gets tiny deltas, and time-ordered reads can come straight off disk instead of being sorted per query.

To be fair, at one reading every ~15 minutes the difference is small. A device produces ~35k rows a year, roughly four granules, so index pruning lands in about the same place either way. This is about not leaning on luck, not speed.

Beyond that? One table, yearly partitions. I don't know yet what I'd change there. This is what it is for now.

---

## Backfilling Years of History

Live ingestion was the easy part. There were years of history sitting in those nested folders.

Importing into the live ClickHouse would mean hammering prod with millions of inserts and merges for days. Instead, I let the yearly partitions do the work:

1. Spin up a **separate VM** with the old data disk attached and a throwaway ClickHouse.
2. Import one year from the raw protobuf files.
3. Run `OPTIMIZE ... FINAL` so all the parts merge into their final shape.
4. Back it up:

   ```sql
   BACKUP TABLE device_health PARTITIONS '2020'
       TO Disk('backups', '2020.ch.tar.gz')
   ```

5. Move the backup over and restore that partition into the running ClickHouse:

   ```sql
   RESTORE TABLE device_health PARTITIONS '2020'
       FROM Disk('backups', '2020.ch.tar.gz')
       SETTINGS allow_non_empty_tables = true
   ```

The heavy lifting (parsing, inserting, merging) happens on a box nobody cares about. Prod only receives a finished, fully merged year. Restore is fast because it's mostly just copying files. And `tar.gz` turned out fast and light on CPU with good compression, which matters when you're shuffling years of data around.

---

## The Takeaway

The filesystem was never the problem. Asking it to be a time-series database was. Eight folders deep, no index, no way to read anything back, inodes burning on directories that hold nothing but more directories.

Most of the real work wasn't ClickHouse. It was finding the right word to search for, figuring out what my queries look like, and being honest about how much durability the data actually needs.

### Resources

- [Schema design](https://clickhouse.com/docs/en/data-modeling/schema-design)
- [Compression in ClickHouse](https://clickhouse.com/docs/en/data-compression/compression-in-clickhouse)
- [Optimizing ClickHouse with schemas and codecs](https://clickhouse.com/blog/optimize-clickhouse-codecs-compression-schema)
- [Sparse primary indexes](https://clickhouse.com/docs/guides/best-practices/sparse-primary-indexes)
- [Optimizing time series data in ClickHouse](https://medium.com/datadenys/optimizing-timeseries-data-in-clickhouse-c6518a9d6da0)
