---
title: "Another Russian Doll, in Go"
description: "Chased duplication out of my Go assertion library and landed on Hamcrest's Matcher interface without going to look at it."
date: "Aug 26, 2026"
tags: ["Design", "Go", "Testing", "Architecture"]
---

I've got a small Go library, [assertgo](https://github.com/sku0x20/assertgo), for fluent test assertions. The style I wanted was closer to Java's AssertJ than to Hamcrest — `T(t).Assert(x).EqualTo(y)` reads better than `assertThat(x, equalTo(y))`.

A few methods in, the shape was already repeating: check the condition, format a message, fail. So I pulled that part into one place, a single `Assert` every method could call into. Once that logic lives in one place instead of inside every method, a method can't decide pass/fail for itself anymore. All it can do is tell `Assert` whether the value matched, and what to say if it didn't. Those two things always travel together, so they stopped being two arguments and became one object: a `Matcher`. For `EqualTo`, that's an `EqualMatcher`.

It clicked right there: this is Hamcrest, the thing I've used in Java for years. I'd walked away from its API and still ended up inside its head. I never went and checked Hamcrest's source afterward, so I still don't know how it does the actual comparing inside. The `Matcher` shape, though, matched exactly. And Hamcrest isn't just some library: the GOOS authors wrote it, and people still reach for it today. Getting to the same interface without actively trying to copy from it — I'm proud of that.

The comparing had to split out of `EqualMatcher` too. Its job is "does this count as equal, and what do I say if it doesn't" — not "how do you compare two `V`s." Those aren't the same question: a string wants exact equality, a struct wants field-by-field, a float wants a tolerance. Bake that into `EqualMatcher` and I'd need a different `EqualMatcher` per type. Push it onto a swappable `Comparator[V]` instead, and `EqualMatcher` stays one implementation no matter what's being compared. See how it's becoming a [Russian Doll](/blog/singleton-services-and-the-russian-doll-pattern).

Same instinct as the backend pattern: keep DRYing until what's left is small enough that the "clean abstraction" just shows up already wearing a name. Here's where it landed:

```go
type Matcher[T any] interface {
    Match(value T) bool
    FailureMsg(value T) string
}

type EqualMatcher[V any] struct {
    other      V
    comparator comparator.Comparator[V]
}

func (e *EqualMatcher[V]) Match(value V) bool {
    return e.comparator.Compare(value, e.other) == 0
}

func (e *EqualMatcher[V]) FailureMsg(value V) string {
    return fmt.Sprintf("expected %v but got %v", e.other, value)
}
```
