---
title: "Which Request Burned the CPU? Span-Tagged Profiles on Virtual Threads"
description: "Trace-linked profiling works great until a virtual thread changes carriers. What span-tagged samples actually buy you on a slow p99, how virtual threads quietly break them, and how Go got it right."
date: "Oct 24, 2026"
tags: ["JVM", "Profiling", "Virtual Threads", "OpenTelemetry", "Observability"]
---

Trace-linked profiling makes a nice promise: click a slow span, see the code that burned its CPU. I set it up for [Stopgap 4.1](/blog/observability-in-stopgap-4-1-one-sdk-four-signals), and it works. On platform threads. On virtual threads, samples can quietly land on the wrong request, and nothing tells you.

This is the path I took to understand it, from the basics: why you need span-tagged samples to find a slow outlier at all, what a debugging session looks like when it works, how virtual threads break it, and how Go avoids the problem.

---

## How Trace-Linked Profiling Works

A continuous profiler doesn't record every function call. Every 10ms or so, a timer fires on a busy thread, the profiler grabs that thread's stack and writes it down. That's one **sample**. Pile up thousands and you get a flame graph: the wider a frame, the more CPU it used.

To link profiles to traces, each sample also has to say *which request* it came from. Pyroscope's OpenTelemetry extension does it like this:

1. A request comes in and its root span starts.
2. The extension's span processor sees the span start and calls into the profiler, which writes the span id into a thread-local slot of the current OS thread.
3. When the profiler samples that thread, it reads the slot and tags the sample with the span id.
4. When the span ends, the span processor calls the profiler again to clear the slot.

So the profiler owns the slot: it creates it and reads it. Pyroscope's span processor only writes to it, once when the span starts and once when it ends. In between, the sampler fires every 10ms or so and picks up whatever is sitting there. Write once, read many times: the span processor never talks to the sampler directly, it just leaves the tag in place for the next tick.

The slot is native thread-local storage, not a Java `ThreadLocal`. The sampler runs inside a signal handler, which can interrupt the thread anywhere, even mid-GC, so it can't safely read Java objects. A native slot is plain memory it can read on the spot. That difference matters later.

In Grafana you click a slow span and say "show me only the samples with this span's id". That's the whole trick.

On a plain platform thread, where one request owns one thread from start to finish, this is correct. The thread running the code is the thread holding the tag.

---

## One Sample Means Nothing

At one sample per 10ms of CPU, a request that burns 30ms of CPU gets about 3 samples. You can't read a flame graph off 3 samples. It's noise.

Profiles only make sense in aggregate, and there are two ways to aggregate:

- **By time**: every sample for the service between 14:00 and 14:05.
- **By span**: every sample tagged with a chosen set of span ids, say the 200 slowest requests of the last hour.

The second one is the entire reason trace-linked profiling is worth the trouble. Keep that in mind, it comes back later.

---

## Debugging a Slow p99, Best Case

Say `GET /notes` has a p50 of 20ms and a p99 of 900ms, and I already know the extra time is CPU. The cause, which I don't know yet: one note has a few megabytes of text in its body, and every request that returns it spends most of its time serializing that text.

The metrics show those requests as slow. That's all they show. What took the time, CPU-wise, isn't in them.

The service-wide flame graph doesn't help either. Every request serializes JSON, so serialization is a wide frame on any normal day. 99% of the samples come from fast requests, and nothing in the aggregate says which samples came from the slow 1%. The outlier is diluted into the average.

So the idea is to stick together only the samples from the requests that were slow. To find those samples, each one needs a label saying which request it came from. That label is the root span id.

Best case: platform threads, no executor hops. Here's how the signals hand off.

**1. Metric to exemplar.** The latency histogram carries exemplars: real trace ids attached to its buckets. The p99 spike has dots on it, and each dot is one actual slow request. Click one.

**2. Exemplar to trace.** The trace shows something like:

```
HTTP Request        900ms
 ├─ SELECT notes      8ms
 └─ write response    3ms
```

The child spans add up to about 11ms. So roughly 890ms went into my own code, not the database. Spans tell me *which request* and *which gap*. They can't tell me which function; that's the profiler's job.

**3. Trace to span profile.** Pull only the samples tagged with this span's id.

