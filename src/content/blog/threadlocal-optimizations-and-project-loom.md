---
title: "ThreadLocal Optimizations and Project Loom"
description: "An optimization journey from identifying high-allocation hot paths with Async Profiler to leveraging ThreadLocal, and why Project Loom is forcing us to rethink these classic patterns."
date: "Mar 29, 2026"
tag: "JVM"
---

This is going to be one of those optimization episodes where simple tricks can yield massive performance gains.

A few years ago, I found myself deep in the weeds of a performance bottleneck. To find the culprit, I had to look at profilers. In the Java ecosystem, you've got two heavy hitters: **Java Flight Recorder (JFR)** and **Async Profiler**.

JFR is the "official" choice, built right into the OpenJDK. Then there’s Async Profiler, written by Andrei Pangin. If you check out the Async Profiler GitHub, you'll see a long list of why it’s often the better choice—handling safepoint bias, capturing native stack frames, and more.

In my case, I used Async Profiler extensively to figure out the patterns. It's not that JFR isn't good—it actually gives you *more* data—but I’ve seen it take 100% CPU just by attaching it. When that happens, it deoptimizes methods, which completely messes with the performance you're trying to measure in the first place.

## Choosing the Right View

Async Profiler has multiple modes (CPU, wall-clock, allocation), but the best part is it can generate `.jfr` files. This means you can use any JFR viewer to read the data. 

You’ve got Java Mission Control (JMC), VisualVM, and the IntelliJ IDEA profiler. Personally, I mostly use the IntelliJ one. It's great at highlighting where code is spending time and where allocations are happening. If I need a truly deep dive, I'll open JMC or VisualVM, though I’ll be honest: **I still don’t really understand their UIs. :(**

## The Hunt for the Hot Path

Our physical devices send a *ton* of data, and all of it is encrypted. Naturally, encryption and decryption became the "hot path" I needed to optimize.

I spent days reading flame graphs. While database queries were there, they weren't the bottleneck. Every single packet has to go through the encrypt/decrypt flow, and in our case, the code was creating brand-new encryptor and decryptor instances for every single packet. This was creating a mountain of objects.

In garbage-collected languages, too many allocations mean the memory fills up quickly, triggering GC more often. When GC runs, it steals your CPU. Those random CPU spikes you see? Often, it's just the collector trying to keep up with too many objects. If we could reduce those allocations, we'd be in the clear.

## The Solution: "ThreadLocal"

But how do you reduce allocations for these components? 

If you use a single encryptor or decryptor, they’re not thread-safe. If multiple threads hit them at once, you’ll get corrupted data or a crash. You could use a lock, but that’s a scalability nightmare. It would be a huge bottleneck.

A better way is **Object Pooling**—letting a client "borrow" an instance and return it when done. This is something Go does extensively, even for strings. There are good libraries out there that do this, but the problem is the cost of locking. Borrowing and returning have to be atomic, which introduces its own overhead.

So, I looked at **ThreadLocal**. The concept is simple: it allows you to store data that is accessible only by a specific thread. It’s like a static variable, but instead of being shared globally, each thread gets its own completely independent copy of the object.

Since the encryptor and decryptor were already encapsulated within wrappers, I didn't have to "let loose" the raw instances to the client. This gave me the freedom to change how they were managed internally without affecting the rest of the code. My primary concern was avoiding the locking overhead of an atomic pool at the point.

For this case, ThreadLocal was the perfect fit. No locking, no constant allocations, and almost no code changes. Scaling was built-in: if I increased the thread count, my instances increased; if I reduced them, they scaled down.

The next time I profiled, that hot stack frame for allocations had basically vanished. It felt great.

## The Loom Challenge

Now, for the "demerits." 

Why doesn't Go have ThreadLocals? Well, because there are no threads. **lol.** 

But seriously, the problem is that multiple coroutines can use the same thread, or a single coroutine can hop between multiple threads. You don't know when or where it’s going to be scheduled, so a ThreadLocal could leave your encryptor in an invalid state for the next task.

This brings us to Java and **Project Loom**. 

Most JVM frameworks use `ThreadLocal` to store and retrieve contextual data anywhere in the code. It’s a convenient way to pass state without threading it through every single method signature. But with the introduction of Virtual Threads, the old `ThreadLocal` pattern is effectively broken for these scenarios. You can't just create a `ThreadLocal` for a million virtual threads—you'd run out of memory instantly.

To solve this specific data-sharing problem, Java is introducing a new concept called **Scoped Values**. They’re designed for Virtual Threads, providing a way to share data within a scope without the massive memory overhead of `ThreadLocal`.

However, Scoped Values don't solve the "reusable resource" problem. If you're using Virtual Threads and you need to share a limited resource like our encryptor, you're back to Object Pooling. Even with the cost of making those operations atomic, there really isn't a better alternative when you're dealing with virtual threads or goroutines.

## Wrapping Up

Optimization is a journey. Sometimes the "old" way (ThreadLocal) is exactly what you need for a specific architecture, and sometimes the "new" way (Virtual Threads) forces you to rethink everything.

*Where are the graphs? I did all this about two years ago, and unfortunately, the original flame graphs were lost during a PC migration. But the lesson—and the performance boost—stuck with me.*

## Links
- [Async Profiler GitHub](https://github.com/async-profiler/async-profiler)
- [JFR CPU Overhead Discussion](https://stackoverflow.com/questions/78188660/java-flight-recorderjfr-consumes-100-cpu-when-its-supposed-to-have-only-1-2)

---

*Originally published on [eglu.tech](https://eglu.tech/blog/threadlocal-optimizations-and-project-loom).*
