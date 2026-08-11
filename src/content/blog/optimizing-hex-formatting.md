---
title: "Optimizing Hex Formatting"
description: "How a simple change from String.format to JDK 17's HexFormat removed a significant bottleneck in a high-throughput backend."
date: "May 17, 2026"
tags: ["JVM", "Performance"]
---

I was browsing YouTube recently and stumbled upon [this video](https://youtu.be/VYTF4KIF2z0?si=wcpaJfXKUyxdRilc) about performance. It reminded me of a similar optimization I tackled a few years back.

About 2–3 years ago, when I first discovered flame graphs and profiling, I was excited to point those tools at our backend. I expected to find some "complex" bottlenecks—maybe database contention or GC pressure—but what I found was much more mundane and surprising. One of the biggest bottlenecks was simply **hex formatting**.

## The Requirement: Hex Logging

The task was straightforward: for every message the server received from a device, we needed to print the raw binary payload as a space-separated hex string into a log file. 

While these weren't standard "application logs" (they were more like an audit trail), we still used high-performance loggers. However, regardless of the logger's efficiency, the way we were preparing the data for the logger was killing our throughput.

## The Problem with `String.format`

There are many ways to format a byte array into hex. Most developers default to using `String.format("%02X ", byte)` inside a loop. (A loop is necessary because passing a `byte[]` directly to `String.format` just prints the array's memory address/hashcode, not its contents.)

```java
StringBuilder sb = new StringBuilder();
for (byte b : bytes) {
    sb.append(String.format("%02x ", b));
}
```

The problem is that `String.format` is built to be generic. In a nutshell, it does two expensive things:
1. **Parsing:** It has to parse and understand the format string (`%02X`) every time it's called inside that loop.
2. **Formatting:** It then has to loop through the input and validate it against that format.

When you're doing this thousands of times per second for large payloads, the overhead of parsing and generic looping adds up. It showed up as a massive, wide block in our flame graphs.

You might wonder: why not just pass the byte array to the logger and let it handle the formatting? The problem is that most loggers are designed to be generic. When you use their built-in message formatting, they often fall back to a generic `String.format`-like routine or a simple `toString()` call under the hood. They don't have specialized, high-performance routines for binary-to-hex conversion because that’s not their primary job. 

## The Custom Path vs. JDK 17

My first thought was to write a custom formatter. It’s a classic problem: create a constant lookup table (a `char[]` or `byte[]` containing `0-F`) and map each nibble of the byte directly to its hex character. It's simple and extremely fast.

But then I realized that with JDK 17, we have `HexFormat`. It does exactly this under the hood, and it's built right into the standard library.

```java
// The new, optimized way with JDK 17
String hex = HexFormat.ofDelimiter(" ").formatHex(bytes);

// And if you need to go the other way (hex string back to byte[])
byte[] decoded = HexFormat.ofDelimiter(" ").parseHex(hex);
```

I swapped our custom loop for `HexFormat`, redeployed, and checked the graphs again. That wide "formatting" block was completely gone. 

## The Takeaway

Most of the time, the most impactful optimizations aren't found in exotic CPU cache tricks or complex lock-free structures. They come from replacing a generic, "one-size-fits-all" routine with an optimized one specifically designed for your use case. 

In this case, `HexFormat` turned a bottleneck into a non-issue by simply being purpose-built for the task.

---

*Originally published on [eglu.tech](https://eglu.tech/blog/optimizing-hex-formatting).*
