---
title: "Double-Encoded Strings and the Normalization of Stupidity"
description: "Trimming 10k-line controllers, banishing three competing JSON libraries, and the soul-crushing battle against JSON strings escaped inside JSON payloads."
date: "Sep 20, 2026"
tags: ["Backend", "Java", "Spring", "Architecture", "Rant"]
---

I can tolerate legacy code.

I really can. I understand how software grows. Deadlines hit, MVPs turn into production systems overnight, and compromises get made under pressure. Every engineer inherits things they wouldn't have built that way. You roll up your sleeves, write tests around the danger zones, and slowly refactor it toward sanity.

For the past four years, that is exactly what I've been doing with a sprawling legacy backend. 

Controllers with 10,000 lines of spaghetti. Zero architectural flow. God classes that know about everything from the database connection down to the exact email template string. I took it in stride.

Then came the JSON.

## The Tri-Library Circus

When I started auditing our dependencies, the first thing that hit me was the sheer, unadulterated dependency bloat. We had dozens of libraries doing the exact same thing in slightly different, subtly incompatible ways.

For JSON alone, the codebase was pulling in:
- `Jackson` (which comes with Spring Boot by default)
- `FlexJSON` (an ancient serialization library that hasn't been relevant in a decade)
- `org.json` (because someone needed a `JSONObject` in 2017 and didn't bother checking what was already on the classpath)
- And to top it off: **an Android utility library** sitting in a server-side Spring backend. Why? Because someone wanted an Android-specific Base64 or JSON helper and dragged in a mobile framework dependency rather than using `java.util.Base64` or Jackson.

Every developer who touched the codebase over a decade had just imported whatever library they remembered from their first programming job. One controller serialized with FlexJSON, another deserialized with `org.json`, and Spring was trying to wire everything in the middle with Jackson.

Over months of systematic cleanup, I audited the dependency tree and stripped out the dead weight. The backend artifact size dropped from 114 MB down to 108 MB, and finally down to 94 MB. Pruned unnecessary libraries, banned duplicate parsers, and consolidated everything onto Jackson—the tool Spring already provides out of the box.

You'd think the worst was behind us. But the dependency bloat was merely a symptom. The real horror lived in the payloads.

## The Double-Encoding Abomination

Take a look at what was being passed into our HTTP request bodies (and regurgitated right back out in responses):

```json
{
  "code": 200,
  "message": "success",
  "data": "{\"userId\":\"usr_98412\",\"tier\":\"enterprise\",\"settings\":\"{\\\"theme\\\":\\\"dark\\\",\\\"notifications\\\":true}\"}"
}
```

Look at `data`. Look at `settings`.

It is not an object. It is a JSON-encoded string, sitting inside another JSON-encoded string, sitting inside a JSON payload.

```
HTTP Body
 └─ JSON Object
     └─ "data": String (Escaped JSON)
         └─ "settings": String (Double-Escaped JSON)
```

Someone took an object, serialized it to a string using one library, stuffed that raw string into another map, serialized *that* map using a second library, and shipped it over HTTP. 

On the server, instead of letting Spring do its job and deserialize the request cleanly into a typed DTO, the controller had to perform manual gymnastics:
1. Spring deserializes the outer HTTP body into a generic wrapper or map.
2. The controller extracts `data` as a raw `String`.
3. It manually invokes a second JSON parser to turn that string into an intermediate object or map.
4. To get a nested preference, it extracts `settings` as yet another raw `String`.
5. It invokes a *third* parser call to deserialize that string into a settings object.

If an unescaped quote or an encoding hiccup occurs anywhere along the line, the entire deserialization chain explodes with a syntax error that no schema validator can catch.

Why? Why would anyone ever do this?

There is no caching reason. There is no polymorphous blob requirement. It was sheer, unadulterated laziness: someone didn't want to define a nested DTO or didn't know how Jackson handles nested object mapping, so they called `.toString()` or `.serialize()` on an intermediate object, assigned it to a `String` field, and called it a day.

### The Leaning Tower of Backslashes

It gets worse. Once you normalize encoding JSON into strings, that disease inevitably leaks into your persistence layer.

I have opened database tables in this system and found records containing literally more backslashes (`\`) than actual data. 

Because what happens when a service reads a stringified JSON field, wraps it in another object, serializes it again, and saves it back? The backslashes compound exponentially:

```
Pass 1: "{\"key\": \"val\"}"
Pass 2: "{\\\"key\\\": \\\"val\\\"}"
Pass 3: "{\\\\\\\"key\\\\\\\": \\\\\\\"val\\\\\\\"}"
```

A few roundtrips through buggy update pipelines, and you end up with single database values drowning in thousands of consecutive backslashes. It is a mathematical monument to bad design: $2^n$ escape characters multiplying with every layer of indirection.

It broke parsers completely. JSON serialization libraries are written by competent engineers who optimize for the real world; they do not write test cases for a single field containing four thousand backslashes because no sane person expects this level of architectural rot. Deserializers would hang, memory would spike, and the logs would drown in cryptic unescaping errors.

## "It's a Convention"

The bad code itself isn't what drives you mad. What truly drains your life force as an engineer is the conversation that follows when you try to fix it.

When I flagged this and started standardizing endpoints to clean, nested JSON, the response from some peers wasn't relief. It was pushback:

> *"Well, that's just the convention we've always used here. Just document it in Swagger and move on."*

Convention? Since when is escaping JSON inside JSON a "convention"? 

Calling broken engineering a "convention" is how bad code becomes permanent code. It's the ultimate defense mechanism for people who stop caring about craftsmanship. Instead of admitting that a practice is an anti-pattern that violates basic API design and costs every consumer CPU cycles and sanity, you slap the word "convention" on it to make it immune to criticism.

Even for an MVP, this is indefensible. An MVP means minimal *scope*, not negative *competence*. Writing a clean nested POJO takes the exact same number of keystrokes as serializing an object to a string and shoving it into a wrapper.

## The Cost of the Fight

The irony of modern backend work is that writing the fix usually takes ten minutes. Consolidating the dependencies took an afternoon. Replacing the double-encoded hack with a proper DTO took thirty lines of code.

The exhausting part—the part that leaves you staring at the ceiling at 6 PM wondering why you write software—is having to spend two weeks in review meetings debating whether valid JSON is better than doubly-escaped string blobs.

Fixing legacy code isn't just about refactoring syntax; it's about holding the line against the normalization of mediocrity. If you see a stringified JSON blob living inside a JSON payload in your codebase, don't document it. Don't call it a convention. Kill it.
