---
title: "Observability in Stopgap 4.1: One SDK, Four Signals"
description: "Traces, logs, metrics and profiles in a Helidon app, all through one OpenTelemetry SDK. What each signal buys you, and every place it fought back."
date: "Oct 24, 2026"
tags: ["Kotlin", "Helidon", "OpenTelemetry", "Observability", "JVM"]
---

Nothing builds or discovers an SDK on its own.

That's the one rule behind the observability in [Stopgap 4.1](https://github.com/sku0x20/stopgap/releases/tag/v4.1.0), my compile-time Kotlin toolkit for HTTP services on Helidon. The library diff in this release is small. The real work is in the example app, which now ships traces, logs, metrics and profiles, all through a single OpenTelemetry SDK that every layer gets handed in code I can read. No library spins up its own exporter because it found a config node, and no telemetry shows up that I didn't ask for.

I wanted to actually understand observability, not paste a Spring starter and watch dashboards light up. A framework's example app is the best place to try it: it's the code people copy.

One thing I didn't expect: how slow the industry is. OpenTelemetry delivered traces, then metrics, then logs. The Profiling SIG was formed at KubeCon Europe 2022. Profiles [entered public alpha](https://opentelemetry.io/blog/2026/profiles-alpha/) in March 2026. Four years, and still alpha.

---

## Who Owns the SDK

