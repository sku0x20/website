---
title: "Stopgap 5.0: I Deleted Content Negotiation"
description: "50 commits making a serde catalog speak RFC 9110, then the question of who needs it. What replaced it: one request mapper and one response mapper per endpoint, picked at compile time."
date: "Oct 28, 2026"
tags: ["Kotlin", "Helidon", "HTTP", "API Design", "KSP"]
---

Stopgap is my compile-time Kotlin toolkit for HTTP services on Helidon. For [5.0](https://github.com/sku0x20/stopgap/releases/tag/v5.0.0), I spent 50 commits making its serde catalog negotiate media types properly. Media types keyed case-insensitively, JSON charset ignored, a full type-and-charset match preferred, clean 415s for a missing `Content-Type`. I renamed the catalog to `CachingMediaTypeSerdeCatalog` and back again, and left a TODO for a bounded lookup cache.

Then I stopped and asked who actually needs any of this.

5.0 ships without it. The toolkit no longer negotiates media types at all.

---

## What Serde Got Wrong

Through 4.1, a `SerdeCatalog` mapped media types to serdes: read `Content-Type` to pick a deserializer, read `Accept` to pick a serializer.

[Issue #46](https://github.com/sku0x20/stopgap/issues/46) lists where that diverged from RFC 9110:

- **No `Accept` header → 406.** The RFC says a missing `Accept` means anything is fine.
- **`*/*` → 406.** The catalog keyed on the literal string, so curl's default got rejected.
- **`q=0` counted as acceptable.** Helidon keeps those entries, sorted last, and the catalog took the first match.
- **Plain text ignored the request charset.** `String(bytes)` decodes as UTF-8, so ISO-8859-1 came out garbled.
- **No `Vary: Accept`.** A cache could hand the JSON response to a client that asked for text.

---

## Why I Stopped

Fixing those was the plan. Building it kept surfacing more machinery than value:

- **The matching policy never ended.** Case, charset aliases, JSON's meaningless `charset`, missing charsets, extra parameters. Then the `Accept` side: q-values, wildcards, specificity, `q=0`, `Vary`.
- **Declared media types don't scale.** Multipart's `boundary` changes on every request, so a serde can't list the exact types it accepts. It needs a predicate, and a predicate turns lookup into a scan.
- **The cache needed abuse defences.** Its key is header text the client chooses. Vary a parameter on every request and the cache grows without bound. Bounding it means capacity limits, admission filters, eviction policy.
- **Almost nobody needs it.** Most endpoints speak exactly one media type.

That TODO for a bounded cache was the moment. I was about to harden a lookup that shouldn't exist.

---

## One Mapper Per Endpoint

The replacement is two interfaces:

```kotlin
interface ReqMapper {
    fun <T : Any> map(request: ServerRequest, response: ServerResponse, type: KType): T
}

interface ResMapper {
    fun <T> map(request: ServerRequest, response: ServerResponse, value: T)
}
```

A mapper gets the whole Helidon request and response, not a narrowed view. A `ReqMapper` can set a response header; a custom `ResMapper` can read `Accept` if it wants to negotiate. The toolkit doesn't.

The shipped `ResMapper`s ignore `Accept` entirely. The response always carries the mapper's media type, so there's no 406 to send and no `Vary` to forget. JSON goes out as plain `application/json`, since RFC 8259 defines no `charset` for it.

Which mapper runs is decided by an annotation: method beats class, class beats the app default.

```kotlin
@Post("/desPlainText")
@CustomReqMapper(clazz = PlainTextReqMapper::class)
fun desPlainText(res: ServerResponse, body: String) { ... }
```

KSP turns that into a typed parameter of the generated `registerRoutesFor`, and the route calls it directly:

```kotlin
rules.post("/desObj", { req, res ->
    endpoint.desObj(res, reqMapper.map<ReqDto>(req, res, desObjBodyKType))
})
```

Reading the endpoint tells you exactly how its body is parsed. There's no lookup per request, and a missing mapper fails at startup in the registry, not on the first request that needs it.

`BodyReqMapper`, the shipped base for JSON and plain text, takes a `MediaTypeRule` and a `BodyDecoder`. I tried fusing them into one object that both accepts and decodes. It fell apart: one rule couldn't pair with several decoders, and a composite couldn't tell which child had accepted. Split, the 415/400 handling lives once in `BodyReqMapper`, and the app picks its JSON library without touching any HTTP checks. Stopgap itself ships no JSON library.

---

## Details That Mattered

### `*/*` matches everything

Helidon's `HttpMediaType.test()` treats wildcards as a match. Build a "strict" JSON check on it and a request with `Content-Type: */*` sails through. So the rule compares type and subtype by hand:

```kotlin
// Compares type and subtype directly: HttpMediaType.test() treats wildcards as a match, so */* would pass.
class JsonMediaTypeRule : MediaTypeRule {
    override fun accepts(mediaType: HttpMediaType?): Boolean {
        val type = mediaType?.mediaType() ?: return false
        val subtype = type.subtype()
        return type.type().equals("application", ignoreCase = true) &&
            (subtype.equals("json", ignoreCase = true) || subtype.endsWith("+json", ignoreCase = true))
    }
}
```

Plain text is just as strict: UTF-8 or no charset, anything else is a 415. The decoder never guesses an encoding.

### An empty body is a 500

`content().as(...)` on an empty body throws `IllegalStateException`, which surfaces as a 500. The client sent a bad request; that's a 400. `BodyReqMapper` reads `content().inputStream()` instead. An empty stream is just an empty byte array, and that becomes `EmptyBodyException`. It also means no Helidon media support runs between the wire and the decoder.

---

## Multipart

`multipart/form-data` was [#54](https://github.com/sku0x20/stopgap/issues/54), and the old design couldn't hold it: a deserializer only got bytes, not the `boundary` parameter. With a mapper owning the whole request, it's just another `ReqMapper`.

`MultipartReqMapper` streams the body. Parts stay in memory up to 16 KiB, then move to temp files. `MultiPart` is `AutoCloseable`, and the generated route closes it in a `finally`, because the endpoint might throw, read a part twice, or never read it at all. The endpoint shouldn't have to remember.

Parts come back undecoded. Decoding each part by its own `Content-Type` would bring back the media type → decoder lookup this release exists to delete.

---

## What's Still Open

- No multipart limits: part count, header line length, preamble length.
- Helidon's `ContentDisposition` rejects `filename=""` with a 500.
- Gzip bodies bypass `max-payload-size` ([#55](https://github.com/sku0x20/stopgap/issues/55)).

Content negotiation isn't on that list. An endpoint that needs it writes a mapper that reads `Accept`. Everyone else gets one media type and no RFC 9110 bugs.

### Resources

- [RFC-0003: Request and Response Mappers](https://github.com/sku0x20/stopgap/blob/main/docs/proposals/0003-req-res-mappers.md), the design and every "why"
- [PR #57](https://github.com/sku0x20/stopgap/pull/57), the change itself
- [Issue #46](https://github.com/sku0x20/stopgap/issues/46), where serde diverged from RFC 9110
- [Observability in Stopgap 4.1](/blog/observability-in-stopgap-4-1-one-sdk-four-signals), the previous release
