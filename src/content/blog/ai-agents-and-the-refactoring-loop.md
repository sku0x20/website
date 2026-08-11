---
title: "Ai, Agents and the Refactoring Loop"
description: "After spending quite some time with ai tools; here are my takes. How it helps and how it slows down;"
date: "Apr 16, 2026"
tags: ["AI", "Opinion", "Kotlin"]
---

After spending quite some time with AI tools, here are my takes.
How it helps and how it slows down; exclusively on coding AI tools.

## The Setup

On a daily basis I work with 3 tools in general.

Gemini-cli, Claude Code cli, and JetBrains Ai from within the ide.
JetBrains Ai uses different vendors, but mostly quality is consistent, I feel.

Let's talk about where each tool I find excels.

Gemini excels in refining and generating English Text. be it an email template, or blog post refinement.

Claude lacks badly in this area, but it makes up more than enough in coding. It understands the project properly, it gets the prompt better, and it generates code more precisely while being faster. When I say "generate code" it means editing also. less prompting is required to get the job done.

JetBrains Ai, I mostly use for understanding small snippets of code and asking for better/clean code. Apart from that mostly for generating commit messages.

One more tool I use quite frequently is Google's AI mode. I use it mostly for Researching, as it gives the reference/source links. It also feels more realtime. Tbh, nowadays, I am not using Google search. Ai Mode is so good.

Claude and Gemini have to be told explicitly to search the web and find out. E.g., the latest version of some library, etc. To their credit, since they are agentic, they can do web search, analyze, and figure out like the latest version.

So, is AI going to replace humans?
On a very fundamental level, nope. They can't make decisions or understand the business requirements.
Code is more than just instructions of what to do, they are specs of the business, what, and how the business is operating. And those decisions are very human, to the level sometimes even illogical.

Next let's talk about Ai w's and l's.

## Ai W's

I like to think of Ai as a code generator, a boilerplate generator.
And if you see, all the frontend/ui is mostly that, boilerplate. So AI excels there.
UIs can be generated with AI fast and cheaply. One prompt can give you a whole screen.
And since ui is all about ‘does it look good', non-functional, code quality doesn't matter much here.

Similar things can be applied to IAC, or configs in general. All the .yaml, .conf files are just boilerplate.
And AI can generate it faster from one prompt to a full file.

In my latest project I generated the whole iac code(.tf) with Claude.
I was doing the review cause infra, but rarely found stupidity.
My loop is always asking these agentic tools to commit after they make any changes.
It enables an easy diff in the editor/ide.
Also, I used HCL/config/declarative language rather than Pulumi/code/imperative, as Ai is a good boilerplate code generator, and more importantly, I feel IAC should be declarative rather than imperative.

So I gave 2 cases where it excels, it benefits from the code generation and boilerplate generation.
Another handy tool it got in its toolbox, Search And Replace.
I Like to say, Ai is a "Glorified Search And Replace".

If you have ever run Claude, you would see so many greps, regexes, etc.
And even before then, understanding the prompt itself is quite the Search right. That's what LLM is all about. Anyway, let's not go off topic.

On the same project I used Claude for IAC I used it for maintenance purposes also. And it performed quite well. Now maintenance is quite a broad word. In this particular context I mean, without any major feature, just maintaining what's already there. No major changes.

It's hard to continue without telling what the project was.
So it is, *dramatic drum rolls & curtain drops* "Website".
So it's a website, hmm, actually it's quite a good candidate, it has next.js frontend, Strapi CMS as backend, and now as mentioned prev. I added that IAC.
I worked on the frontend first, then its iac, then backend, its iac and then plugging all 3 together. While doing all this, I didn't write a single line of code.

It was in quite bad shape.
Let's talk about the front end. This is the first next.js project I am working with, but I work with the js ecosystem quite frequently.
And since it's not my main project, I didn't want to spend time understanding it or overhauling it. All I wanted was to be able to deploy it and have quite the control.

I reimported it into git. no prev. history, ignored public assets, and removed unnecessary files.
I asked Claude to generate bare minimal .gitignore and .dockerignore.
Slowly the pace picked up, I am reviewing but not touching anything. If Claude is doing something fishy, I am asking it to revert.
As you can guess, I used it to generate an optimized Dockerfile, etc., but all this is part of code gen. What about search and replace, which is what we should be talking about here.

Let's start small, what about some cleanup? I asked it to clean dead code, then remove unused dependencies, then rarely used dependencies, and replace them with native counterparts, like axios with fetch. And it did gracefully. It spanned multiple prompts and commits. And I like working in small steps, that's what TDD taught me, working in small and incremental steps, and I like that philosophy very much, way less cognitive load.

Anyway, after that there was a major task, for every asset referenced in code prepend it with an env so I can change from where static resources are served, public folder or from cdn, etc.
It took 2 tries. Mostly it boiled down to me telling Claude we don't need a js function and just prepend every part with a NEXT_PUBLIC_STATIC_RESOURCE_URL
As you can see, it could have taken me so long to make this change, forming complex regexes or having a good understanding of the project and knowing where to find the resource references, or at worst brute forcing and going through each file manually.

Actually, that search is also being the dead code cleanup and also cleanup of assets from the public folder which are not references anywhere in the code.

Dead Code is not full proof, still I can find some unreachable code ide is pointing, but it's js idk, what dynamic hell it might be doing at runtime.

I did the same with the backend. I have never worked with Strapi before, and after working with it and somewhat understanding, I don't like it, half in db half in code. It's such a pita.
Anyway, after some time, the backend was ready. Unnecessary dependencies are removed, in a much better state. Unnecessary files are removed. And I just felt like I have more control even though I haven't written a single line of code.

