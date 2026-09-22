---
title: "Migrating to Kotlin with Claude Code"
description: "Escaping IntelliJ's auto-convert traps, surviving Jackson serialization breakages, and finishing a 4-year Java-to-Kotlin migration in 3 days with Claude Code."
date: "Sep 22, 2026"
tags: ["Kotlin", "Java", "Refactoring", "Claude", "Jackson", "Backend"]
---

For four years, the backend was stuck in a split state: partly Java, partly Kotlin.

When I inherited the codebase, it was roughly 60% Kotlin and 40% Java. Over time, I chipped away at it during feature work, pushing it to around 72%.

And then it stalled.

Mechanical refactoring is pure friction. Nobody gets two uninterrupted weeks to sit down and translate hundreds of files by hand, and automated converters create more problems than they solve. So the remaining 28% sat there for years.

Last week, I finished the rest of it in three days using Claude Code.

---

## Why I Still Prefer Kotlin

Modern Java is trying hard. Java 21 brought records, pattern matching, virtual threads. 

Yet modern Java still feels caught in an identity crisis. It is not purely object-oriented anymore, but it is certainly not functional. It sits awkwardly in the middle—ceremonial, noisy, and far too verbose.

Kotlin just gets out of the way. DTOs collapse from 200 lines of boilerplate into single data classes, property access doesn't require extra gymnastics, and call-site generics don't require wrestling wildcards. When I read code, I want domain logic, not syntax ceremony.

I don't love everything about it—replacing standard bitwise operators (`<<`, `>>`, `&`, `|`) with infix words (`shl`, `shr`, `and`, `or`) still annoys me every time I see it. But day to day, Kotlin is clean, expressive, and pleasant to maintain.

---

## The Auto-Convert Trap

Early on, I tried the obvious route: IntelliJ's built-in converter (`Cmd+Alt+Shift+K`).

It looks like magic for thirty seconds. Then you look at the diff.

Years ago, someone had run the auto-converter across large swaths of the codebase and committed the result without checking. I spent years paying off that carelessness.

### The Nullable Var Explosion

IntelliJ is overly conservative. Instead of reading intent or using `lateinit var`, it takes the path of least resistance:

```kotlin
// What auto-convert produced
var customerName: String? = null
var orderItems: List<Item>? = null
```

Suddenly, non-nullable Java fields became mutable, nullable Kotlin variables. Safe calls (`?.`) and double-bangs (`!!`) spread across callers like an infection.

### The Jackson & Mongo Collision

This is the real minefield—and the single biggest trap in a Java-to-Kotlin migration. The compiler won't warn you, tests often miss it, and it silently corrupts MongoDB documents while breaking API wire contracts.

When field names are simple, like `stale`, there is zero issue:
- Mongo document: `stale`
- Java getter: `isStale()`
- Jackson strips `is` &rarr; `"stale"`

Mongo, the POJO, and the serialized JSON all agree on `stale`. Everything aligns.

The trap springs when the field name already starts with `is`, like `isOffline`.

In Java:
- Mongo document: `isOffline`
- Generated getter: `isIsOffline()`
- Jackson strips `is` &rarr; `"isOffline"`

It worked in Java purely by accident because the getter stutter gave Jackson an `is` to strip without eating into the field name.

Kotlin tries to be cleaner. When a property starts with `is`, the compiler doesn't prepend an extra `is`:

```kotlin
var isOffline: Boolean = false
```

The Kotlin compiler generates `isOffline()` as the getter—identical to the field name.

Jackson doesn't know or care about Kotlin's conventions. It sees a getter starting with `is`, follows JavaBean rules, strips `is`, and decides the JSON key is `"offline"`.

This isolates the exact mechanism: without `KotlinModule`, Jackson falls back to classic JavaBean introspection on compiled bytecode. Because Kotlin emits the getter for `isOffline` as literally `isOffline()` (not `getIsOffline()`), classic Jackson sees a method starting with `is` and strips it, exactly as it would for a plain Java bean:
- `isOffline` &rarr; `offline` (stripped)
- `visibleInMenus` (compiled getter: `getVisibleInMenus()`) &rarr; stays `visibleInMenus` untouched