Sanity check first: samples × 10ms ≈ CPU time. Around 87 samples means around 870ms of CPU, so the request really was CPU-bound. If there are 3, it was mostly *waiting* (a lock, the database, a GC pause), and a CPU profile is the wrong tool; that's a job for child spans, lock profiles or JFR events. This post sticks to the CPU case.

With 87 samples the shape is readable:

```
NoteHandler.list          ████████████████████  95%
 └─ JSON serialize        ███████████████████   90%
     └─ writeString       ██████████████████    85%
```

Serialization. Same frame as in the aggregate, but here it's 90% of the request instead of a normal slice. That's the note with megabytes of text in its body, and now it's visible.

**4. When one request is too thin: merge and diff.** A different case: if each slow request burns only 40ms extra, that's about 4 samples each. Too few. So:

- **Merge**: query all server spans over 500ms, take their span ids, merge their profiles. 200 spans × 4 samples is 800 samples. Plenty.
- **Diff**: compare that against the merged profile of *fast* spans. Whatever both share (routing, auth, logging) cancels out. Whatever is much wider in the slow set is the culprit.

That's how you beat the dilution: you *choose* the samples by span instead of by time.

### Why the label has to be the span id

Why not a simpler label, like the endpoint? I could tag every sample with `endpoint=/notes`. But that still mixes the fast and slow `/notes` calls, so the big note stays diluted, just in a smaller pool.

Slowness is only known on the trace side. The span has the duration. A sample only has a stack; it has no idea whether its request turned out slow. The span id is what joins the two: ask the traces which requests were slow, then ask the profiles for those requests' samples.

### Why only the root span?

A question I had at this point: a request has child spans too, the JDBC queries and the `@WithSpan` methods. Shouldn't the span processor write their ids into the slot as well?

It can. The extension has a setting for it, off by default, and a child's id simply replaces the root's. Worse, a span's end clears the slot instead of putting the parent's id back:

```
root starts       slot = root
  child starts    slot = child
  child ends      slot = empty   ← root's id is gone
root continues    slot = empty   ← rest of the request is untagged
```

Even with the parent restored, the request's samples end up split across a dozen span ids, and seeing the whole request again means collecting them all and merging.

So carry both: the root id *and* the current span id. That fixes the fragmentation. Query by root and you get the whole request, same as today. Query by the current span and you get one part of it, and you can merge every `serializeNotes` span across the slow requests without digging through stacks. That helps when a span is a unit of work rather than one method: a batch item, a block of code spread over several methods, or one method called from two places where only one matters.

It costs more than it looks:

- **Two writes per span.** Today a request costs two writes: one to set the root's id, one to clear it. Tag every span and each adds its own pair, one to set its id and one to restore the parent's. The writes grow with the span count: a request with 20 queries goes from 2 writes to 42. Mostly not worth it for what it adds, though for span-heavy work where the splits matter it can be a good trade.
- **Child spans are short.** An 8ms query gets zero or one sample at a 10ms interval. The extra label only pays off merged by span name across many requests.
- **The stack trace mostly says it already.** The flame graph shows which method ran, which is most of what a child span id adds.

On platform threads with mostly synchronous work, carrying both is a fair upgrade if span-level splits matter to you. Otherwise a whole request is the smallest unit with enough samples to read, and one label per request is the right size. On virtual threads, more labels is worse: many more writes, each landing on whatever carrier is underneath at that moment. That matters in the next section.

---

## Now Add Virtual Threads

Everything above assumed one request owns one thread. Helidon doesn't work that way: it runs every request on a virtual thread.

A virtual thread doesn't own an OS thread. It gets *mounted* on a **carrier**, a real OS thread, while it runs. When it blocks, say on a database call, it unmounts, and later resumes on whichever carrier is free. There are about as many carriers as CPU cores, shared by thousands of virtual threads.

Two different "contexts" are involved, and they live in different places:

- **The OpenTelemetry context** is a Java `ThreadLocal`. It belongs to the virtual thread and moves with it. Traces and logs stay correct.
- **The profiler's slot** is native, per OS thread. It belongs to the **carrier** and stays put.

And the profiler's timer fires on the carrier. So every sample reads the *carrier's* slot, no matter which virtual thread happens to be sitting on it.

