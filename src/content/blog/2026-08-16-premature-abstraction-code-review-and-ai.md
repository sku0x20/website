---
title: "Premature Abstraction, Code Review and AI"
description: "Working with Claude has changed how I revert, review, and think about abstraction and duplication."
date: "Aug 16, 2026"
tags: ["AI"]
---

After 4+ years, and having an attraction toward TDD, I've learned a lot. I did things badly — I did premature abstraction, if that's even the right word, but the idea, the concept, is definitely there. I like this term because it echoes premature optimization: it's something that should be avoided.

I sometimes still do, but it's becoming less of a problem these days — maybe it's experience, a way of thinking I've developed, maybe I'm just doing 1-2 iterations before settling nowadays, thanks to Claude.

Claude isn't very good at extraction — drying things out. I usually have to tell it. Sometimes I have to shape the code a certain way just to see the duplication. It's like a sense, an intuition — maybe something built from seeing a lot of bad code, the legacy code I deal with every day. I've come to understand what not to do. Code smells and other cheap, easy mistakes don't even cross my mind anymore — they're gone before they even form.

It's about designing a better API — more readable, with a simple flow, less indirection — and this typically ends up following the Russian doll model on its own. When I first came across this concept, I always felt how it could be applied, but now I'm starting to see it clearly. My tests, my APIs, my code style reflect that.

I'm definitely thankful to Claude. On my own, I'd never delete a chunk of code I've written — it takes energy and mental preparation to let go. But with Claude, I sit a bit further back. I can watch the code take shape. I'm still the one leading, designing, and of course still reviewing — deciding which path to take, whether it's coming out good. I review every commit. My workflow requires Claude to commit after every meaningful edit. It helps with tracking, but more importantly, it helps with reverting.

I'm reverting at least once every session — either Claude did something stupid, typically running ahead, or I'm still figuring out how to abstract, which pattern to apply, what the code is trying to tell me — iterating, in simple terms. For code that deals with how things look, frontend code mostly, I usually don't care, since it's mostly a one-time thing, so I avoid breaking my head over it. But once it's something that has to be maintained, I take charge.

I'm pretty averse to AI tools generally, but as you can see, I'm not letting it run loose: I review every single line, understand it, and if I can't understand it, I ask Claude to make it readable, guiding it. If it still can't, I sometimes do it by hand and ask it to replicate the change everywhere else.

I'm taking lessons, learning, observing the APIs, how they're coming out. If they're not good, I go back and try another path, think it through. The thing is, doing all this is very cheap now — I can think more freely, more actively, while Claude is dumping characters. I can see what's looking odd. I can actively think through the other paths, the what-ifs. In my opinion, AI hasn't just accelerated code output, but thinking and adapting too.

I'm always someone who keeps things simple and minimal — be it code, be it indirection, be it even the AI agent itself. I'm using Claude and haven't switched, not even once. It's working well enough for me — I never need to look elsewhere. And I'm using Sonnet. I did ask it to take advice from Opus, and Opus does catch issues that even I missed. TIL, basically.