See how Claude made my life as a maintainer so easy. I don't have to manually go and do all that. No need to understand the whole project structure, as I don't care about all that.

With all these qualities, one can build MVP very fast.

But where is the catch, you ask?


## The L's

As they say, and it predates back when AI wasn't even a thing.
With Spaghetti code initial takeoff will be so fast. However, with time it will result in a big ball of mud which no one can understand. Eventually, it would be so hard to add any feature or make any change it would outweigh starting a new project from scratch.
But that has its own big problem, specs, code is not just instructions, it's also the spec and specs vary from situation to situation.

> "The Refactoring Loop"

This is where the craftsmanship comes into the picture. How much a person values the work, sees code as part of their expression, expressing themselves, as an art, a craft, poetry.
Sometimes I feel what I have written on a very personal level. I feel happy, excited with good code I write, and sad, with bad code. Not flowing as I expected, like a river.
In my opinion, code should be clean, crisp, elegant, performant, optimized not just for computers but for reading and understanding.

Anyway, coming back to Ai, what's all the fuss about; it can do refactoring. It can even generate "readable" code.
First of all, readability has to be accompanied by understandability. And this is one of the reasons I don't like the streams, and other one-liners in Kotlin and Java.

Ai can generate a readable code, one-liner, etc. but it cannot generate an understandable code cause that requires more than just syntax. It requires understanding of the semantics, code flow, control flow. Which requires fundamental understanding of the codebase; until you have the global understanding, a big picture, you cannot refactor big. And that happens incrementally in small refactoring loops. If you involve Ai, you will never understand the codebase and can never DRY a codebase, making it better than what it already is, a big ball of mud.

Refactoring a single function into multiples, then into separate classes, drying code to use these classes rather than copying and pasting the same semantic code again at different places. Then towards the packages, etc.

It requires human understanding and decision-making. Do I require an external dependency for this behavior, is it worth it?
It requires understanding which algorithm is good. Weighting the pros and cons.

Anyway, back to the problem at hand; what is the issue with AI again?
The problem is it cannot do all this. It cannot understand 2 distinct pieces of code that are actually doing the exact same thing.
So it duplicates the code.
And sometimes worse, it assumes they are doing the same thing where in reality they are totally different things.

One simple loop can replace the entire chain of calls.
But Ai won't do it because it isn't clean. Here clean is actually the opposite of what we want.

Instead of returning an array, the function could take a buffer and populate it.
But Ai won't do that because it doesn't understand, because the bad code it's refactoring is doing the same crap, it just makes new code worse. Hiding behind the function calls. I have to explicitly instruct, but now AI is an obstruction not a helper.
If I am getting this involved with code, I can just do it myself.

No human mind can understand all the codebase in depth but specific sections/features it's currently working on.
Let's be practical, try recalling the feature x's codebase, which you have not touched in a while since you are working on feature y.

You have to relearn the code, and the best way is refactoring. Understanding the control flow, the semantics, the business specs. And to replicate it in refactored code in a better way, so now it's easy to read, understand and add new features.
That's the point of refactoring.

Refactoring's a feedback loop, a negative one.
Whereas if you involve AI, it becomes positive. You will not know what's happening, it's hard to understand the control flow, and it's hard to make sense of the code.
And now it's not new refactored code, it's the same old messy code, duplicated everywhere.

One Refactoring example where AI can help, and it again involves Search And Replace power of Ai.
Let's say I want to remove the auth from the function level and put it inside middleware. That AI can be done easily.
Because it's fundamentally a search and replace operation and Ai excels at them.
Glorifies Search And Replace. huh.

Let's take a step aside and say so not use Ai for refactoring at all?
No, I am not saying that. The above example is opposite right, and one more good case which fits into the refactoring loop perfectly.
The thing is you should be in charge and actively knowing what you want.

Another great place where Ai can help understand what messy code is doing. Not a whole file and all but a small chunk of function or some stupidly named function with unfollowable code.
I use it often, it tells me what it's doing, and once I understand that, I can make sense and refactor the code.
Sometimes I go even further to ask how to write it more elegantly, cleanly. Or even better context free, asking it something like, "how to loop in chunks of 4" and it gives me "step". Which I didn't think of.

I can do this because I understand the code, what it is doing, the control flow.
Sometimes I don't even require it because I can do that in the outer loop itself, which is there in my refactored code.

I do this in the ide. As I can just highlight and ask, no need to obstruct my flow.

## Conclusion

So is the ui/frontend gone?
for boilerplate, yes, but there are quite other things in that world too, making a scalable ui, code has to be clean, that time, refactoring comes into picture and the moment refactoring comes into picture, Ai's doesn't work. So yeah, nothing has changed fundamentally; prev it was ui editors that generated the boilerplate now it's Ai.
Glorified Code Generators and Search And Replace.

Ai can help you in a generalized sense, but when refactoring it is about localized scope and not just rewriting in different syntax. Refactoring is about understanding the control flow and rewriting it for benefits.

### W's
- Boilerplate code -> configs/iac, etc.
- One shot tasks -> scripts, etc.
- Search And Replace

### L's
- Decision maker/taker
- Refactoring where brain power is required to get clean code


> this article is in all written by me without any AI cleanup, post-processing by AI. The only thing used is spell check. It would be funny to have the direct dependency on AI in an article about AI...

---

*Originally published on [eglu.tech](https://eglu.tech/blog/ai-agents-and-the-refactoring-loop).*
