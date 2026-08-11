---
title: "How Smart is AI?"
description: "Can it design, or is it even good at pairing?"
date: "Apr 18, 2026"
tags: ["AI"]
---

As I said in my last post, AI is a glorified search engine. 
In that way, it helps with research; it's like instead of copying and pasting from Stack Overflow, AI does it for you. 
But as the saying goes: "If you copy and paste, you won't learn anything. You might feel like you are, but you aren't."

Research-wise, instead of going through ten blogs in search of solutions, AI gives a crisp, single answer. 
But the problem is, apart from these solutions not being 100% right, I miss those ten opinions. 
Those might not be the best—sometimes not even related—but I would have learned something new: future problems, new understandings, weaknesses, strengths, and how the people who came up with them think. 
It improves one's reasoning and thinking capabilities.

This time, I wanted to implement a simple feature flags system for the backend. 
And as you can guess, it was a bit of a struggle. 
For those interested in the technical details, I have embedded the chat below.

In short, I had to switch Claude to its Opus model with the effort set to "high." Even then, I had to prompt it multiple times to get the right answer. 
Fundamentally, I wanted to chat with it about my decisions: do they make sense? Is there a better approach? Does my thought process hold up? 
Like a pair programmer. 
And once we settle on what to do, I have it do it for me. 
I wanted to use it for code generation, but prompting line-by-line doesn't make sense. 
So, let’s align on what we're going to do, and then let it do it. 
It's not a major refactoring, but it's not a trivial task either, even though it looks like one. 
It requires thinking—not much, but understanding is required, in my opinion. 
When I do things, I want to do them properly, with the understanding I have gained up to that point. 
It's never 100%, but I try to reach as far as possible. 
And also, more importantly, I aim for the "bare minimum to get the job done."

In conclusion:
AI can generate code, but it cannot design. It can design those stupid "system designs" on whiteboards—those are just copy-pasting at this point. 
But when it comes to designing a feature that requires deep or even mid-level understanding, it fails. 
And to be honest, it somewhat hinders the process. Google AI's search mode is much better in that context; it helps more with research, in my opinion.

So, is it worth it? To be honest, in cases like these, it is not that much help. 
But personally speaking, I like chatting with it. As a lonely person, I feel good talking to someone. 
But how smart is it? Not that much. 
Actually, how dumb is it? Well, enough to make you one...

> I tried with Claude CLI, but it should be the same with others also.

[View the full chat transcript on GitHub Gist →](https://gist.github.com/sku0x20/c1d941f0f7cd6f24de910a909d25f758)

---

*Originally published on [eglu.tech](https://eglu.tech/blog/how-smart-is-ai).*
