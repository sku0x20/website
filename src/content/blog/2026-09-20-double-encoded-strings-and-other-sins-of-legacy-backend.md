---
title: "Double-Encoded Strings and Other Sins of Legacy Backend"
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

Over months of systematic cleanup, I cut the dependency tree down: from 114 dependencies down to 108, and eventually down to 94. Stripped out the dead weight. Consolidated everything onto Jackson—the tool Spring already ships with and optimizes for.

You'd think the worst was behind us. But the dependency bloat was merely a symptom. The real horror lived in the payloads.

## The Double-Encoding Abomination

Take a look at this HTTP response payload and tell me what you feel:

```json
{
  "code": 200,
  "message": "success",
  "data": "{\"userId\":\"usr_98412\",\"tier\":\"enterprise\",\"settings\":\"{\\\"theme\\\":\\\"dark\\\",\\\"notifications\\\":true}\"}"
}
```

Look at `data`. Look at `settings`.

It is not an object. It is a JSON-encoded string, sitting inside another JSON-encoded string, sitting inside a JSON response body.

```
HTTP Response
 └─ JSON Object
     └─ "data": String (Escaped JSON)
         └─ "settings": String (Double-Escaped JSON)
```

Someone took a Java object, serialized it to a string using one library, stuffed that raw string into another map, serialized *that* map using a second library, and shipped it out over HTTP. 

On the client side, to get a single user preference, you have to:
1. Parse the HTTP response body into JSON.
2. Extract the `data` field as a string.
3. Parse that string *again* into JSON.
4. Extract `settings` as a string.
5. Parse *that* string a third time into JSON.

If an unescaped quote or an encoding hiccup occurs anywhere along the line, the entire deserialization chain explodes with a syntax error that no schema validator can catch.

Why? Why would anyone ever do this?

There is no caching reason. There is no polymorphous blob requirement. It was sheer, unadulterated laziness: someone didn't want to define a nested DTO or didn't know how Jackson handles nested object mapping, so they called `.toString()` or `.serialize()` on an intermediate object, assigned it to a `String` field, and called it a day.

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