Registration is trivial thanks to `ServiceLoader`—put `jackson-module-kotlin` on the classpath and call `ObjectMapper().findAndRegisterModules()`. With `KotlinModule` active, Jackson reads Kotlin's `@Metadata` and preserves property names properly, no annotations needed.

The catch is legacy backends littered with rogue `new ObjectMapper()` instances that never invoked `findAndRegisterModules()`, or persistence mappers where classic introspection still rules. In those places, the stripping comes right back:
- Mongo document expects: `isOffline`
- Kotlin property is: `isOffline`
- Jackson serializes: `offline`

Between Jackson trimming prefixes and Mongo mapping fields and accessors, the serializer diverges. Documents sprout duplicate phantom fields—both `isOffline` and `offline` living in the same document—while wire contracts silently break for clients expecting `isOffline`.

To make matters worse, legacy Java had zero consistency across files. In some classes, the getter had stuttered as `isIsOffline()` (Jackson output: `isOffline`). In others, someone had handwritten the getter as `isOffline()`—meaning even though Mongo stored `isOffline`, Jackson had quietly been serializing `offline` over the wire for years.

When migrating to Kotlin, you step on mines in both directions.

I lost nearly an entire day to this. I renamed fields to `isIs...`, rolled them back to `is...`, stripped `is` altogether, wrestled with generated setters, and watched tests break back and forth.

The rule that finally brought sanity wasn't guessing what Jackson or Kotlin's compiler would do:

1. **Compare field to field**: Ensure the Kotlin property matches the Java field name 1:1 so Mongo persistence stays intact.
2. **Compare getter to getter**: Check what the old Java getter actually exposed to Jackson.
3. **Pin the contract**: If they diverge in *either* direction, stop playing property-naming gymnastics. Slap `@get:JsonProperty("...")` directly on the getter with the exact wire string the legacy Java code produced:

```kotlin
@get:JsonProperty("isOffline")
var isOffline: Boolean = false
```

---

## Claude Code as an Adaptive Macro

When I picked up Claude Code CLI for this pass, I didn't write an elaborate prompt. I didn't need to.

The codebase was already 72% Kotlin. The patterns were already there.

This wasn't creative programming; it was contextual pattern matching:
- Take class X in Java, translate it to Kotlin.
- Match the idioms and style already present in the sibling Kotlin files.
- Fix all affected callers across the project.

A human can do that, but going class by class through hundreds of files drains your willpower. Traditional IDE macros can't do it because they lack cross-file semantic context. Claude Code acted as an adaptive macro: reading the surrounding conventions, translating the class, and fixing call sites.

### One File, One Commit

To keep from drowning in massive diffs or hidden breakages, I enforced a strict mechanical loop: migrate one class, fix affected callers, compile-check, and commit individually.

Every migration got its own atomic commit. If Claude went down a dead end—like trying to rewrite a deprecated external wrapper that was better left alone in Java—reverting was a one-liner: tell Claude to revert the last commit. Clean, done, no unpicking git history.

Every five clean commits, I ran the integration test suite. If green, push to remote. Fast rhythm, zero anxiety.

### The Final Five

Out of ~200 files, the vast majority fell into place with minimal fuss—isolated utilities, DTOs, straightforward services.

The last five files took almost as much time as the rest combined.

These were the God classes: 10,000-line legacy controllers and services with tentacles reaching everywhere. Converting one meant dealing with cascading circular dependencies, hidden side effects, and subtle type mismatches that required manual untangling before the compiler would pass.

---

## The Real Takeaway

Syntax translation is the easy part. Tools like Claude Code make mechanical language conversions fast and relatively painless.

The real danger is the silent runtime behavior—Jackson serialization heuristics, bytecode getter conventions, and persistence driver assumptions that no compiler will ever flag. If you don't audit the accessors and wire contracts against the legacy code, you'll trade technical debt for production outages.

Four years of a split codebase, finally settled in three days. But only because I learned where the mines were buried.