### Missing samples or wrong samples?

Both.

Here's a made-up but realistic timeline. Two carriers, C1 and C2. Two requests: X (slow: a query, then 870ms of serialization) and Y (fast: a query, then 10ms of work).

| Step | What happens | C1 slot | C2 slot |
|---|---|---|---|
| 1 | X starts on C1 and tags it | X | |
| 2 | X runs its query and unmounts | X (stale) | |
| 3 | Y starts on C2 and tags it | X | Y |
| 4 | Y runs its query and unmounts | X | Y (stale) |
| 5 | Y resumes on **C1**, does its 10ms of work | X | Y |
| 6 | X resumes on **C2**, serializes for 870ms | X | Y |
| 7 | Y ends on C1, clears C1 | | Y |
| 8 | X keeps serializing on C2, still tagged Y | | Y |
| 9 | X ends on C2, clears C2 | | |

Now the span profiles:

- **X (900ms span)**: about 1 sample, and it's Y's code. X's own 87 samples are **missing**.
- **Y (20ms span)**: about 87 samples of serialization it never ran. **Wrong** samples.

Nothing is lost overall. The service-wide flame graph still has every sample. Only the tags are wrong.

Which failure you get depends on load:

- **Low concurrency**: X lands on an idle carrier with an empty or stale slot. Its samples are mostly **missing**.
- **High concurrency**: every carrier holds some live request's tag, so samples go to whoever tagged that carrier last. Mostly **wrong**.

### The part you care about gets hit hardest

A typical handler goes: read from the database, compute, respond. The database read is what unmounts the virtual thread. So the compute step, the exact thing you're hunting in a CPU-bound p99, is the step most likely to run on a different carrier. Code before the first I/O call is tagged right. Everything after is up for grabs.

### What it does to the walkthrough

- **Step 3**: the sanity check lies. X looks off-CPU, so I go looking for database waits that aren't there. Y looks CPU-bound.
- **Step 4**: the slow set picks up fast requests' samples, the fast set picks up slow ones, and the diff flattens toward nothing.

Under enough concurrency, a span's tag is close to a random pick among whatever was in flight. The span view quietly turns back into the time-window aggregate, the very dilution I was trying to escape. It just *looks* precise.

That's the part that bugs me. A missing feature is fine. A feature that silently gives you a confident wrong answer is worse.

### A cheap tell

On a single thread, a span can't use more CPU than its own duration. If samples × interval is bigger than the span's duration (Y: 870ms of CPU inside a 20ms span), the tags are wrong.

---

## It's an M:N Problem

Once I saw it, it stopped being about virtual threads. It hits anything that runs M user-space tasks on N OS threads: virtual threads, coroutines, async runtimes. A profiler that only sees OS threads can't tell which task was running.

So does every method need to carry the span id? No. The span id already travels with the virtual thread, inside the OpenTelemetry context. The data is right there. The profiler just reads it from the wrong place. There are two real fixes.

**1. Swap the tag on every switch.** When a virtual thread mounts, copy its span id into the carrier's slot. When it unmounts, clear it. The sampler stays the same. Catch: the JVM doesn't give normal Java code a mount callback, so a profiler has to hook JVM internals. It also adds a little work to every park and resume, and those happen constantly.

**2. Read the task at sample time.** When the timer fires, find which virtual thread is mounted and read *its* context. Zero cost on the switch path. But it's hard to do from a signal handler, where you're reading Java objects the garbage collector might be moving. It really wants a profiler built into the runtime.

### Kotlin coroutines prove fix 1 works

Coroutines are a library, so the switch point is out in the open. A [`ThreadContextElement`](https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-core/kotlinx.coroutines/-thread-context-element/) gets a callback every time a coroutine resumes on a thread and every time it suspends. OpenTelemetry already uses it to keep its own context right across coroutines. Same idea for the profiler's tag:

```kotlin
// Sketch: tag the thread on resume, clear it on suspend.
class ProfilerTag(private val spanId: Long) : ThreadContextElement<Unit> {
    companion object Key : CoroutineContext.Key<ProfilerTag>
    override val key = Key
    override fun updateThreadContext(context: CoroutineContext) = profiler.tag(spanId)
    override fun restoreThreadContext(context: CoroutineContext, oldState: Unit) = profiler.clear()
}
```

