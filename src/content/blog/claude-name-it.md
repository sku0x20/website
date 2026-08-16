---
title: "Premature Abstraction, Code Review and AI"
description: "Working with Claude has changed how I revert, review, and think about abstraction and duplication."
date: "Aug 16, 2026"
tags: ["AI"]
---

After 4+ years, and having an attraction toward TDD, I've learned a lot. I did things badly — I did premature abstraction, if that's even the right word, but the idea, the concept, is definitely there. I like this term because it echoes premature optimization: it's something that should be avoided just the same.

I did it. I sometimes still do. But it's becoming less of a problem these days — maybe it's experience, a way of thinking about things, maybe I'm just doing 1-2 iterations before settling now.

I'm definitely thankful to Claude. On my own, I'd never delete a chunk of code I've written — it takes energy and mental preparation to let go. But with Claude, I sit a bit further back. I can watch the code take shape. I'm still the one leading, designing, and of course still reviewing — deciding which path to take, whether it's coming out good. I review every commit, and I always tell Claude to commit after every meaningful edit.

But if you look, I'm reverting at least once every session — either Claude did something stupid, typically running ahead, and I ask it to revert, or I'm still figuring out how to abstract, which pattern to apply, what the code is telling me. Iterating.

I'm taking lessons, observing the APIs. If it's not coming out good, let's go back and try something else. And it's very cheap now — I can think more freely, more actively, while Claude is dumping characters, printing to the screen. I can see what's looking odd. I can actively think through the other path, the what-ifs.

And every piece of code is reviewed by me. That's just how I work — it's a discipline I live by. Well, apart from how it looks — I usually don't care about that. It's mostly a one-time thing, so I avoid breaking my head over it. But once it's something that has to be maintained, I definitely take control.

Claude isn't very good at extraction — drying things out. I usually have to tell it, once I can see the duplication myself. Sometimes you have to shape the code a certain way just to see the duplication. I can sense it, mostly, to be honest — it's some kind of intuition, a sense built from seeing a lot of bad code, the legacy code I deal with. I understand what not to do. Code smells and other cheap, easy mistakes are gone before I even think about them.

Mostly it's about designing a better API — more readable, with a simpler flow, less indirection, following the Russian doll model.

To be honest, I didn't know about the Russian doll model by name — I always felt how it could be applied, but now I'm starting to see it clearly. My tests, my APIs, my code style reflect that. I'm planning to write my thoughts on that separately.

On AI: in my opinion, it hasn't just accelerated code output, but thinking and adapting too. I'm pretty averse to AI tools generally, but as you can see, I'm not letting it loose — I'm reviewing every single line, understanding it, and if I can't understand it, I ask Claude to make it readable. If it still can't, I sometimes do it by hand and ask it to replicate the change elsewhere.

I'm always someone who keeps things simple and minimal — be it code, be it indirection, be it even the AI agent itself. I'm using Claude and haven't switched, not even once. It's working well enough for me — I never need to look elsewhere. And that's with Sonnet, too. I did ask it to take advice from Opus, and Opus does catch issues that even I missed — so in a way, even the learning is accelerated.
