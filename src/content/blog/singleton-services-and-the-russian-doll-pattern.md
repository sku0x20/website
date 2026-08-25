---
title: "Singleton Services and the Russian Doll Pattern"
description: "Splitting a bloated service into single-purpose Creator, Editor, and Finder objects, and realizing the domain object they used to protect doesn't actually exist anymore."
date: "Aug 25, 2026"
tags: ["Design", "Architecture", "Backend", "Testing"]
---

I've been trying to figure out how to properly design an application for a while now — long enough that I can measure it in years. I read GOOS early on, and it always read to me like advice for client-side software: a long-running process holding objects in memory, mutating them in place. You have a screen, some data, you create an instance, you update it. No persistence, nothing leaves the process, so encapsulation never really gets tested.

The moment persistence shows up, it gets tricky. That object's state has to leave the process and land somewhere durable, which means something has to pull the data out of it. Is that breaking encapsulation? Do I make every field public and call it a day? I didn't want to, and I didn't have a satisfying answer for a long time.

The typical shape looks like this: a Controller (a singleton) routes to a Service or Manager, which talks to a repository — a port in the hexagonal sense, swappable, fake it in tests. A typical update flow: fetch through it, mutate a field, save it back.

Where does validation live in that flow? "Name can't be longer than this," "name can't contain that" — usually it ends up in the Service or Manager. What's important is what's inside it. This class turns into a monster. Ten controller methods, mapping roughly 1:1 to ten service methods, and all ten dump their logic into the same class. Testing any one path means dragging the whole class along with it, because it's all one object.

One thing I've been experimenting with lately: keep the 1:1 mapping between controller methods and service methods, but stop letting the service method _be_ the logic. Make it a thin dispatch to a dedicated object that does exactly one job. A `Creator` that only knows how to build a new object, validate it, and save it. Nothing else lives in there. Need to update instead? That's an `Editor`'s job, not the same object's. Need to look something up? That's a `Finder`'s.

```
Controller.create(req)
  → Service.create(req)
      → Creator.create(req)   // validate, build, save — that's it
```

This is what makes testing cheap again. Testing the `Creator` in isolation is small and thorough, because it only has one job — I'm not dragging the other nine methods' worth of behavior along for the ride. I was taking SRP more literally than I used to.

But doesn't keeping `Creator` and `Editor` as singletons break encapsulation — isn't the behavior supposed to sit on the object it's acting on, not off in some service?

Take `Car`, with an engine you can swap out. I actually tried the obvious answer first: give `Car` an `updateEngine()` method, behavior sitting right on the domain object, exactly where OOP says it belongs. Built a whole feature this way once, worried that anything less would be a step away from real encapsulation. It didn't hold up — a server isn't a long-lived process, so every call meant constructing a full `Car`, wiring in its dependencies (db impl, notifier, whatever else it needed), running one method, then throwing the whole thing away. Same big object, same hard-to-test problem all over again, just moved down a level. Fine on the client, where the object actually lives across calls. Not on a server.

So I tried a thin, free-standing `UpdateEngine()` instead — the use-case pattern, basically, one class per operation, built fresh per request, CQRS-shaped, no full `Car` in sight, updating just the one field instead of replacing the whole document. Nicer. But it was still constructed per call, dependencies wired in every single time, and doing that on every one of however many hundred requests a minute felt like the same waste on a smaller object. The only reason I kept rebuilding it instead of reusing one instance was the same worry as before — that reusing it would somehow break encapsulation.

What I actually landed on was a singleton `Editor` with an `updateEngine()` method, called on every request instead of rebuilt for each one. On the face of it, this looks like the option that breaks encapsulation hardest — the behavior isn't even sitting on an object shaped like the thing it updates anymore. It might. But sit with it a bit and I don't think it does.

Nobody can update anything directly in this shape — every write goes through the `Creator` or the `Editor`, and they always validate before anything touches the db. What actually moves per call isn't the `Editor`, it's the argument handed to it: a `CreateRequest`, an `UpdateEngineRequest`, whatever the operation needs. That's the real DTO — data in, no behavior, no dependencies, gone the moment the call returns. It doesn't need behavior because it was never the thing enforcing the rules; the `Editor` is. That's still data hiding, just enforced at a single mandatory gate instead of bundled inside one object instance.

The read side makes this obvious. `Finder` doesn't hand back one canonical `Car` either — it returns whatever DTO shape the caller actually needs: a full-spec DTO for an endpoint that wants everything, a `CarExterior` DTO for one that only cares about paint and trim. There's no single `Car` sitting somewhere that these are views of. There's no `Car` at all, not as a running object carrying both data and behavior. It only ever exists as a name for a family of DTOs — one shape per write, one shape per read, never assembled into one instance anybody calls a method on.

Pulling data out of an object to persist it doesn't have to break encapsulation — there's never really an object to pull it out of, it's DTOs the whole way through. Step back and look at the whole thing, and encapsulation just isn't there anymore. Look at any one operation though, and it still holds: nobody can swap an engine without the `Editor` checking it's actually compatible with the body first. That's still enforced everywhere it needs to be, it's just not sitting inside a `Car` instance anymore, because there isn't one. It moved from the object to the gate.

Writes stay thin, dispatched through a singleton `Editor`, not rebuilt as a `Car` and not rebuilt as a free-standing `UpdateEngine()` either. `car.updateEngine()` still earns its keep on the client, where the object genuinely lives across calls and holds state in memory. Servers don't get that luxury — a request comes in, does its job, and disappears.

The thin object the `Editor` hands to the db impl doesn't even have to be a flat DTO, a plain copy of new field values. It can be more of a value capturer — an update descriptor instead of a data holder, closer to how MongoDB's `Update` takes `$set` and `$unset` rather than a whole replacement document. The `Editor` builds one of these, and the db impl is what knows how to turn it into whatever the actual store expects, a Mongo update document, a SQL `SET` clause, whatever. It's still thin — no dependencies, no validation sitting inside it — it's just carrying intent instead of plain data. That's the case for the whole approach: each piece stays small enough to test on its own, and none of them balloon back into the monster class from the start.

### A detour into AOP

My style has always been DRY, KISS, minimalism — never at the cost of understanding what the code does. Which is why I don't reach for the usual answer to cross-cutting concerns like validation or transactions: aspect-oriented programming, AspectJ-style weaving, annotate a method `@Transactional` and let it instrument the call so it "just happens." Fewer lines, sure. But it's magic, behavior attached to my code that isn't visible anywhere in my code. It also breaks the hexagonal split it's supposed to play nice with — clean for SQL, built around ACID transactions, but Mongo wants different annotations and different semantics, and the story stops transferring the moment you swap the adapter, exactly the case a port is supposed to survive. People will tell you AOP is the right tool for cross-cutting concerns. Too much magic for what it buys you.