So coroutines *could* solve it, but nothing does it for you yet, as far as I know. OpenTelemetry's coroutine support only carries its own context, and the profiler doesn't ship an element like this one. For now you'd write it yourself.

That's fix 1 in user space. Virtual threads need the exact same hook. The JDK keeps it internal.

### Go: the runtime owns both sides

In Go, the profiler is part of the runtime, so labels live on the **goroutine**, not the OS thread:

```go
pprof.Do(ctx, pprof.Labels("span_id", spanID), func(ctx context.Context) {
    handle(ctx)
})
```

When the CPU profiler's signal fires, it reads the labels of whichever goroutine is running right then. A goroutine can move between OS threads; its labels come along. No hooks, no swapping. That's fix 2, and it's cheap because the scheduler and the profiler are the same runtime. New goroutines inherit their parent's labels too.

Go has limits of its own:

- Labels show up in CPU and goroutine profiles, not heap profiles. Why is in the side note at the end.
- Hand work to an existing worker goroutine over a channel and the labels are gone, because they're only inherited when a goroutine is created. Same problem as handing work to a thread pool on the JVM.

pprof supports tagging out of the box, and it gets M:N right because one runtime owns both the scheduler and the profiler. On the JVM, profilers sit outside the scheduler and need a hook the JDK doesn't expose.

---

## The Takeaway

- **A profile is statistics.** One sample means nothing. The value is in choosing *which* samples to add up.
- **Trace-linked profiling** chooses samples by request instead of by time. That's what gets you past a diluted p99.
- **Check CPU against duration.** Too few samples: waiting, or on virtual threads, mistagged. More CPU than the span lasted: the tags are wrong.
- **Two contexts aren't one context.** OpenTelemetry's follows your code. The profiler's follows the OS thread. On virtual threads, they part ways.
- **It fails silently.** Flame graphs stay right; only the per-span view goes wrong, and it still looks precise.
- **It's an M:N problem.** Whoever owns the scheduler can fix it cheaply. Go does. Kotlin coroutines expose the hook. The JVM, not yet.

Let's see how the ecosystem responds. My guess is that a mount and unmount hook from the JDK is the first viable fix, and the fastest: profilers already know how to swap a tag, they just need to be told when.

## Side Note: Not Every Profile Samples by Time

This post is about CPU profiles, but allocation and lock profiles sample differently. It also explains why Go's heap profile has no labels.

- **CPU: by time.** A timer fires about every 10ms of CPU time and records the running stack. A sample means "about 10ms of CPU spent here".
- **Allocations: by bytes.** No timer. The allocation path counts bytes down, and when the count hits zero, that allocation's stack gets recorded and a new count starts. A sample means "about 512 KiB allocated here", a common default.
- **Locks: by wait length.** Recorded when a thread waits on a lock longer than a threshold, say 10ms, with the waiting thread's stack. A sample means "a thread waited here".

On the JVM, each of these is an event recorded at the moment it happens, and nothing is tracked after it. So nothing stops an allocation or lock sample from carrying the slot's tag, same as a CPU sample, virtual-thread problem included.

### Why Go's heap profile can't carry labels

Go's CPU profile is a stream the runtime forgets once it's read. The heap profile is a table kept for the whole run, so frees can be subtracted later. A label unique per request, like a span id, would make that table grow forever. The details are in [issue 23458](https://github.com/golang/go/issues/23458), which covers labels for every profile that works this way: heap, block and mutex.

Trivia: this post started with a comment on my last one, asking whether the profiler's context survives a virtual thread changing carriers, and whether samples go missing or to the wrong request.

### Resources

- [Observability in Stopgap 4.1](/blog/observability-in-stopgap-4-1-one-sdk-four-signals), the setup this post is about
- [RFC-0002: Observability](https://github.com/sku0x20/stopgap/blob/main/docs/proposals/0002-observability.md)
- [Pyroscope's OTel agent extension](https://github.com/grafana/otel-profiling-java)
- [Go `runtime/pprof` labels](https://pkg.go.dev/runtime/pprof#Do)
- [Kotlin `ThreadContextElement`](https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-core/kotlinx.coroutines/-thread-context-element/)
