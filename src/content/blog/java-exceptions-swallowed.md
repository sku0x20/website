---
title: "Java Exceptions Swallowed: The ThreadPool Trap"
description: "Debugging silent failures in asynchronous Java code and understanding why ThreadPools might be swallowing your exceptions."
date: "Mar 22, 2026"
tags: ["JVM", "Java", "Kotlin"]
---

The other day, while debugging a production issue, I hit a frustrating wall: there were no error logs. I searched everywhere—Loki, `stderr`, `stdout`, container logs—but found nothing. Since the application was running in production, I couldn't simply attach a debugger. I had to rely on static analysis.

I traced every code path, yet I couldn't find a single clue as to why the system was failing or where it might be crashing.

## The Local Reproduction Struggle

I tried to recreate the issue locally to use a debugger, but the failure wouldn't trigger. However, I did notice a peculiar side effect: IntelliJ's "Step Over" feature would occasionally get stuck at the end of a `Runnable`. While seemingly unrelated to the main issue, it added another layer of complexity to the investigation.

Eventually, I decided to increase log verbosity. I added targeted logging—using a custom function to filter by device ID to minimize noise—and redeployed the code.

This classic "printf debugging" finally revealed the culprit. The code was attempting to query a non-existent row because the query data had become corrupted.

## The Mystery of the Missing Logs

This discovery raised a more intriguing question: if a database query was failing, why wasn't it being logged? Why was Java seemingly "consuming" these exceptions?

The answer lay in the asynchronous nature of the code. This specific logic was running in a dedicated `ThreadPool`.

When a `ThreadPool` encounters an unhandled exception, it follows a specific lookup chain:
1. It checks for an `UncaughtExceptionHandler` in its `ThreadFactory`.
2. If not found, it falls back to the global `UncaughtExceptionHandler`.
3. By default, this is often a `NOOP`.

I initially thought I had an easy fix: I added a global exception handler. But during subsequent testing, the logs remained silent.

## The Future Trap

At this point, I considered simply wrapping the `Runnable` in a `try-catch` block and moving on. However, I wanted to understand why the "industry standard" behavior was so unintuitive.

Down the rabbit hole I went.

After some research, I realized that my intuition about the `try-catch` block was actually the most robust solution. When you `submit()` or `schedule()` tasks to a `ThreadPoolExecutor`, it returns a `Future`. This `Future` captures any unhandled exceptions that occur during execution.

The catch? Those exceptions are only thrown back to you when you call `Future.get()`. Since I was firing off tasks and ignoring the `Future` objects, the exceptions were being captured and held silently, never reaching the logs.

## The Solution: A Logging Wrapper and Delegate Pattern

Certain design decisions in the Java ecosystem—specifically the push towards `Future`-based APIs—can lead to these "silent failure" traps. While you can use `execute()` on a standard `ThreadPoolExecutor` to avoid `Future` creation, `ScheduledThreadPoolExecutor` always returns a `ScheduledFuture`, even if you don't need it.

To solve this consistently and ensure no exception is ever "swallowed" again, the best approach is to create a wrapper `LoggingRunnable`. This wrapper uses the **delegate pattern**: it takes a `Runnable`, wraps the call to `run()` in a `try-catch` block, and logs any `Throwable` before re-throwing it.

To further automate this, I implemented `LoggingThreadPools` (and a corresponding `LoggingScheduledThreadPool`). These also follow the delegate pattern: they wrap a standard `ExecutorService` and automatically intercept any `Runnable` passed to them, wrapping it in a `LoggingRunnable` before execution.

By using these delegates, I regained visibility into asynchronous failures without needing to manually wrap every task or rely on the unpredictable behavior of global handlers and unused `Future` objects.

### A Note on IntelliJ
Regarding the "Step Over" issue: it appears to be a known quirk in IntelliJ where the debugger can hang if you step over the last line of a `Runnable`. The workaround is simple: instead of stepping over the final line, just use "Resume Program" (F9) to continue execution.

---

*Originally published on [eglu.tech](https://eglu.tech/blog/java-exceptions-swallowed).*