The OpenTelemetry Java agent always runs its own SDK, and it [can't adopt one the app builds](https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/docs/misc/interop-design/interop-design.md). So the agent owns the one SDK, and I cut it down to a single job: turning `@WithSpan` into spans. It rewrites the method's own bytecode, so self-invocation and Kotlin's final classes get traced, which proxy-based AOP misses. Every other instrumentation is off.

Everything else gets that SDK from `main`:

```
                         single OTel SDK (agent's)
        ▲               ▲              ▲              ▲               ▲
  Helidon tracing   @WithSpan     JDBC library   Logback appender   Pyroscope
  + metrics         (agent)       (store only)   (every record)     (extension)
```

---

## Traces: One Request, One Story

One trace per request, from the server span through my annotated business methods down to each SQL statement and outbound HTTP call. 10% of new traces are kept; a request that arrives with a `traceparent` follows its caller's decision, so a trace never gets kept in one service and dropped in the next.

### The client span that never becomes current

Helidon's `WebClientTracing` creates a client span for every outbound call. It keeps that span in Helidon's own context and never makes it current in OpenTelemetry's. The Logback appender reads OpenTelemetry's.

So every log line written during an outbound call carried the *server* span's id. Click "logs for this span" on the client span and you get nothing. Only the trace id matched.

The workaround from [helidon#8861](https://github.com/helidon-io/helidon/issues/8861): rebuild the span from its ids and make it current myself.

```kotlin
val clientSpan = request.context().get(HelidonSpanContext::class.java)
if (clientSpan.isEmpty) {
    return Scope.noop()
}
val parent = Span.current().spanContext
val spanContext = SpanContext.create(
    clientSpan.get().traceId(),
    clientSpan.get().spanId(),
    parent.traceFlags,
    parent.traceState
)
return Span.wrap(spanContext).makeCurrent()
```

Helidon's `SpanContext` only exposes ids, so flags and state come from the server span. Same trace, same sampling decision.

### Discovery adds a second tracer

Helidon's WebClient discovers client services from the classpath by default. With tracing on the classpath, discovery quietly added a *second* `WebClientTracing`, built on `Tracer.global()` instead of my tracer. Discovery is off on every client now, including the test client in `helidon-test`.

---

## Logs: Every Line Knows Its Trace

Open a span, see exactly the log lines written inside it. Every record goes through the same SDK via the OpenTelemetry Logback appender, stamped with the active trace and span.

### The access log that ran too late

Helidon's access log has a default weight of 1000. Tracing sits at 900. Higher weight wraps lower: the access log sees the request first and finishes last, after tracing has already closed the span. No trace id on the one log line you look at most.

```yaml
features:
  access-log:
    weight: 875
```

Below tracing (900), so the line lands inside the span. Still above CORS (850) and security (800), so their rejections still get logged.

---

## Metrics: A Spike That Points to a Trace

Request durations per route, outbound call durations, the connection pool, the JVM, and business counters, all under OpenTelemetry's semantic-convention names. And the part I care about most: **exemplars**. When a value is recorded while a sampled span is current, the SDK keeps that trace id on the histogram bucket. A spike on a latency chart is now a link to a request that caused it.

No scrape endpoint. Metrics leave over OTLP only.

### Milliseconds in a seconds histogram

Helidon 4.x's default HTTP metrics record milliseconds into a histogram declared in seconds ([helidon#12097](https://github.com/helidon-io/helidon/issues/12097)). Your one-second request is now a 1000-second request. The fix is an opt-in flag that is off by default:

```yaml
metrics:
  auto-http-metrics:
    use-updated-http-metrics: true
```

The e2e test checks that a `/delay/1` call averages between 1 and 5 seconds, so the unit can't silently regress.

### The registry that doesn't take parameters

Helidon's tracing takes the SDK as a parameter. Its metrics modules don't: they look it up in Helidon's own service registry. Left alone, that lookup picks its own instance. So `main` binds mine first:

```kotlin
Services.set(OpenTelemetry::class.java, openTelemetry)
Metrics.globalRegistry.add(OpenTelemetryMeterRegistry.builder(openTelemetry).build())
```

Order matters twice here:

- **`Services.set` before anything Helidon.** The first lookup fixes the instance and a later `set` throws. At least it fails loudly at startup instead of recording into another SDK.
- **The Micrometer bridge before any meter.** Helidon's own meters are Micrometer meters, and a registry added later misses their earlier recordings.

The metrics modules also require a `telemetry` config node for their scope name. Setting `enabled: false` on it stops them from building their own SDK. It also changes what Helidon's registry serves to code that never went through `Services.set`, like integration tests, where `Tracer.global()` then throws. Which is the other reason discovery is off in the test client.

---

## Profiles: The Slow Span, Down to the Line

This is the one I wanted most: a slow span leads to the code that was running during it. A flame graph per request, not per guess.

OpenTelemetry can't do this from inside the JVM yet. The only thing exporting OTLP profiles is the out-of-process eBPF profiler, which is alpha, needs root and Linux, and has no idea what a span is. So I went with [Pyroscope's extension](https://github.com/grafana/otel-profiling-java) to the OTel agent. It loads into the same agent, adds a span processor to the same SDK, and tags each root span with a `pyroscope.profile.id`. Still one agent, still one SDK.

Under the hood it's async-profiler, not JFR's sampler. JFR's execution sampler takes a few running threads per tick, stops at the Java boundary, and can't label samples. async-profiler records mixed Java and native stacks for every thread and keeps a per-thread context id, which is how a sample learns which span it belongs to.

### Not on Maven Central

The extension jar ships on GitHub releases. Maven Central has `io.pyroscope:otel`, which is the span processor without the profiler. So Gradle gets an Ivy repository pointed at GitHub, locked to that one module:

```kotlin
exclusiveContent {
    forRepository {
        ivy {
            url = uri("https://github.com/grafana/otel-profiling-java/releases/download")
            patternLayout { artifact("v[revision]/[artifact].[ext]") }
            metadataSources { artifact() }
        }
    }
    filter { includeModule("grafana", "pyroscope-otel-javaagent-extension") }
}
```

`metadataSources { artifact() }` tells Gradle there's no POM to look for; the jar is the module. `exclusiveContent` makes sure nothing else ever resolves from GitHub, and that this module never resolves from anywhere else.

My first version gave the extension its own Gradle configuration. Which means the next extension gets another one, and the one after that another. Now there's one configuration for the agent and one for its extensions; they land in a single directory, and `otel.javaagent.extensions` points at the directory. Another extension is just another dependency line.

### The profiler that names itself `javaspy`

The profiler never reads `otel.properties`. It reads its own file, the environment, and system properties. Its default application name is a random `javaspy.*`. Grafana finds a span's profile by service name. So out of the box, profiles upload fine, show up fine, and never link to a single span. Silently. `pyroscope.application.name` has to match `otel.service.name` by hand.

### `itimer` in a container

async-profiler's `cpu` event needs `perf_events`, which Docker's seccomp profile blocks. Pyroscope's default is `itimer`, and I shipped it like that at first. `itimer` is one timer for the whole process: at most one sample per tick, however many threads are busy. Under load, it undersamples exactly when you need it.

`ctimer` is a CPU-time timer per thread. It needs no permissions; the price is no kernel frames. Allocation (one sample per 512 KiB) and lock waits (10 ms or more) ride along in the same upload.

### JFR, for the events

A rolling JFR recording keeps the last ten minutes, dumped with `jcmd` when something looks off. Not for its samples: for its events. GC pauses, safepoints, socket I/O, and `jdk.VirtualThreadPinned`. Since JDK 24, `synchronized` no longer pins a virtual thread, but native frames still do, and pinning starves Helidon's carrier threads under load without ever showing up in a flame graph.

---

## When It Dies Anyway

Every out-of-memory error should leave a heap dump, a crash log, and the JFR recording behind. My first attempt left one of the three.

### Exit loses the evidence

I started with `ExitOnOutOfMemoryError`. It sounds right: dump the heap, exit, let the container restart. Then I actually ran an OOM. The heap dump was there. The JFR recording wasn't, because it exits without running shutdown hooks, and there was no `hs_err` log either. `CrashOnOutOfMemoryError` keeps all three, and the container still restarts.

### Everyone is PID 1

The JVM names its dumps after the PID. In a container, java is always PID 1. First crash writes `java_pid1.hprof`. Second crash on the same volume: the file exists, so the heap dump is **skipped**. The one you actually want, the latest, is the one you don't get.

So the image now starts through a tiny script that makes one folder per start:

```sh
dir=/diagnostics/$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$dir"
exec java \
    "-XX:StartFlightRecording=name=continuous,settings=default,maxage=10m,dumponexit=true,filename=$dir/" \
    "-XX:FlightRecorderOptions=dumppath=$dir" \
    -XX:+HeapDumpOnOutOfMemoryError \
    "-XX:HeapDumpPath=$dir" \
    -XX:+CrashOnOutOfMemoryError \
    "-XX:ErrorFile=$dir/hs_err.log" \
    "$@"
```

`exec` matters: java stays PID 1, so it gets the container's `SIGTERM` and dumps the JFR recording on a normal stop. What none of this survives is `SIGKILL`. The kernel's OOM kill at the container's memory limit ends the JVM before it can write a byte, and that's a different out-of-memory than the heap's.

---

## Which Commit Was That?

Every span, log record and metric names the commit and environment it came from. "Did the deploy cause this" becomes a label filter.

### The env var that replaces instead of merging

The obvious move is `otel.resource.attributes=service.version=...` in the properties file, and `deployment.environment.name` from each deployment's `OTEL_RESOURCE_ATTRIBUTES`. Except the env var *replaces* the property instead of merging with it. Set the environment, lose the version.

So the version lives somewhere else entirely: the jar manifest. The Gradle plugin writes the git SHA as `Implementation-Version`, and the agent's manifest resource provider reads it as `service.version`.

### The build with no git

The image build runs Gradle inside Docker, where there's no git. The host passes the SHA in as a build arg. But anyone using the Gradle plugin without that arg, or without a repo, or before their first commit, would have had a failing `jar` task. Caught before it ever shipped.

`providers.exec` with `isIgnoreExitValue` handles git failing. It doesn't handle git *missing*: the process never starts, and that throws before the exit code exists. The plugin now reads the SHA through a `ValueSource`, which can catch it and fall back to `unknown`. It also stays configuration-cache safe: Gradle re-runs it every build, so a new commit gets a new SHA without throwing the cache away.

The image now gets tagged with the SHA too, next to `latest`. Same commit as `service.version`, so a trace names the exact image it ran in.

---

## The Bill

- **Startup**: with the agent, the app starts in about 1265 ms in the image. The Pyroscope extension adds ~190 ms, the JFR recording ~35 ms. Call it **~1.5 s** all in.
- **Settings in three places**: the agent reads `otel.properties`, the profiler reads `pyroscope.properties`, and the JDBC library reads only system properties, so its options go on the command line.
- **Alpha everywhere**: the JDBC, HikariCP, Micrometer bridge and runtime-telemetry libraries, plus the Logback appender, are all `-alpha`.
- **Two protocols out**: profiles leave over Pyroscope's protocol, not OTLP.
- **Root spans only**: samples are tagged with the server span, so a child span's own profile can't be told apart.

---

## What Else Is in 4.1

For people using the libraries, not the example:

- **gradle-plugin**: the jar's `Implementation-Version` is the git SHA, the image is also tagged `:<sha>`, and both fall back to `unknown` without git.
- **helidon-extensions**: `MapSerdeCatalog` matches on type/subtype only, so `application/json; charset=utf-8` no longer gets a 415.
- **helidon-test**: the test WebClient skips service discovery, env files allow `=` in values and blank lines, and `E2E_KEEP_ALIVE=true` keeps the e2e containers running after the suite so you can poke at them.

---

## The Takeaway

The signals weren't the hard part. Every library ships with an opinion about who owns telemetry, and most of the work was saying no: no second SDK, no auto-discovered tracer, no instrumentation I didn't ask for. What's left is one SDK, wired in `main`, and a design doc that explains every line of it.

And profiles, four years on, still route around OTLP. Fine. The rest of the stack doesn't have to wait.

### Resources

- [RFC-0002: Observability](https://github.com/sku0x20/stopgap/blob/main/docs/proposals/0002-observability.md), the full design with every trade-off
- [OpenTelemetry Profiles enters public alpha](https://opentelemetry.io/blog/2026/profiles-alpha/)
- [OpenTelemetry announces support for profiling (2024)](https://opentelemetry.io/blog/2024/profiling/)
- [Pyroscope's OTel agent extension](https://github.com/grafana/otel-profiling-java)
- [OTel agent and app SDK interop](https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/docs/misc/interop-design/interop-design.md)
