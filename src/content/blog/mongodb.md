---
title: "Why I Don't Like MongoDB"
description: "MongoDB pushes schema failures from write time to read time, and that's a much bigger problem."
date: "Aug 16, 2026"
tags: ["Databases", "Opinion"]
---

MongoDB is schemaless, and it requires more discipline to work with.

As Martin Fowler said, nothing is schemaless — it's always there, either enforced at write time or at read time. In SQL systems, it's at write time, and it fails there. Mongo-like systems fail at read time instead.

I feel like in cases like this, failure at read time is a much bigger issue.

The issue is exemplified when you can put any value type under the same key. At the very least, that shouldn't be allowed — you should have to create a new key instead. Two docs with the same key but different value types is a pain to work with.

One example: a field that should have been a byte ended up as a long integer. I don't know how it got there — it only got caught during a migration.

MongoDB does have validator support now, but I'm not sold on it. Honestly, if I had to build something from scratch, I'd prefer a system with a schema. If I want flexibility, I'd rather use one of these newer NoSQL systems, like ClickHouse, which give you SQL benefits along with NoSQL flexibility. I haven't used its JSON type, but it looks good.

If I recall, Postgres also has good JSON support, but I haven't worked with Postgres, so I don't know how it works, how costly it is, or if it's worth it.
