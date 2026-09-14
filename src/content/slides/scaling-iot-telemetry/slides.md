---
theme: default
title: Scaling IoT Telemetry
subtitle: From Monolith to Columnar Storage
date: "2026-09-14"
description: Architectural journey of scaling IoT telemetry ingestion and storage by 95%+ with Go and ClickHouse.
tags:
  - Architecture
  - ClickHouse
  - Go
  - IoT
highlighter: shiki
transition: slide-left
---

# Scaling IoT Telemetry
### From Monolith to Columnar Storage

<div class="pt-12">
  <span class="text-sm opacity-75">Siddhant Kumar Upmanyu</span><br/>
  <span class="text-xs opacity-50">Senior Systems Architect</span>
</div>

<!--
Speaker notes:
- Welcome everyone.
- Today we are discussing practical architecture patterns when transitioning from high-frequency disk/relational logging to columnar time-series storage.
-->

---

# The Problem: Telemetry Firehose

- Hundreds of IoT hubs reporting heartbeat, signal metrics, and packet health every few seconds.
- Legacy architecture dumped JSON logs into nested filesystem directories.
- Led to **filesystem inode exhaustion** and ballooning disk usage.
- MongoDB document storage was not optimized for time-series range aggregations.

<!--
Speaker notes:
- Emphasize the inode problem: disk space wasn't full, but we ran out of inodes.
- Document-oriented databases add overhead for append-only time-series data.
-->

---

# The Solution Architecture

<div class="grid grid-cols-2 gap-4 pt-4">
<div>

### 1. Ingestion Microservice (Go)
- Consumes device health streams via gRPC.
- Batches records in memory.
- Flushes columnar blocks periodically.

</div>
<div>

### 2. ClickHouse Engine
- Columnar storage engine with sparse indexing.
- `Delta` + `ZSTD` compression codecs.
- Slashed telemetry footprint from 17 GB to ~300 MB (**95%+ reduction**).

</div>
</div>

<!--
Speaker notes:
- Why Go for ingest? Minimal memory footprint, high concurrent throughput, fast binary decoding.
- Why ClickHouse? Vectorized execution and incredible compression ratios for time-series metrics.
-->

---

# Code Snippet: Ingest Batching

```go
// IngestService flushes batches based on size or time window
func (s *IngestService) FlushLoop(ctx context.Context) {
    ticker := time.NewTicker(2 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case record := <-s.incoming:
            s.batch = append(s.batch, record)
            if len(s.batch) >= MaxBatchSize {
                s.flush()
            }
        case <-ticker.C:
            if len(s.batch) > 0 {
                s.flush()
            }
        case <-ctx.Done():
            return
        }
    }
}
```

<!--
Speaker notes:
- Mention how batching is critical for ClickHouse performance. ClickHouse thrives on large inserts (thousands of rows at a time), not single-row inserts.
-->

---
layout: center
class: text-center
---

# Key Takeaways

1. **Decouple ingest from the monolith** to isolate driver spikes.
2. **Batch aggressively** before writing to columnar engines.
3. **Use domain-specific compression codecs** (`Delta`, `DoubleDelta`, `T64`, `ZSTD`).

<div class="pt-8 text-sm opacity-75">
  Questions & Discussion
</div>

<!--
Speaker notes:
- Wrap up and open the floor for questions.
-->
