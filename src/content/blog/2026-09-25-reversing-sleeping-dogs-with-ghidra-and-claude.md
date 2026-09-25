---
title: "Reversing Sleeping Dogs with Ghidra and Claude"
description: "Why I abandoned reverse engineering two years ago, why I refuse to use copy-pasted trainers, and how digging into Ghidra and Claude finally broke the entry barrier."
date: "Sep 25, 2026"
tags: ["Reverse Engineering", "Ghidra", "Claude", "Cheat Engine", "Assembly", "C++"]
---

I abandoned reverse engineering two years ago.

Not because I lost interest, but because I kept hitting a wall. The hardest part of RE isn't even the assembly—it's the tooling. Ghidra, IDA Pro, Cheat Engine, x64dbg. Dense, overwhelming cockpits with hundreds of sub-windows, cross-references, and zero hand-holding. The tutorials are 50-page forum threads from 2012 written by people who assume you already know the jargon. And as an introvert, "just ask on Discord" is a non-starter when you don't even know what you don't know.

If I just wanted to not die, I'd download some shady trainer, press F1, and move on. But copy-pasting tables is brain-dead. I do this out of curiosity—I want to know how the engine actually ticks. 

For *Sleeping Dogs: Definitive Edition* (`SDHDShip.exe`), I didn't want god mode. Invincibility makes combat boring. I just wanted a safety floor: clamp health so it never drops below 30%. Combat stays frantic, but I stop restarting fights over small mistakes.

Two years ago, this would have ended with me closing Cheat Engine in disgust. Yesterday, I had the hook working in an evening.

---

## The Blind Scan Headache

I started the usual way: Cheat Engine. 

Get hit, scan for decreased value, heal, scan for increased value. Total headache. Hundreds of addresses churning every frame, half doing nothing when frozen, the other half crashing the game. Modern games don't store player stats as static variables at hardcoded addresses.

Staring at the cluttered interface, that old frustration rushed back. I opened Claude Web: *"Cheat Engine is giving me a headache. What else is there?"*

Claude suggested CE tips first. I pushed back: *"Give me real tools."* It listed Ghidra, x64dbg, ReClass.NET. I knew of Ghidra, but assumed static analysis on a commercial game binary was reserved for security researchers. Claude's response was simple: *why not just load it and look?*

---

## The RTTI Goldmine

I pulled `SDHDShip.exe` into Ghidra (base `0x140000000`) and ran auto-analysis. When it finished, I hit a jackpot: **C++ Run-Time Type Information (RTTI) was unstripped.**

The symbol tree laid out the internal vocabulary of United Front Games' engine: class names, tasks, event loops, type descriptors. 

My mental model of game engines had been totally wrong. I had imagined a tangle of overloaded virtual functions and unique player structs. Instead, it was a clean **Entity-Component System (ECS)**:
- Everything in the world is an Entity.
- Components attach to entities to hold state.
- Player and enemies share the exact same components.

There was no `PlayerHealth` class. Just a generic `HealthComponent` attached to Wei Shen and every Triad thug on the street. 

Suddenly, the Cheat Engine dead end made sense. If you freeze health or hook the component blindly, every enemy in the district becomes immortal.

It also demystified how AAA game modding actually works. I used to wonder how people built crazy trainer menus that spawn supercars or alter weather on command. I assumed modders were writing complex custom code. They aren't. AAA engines run on ECS and task dispatchers. The game already has an internal task or `SpawnCar` function sitting right there. Modders aren't inventing mechanics from scratch; they're just locating the engine's existing functions and calling them.

---

## Claude as the In-Flight Co-Pilot

Finding symbols was one thing; navigating Ghidra was another. I had no idea what buttons to press.

This is where Claude acted like a senior mentor sitting next to me, walking me through the UI:
- *"Look at the virtual table."*
- *"Right-click that function pointer and check the cross-references (XREFs)."*
- *"Rename this function right now so we don't lose our place."*

Following the trail, we landed on `GetLocalPlayer` (`FUN_140360930`), returning `DAT_14235c488`—the static local player entity pointer at `SDHDShip.exe+235C488`.

From there, component references led straight to the health setter: `Health_Set` (`FUN_14054d630` at `SDHDShip.exe+54D630`).

Raw Ghidra pseudocode is 80% pointer math and register spills. I pasted the decompiled function into Claude, and it mapped out the `HealthComponent` struct layout:
- `+0x28`: Owner `Entity` pointer
- `+0x54`: Current health (`float`)
- `+0x58`: Minimum health floor
- `+0x5C`: Maximum health (`float`)
- `+0x74`: `isDead` boolean flag
- `+0x79`: Floor-hit flag
- `+0x80`: Refill multiplier

Claude also saved me from two huge traps:
1. **Hit-detection is a rabbit hole.** Don't reverse physics raycasts, collision hulls, or damage matrices just to stay alive. Intercept the setter where final damage lands.
2. **Don't touch `+0x58` (min health floor).** `Health_Set` uses that to set floor flags (`+0x79`) and dispatch `EVT_ENTITY_DEATH` across the global event bus (`DAT_14235f740`). Patching struct fields directly in memory risks breaking knockout states, death animations, or cutscene scripts.

The clean fix: intercept `Health_Set(hc, int value, ...)` at the front gate, verify `[rcx+0x28]` matches the local player entity, and clamp the incoming `edx` argument before the engine touches it.

---

## The Hook

With the injection point identified (`SDHDShip.exe+54D630`), I went back to Cheat Engine—not to scan for values, but to write an AOB injection hook:

```ini
{ Game   : SDHDShip.exe
  Author : siddh
  Hook   : Clamp Player Health to 30%
}

[ENABLE]

aobscanmodule(INJECT,SDHDShip.exe,40 57 48 83 EC 40 48 C7 44 24 20 FE FF FF FF 48 89 5C 24 58 48 89 74 24 60 0F 29 74 24 30 48 8B D9)
alloc(newmem,$1000,INJECT)

label(code)
label(return)
label(floorPct)

newmem:
  mov rax,[SDHDShip.exe+235C488]   // load local player entity pointer
  cmp [rcx+28],rax                 // does this HealthComponent belong to the player?
  jne code                         // no → skip, let enemies take full damage
  movss xmm0,[rcx+5C]              // load maxHealth (float)
  mulss xmm0,[floorPct]            // xmm0 = maxHealth * 0.30
  cvttss2si eax,xmm0               // convert float to int (matches edx)
  cmp edx,eax                      // is incoming health below 30%?
  jge code                         // no → leave it alone
  mov edx,eax                      // yes → clamp edx to 30%
code:
  push rdi
  sub rsp,40
  jmp return

floorPct:
  dd (float)0.3

INJECT:
  jmp newmem
  nop
return:
registersymbol(INJECT)

[DISABLE]

INJECT:
  db 40 57 48 83 EC 40

unregistersymbol(INJECT)
dealloc(newmem)
```

The mechanics:
- **`cmp [rcx+28], rax`**: Compares the component's parent entity against the local player pointer at `SDHDShip.exe+235C488`. Without this, enemies inherit the floor too.
- **Float/Int Boundary**: The incoming health argument in `edx` is an integer, but `maxHealth` at `[rcx+5C]` is a float. We multiply the float by 0.3 in `xmm0`, truncate to int in `eax` via `cvttss2si`, and compare with `edx`.
- If `edx < eax`, clamp `edx` to `eax`. Then jump back to the original function prologue (`push rdi; sub rsp, 40`).

I activated the script and jumped into a brawl with three cleaver-wielding thugs. My health dropped rapidly, hit roughly a third, and stopped. When I fought back, their health depleted normally. Worked on the first try.

---

## A Curious Person Can Be Curious Again

I still don't understand half of this stuff. Cheat Engine has dozens of sub-tools I've never touched. Dynamic analysis in x64dbg? Still have no idea how to run it. I'm literally watching YouTube videos right now just to learn how Ghidra docks windows and navigates memory graphs.

I'm late to Ghidra, but I finally made it through the front door.

I have immense respect for people who reverse engineer by hand. They have the eyes. They have the battle scars. They can look at an unstripped void of raw bytes and immediately know where to look because they spent years earning that instinct.

For people like me, we never had that mentor. We were just alone in a room staring at disassembler dumps with no idea where to start, which is why I walked away two years ago.

Claude didn't do the thinking for me. But it acted like that mentor: *"open the vtable"*, *"check this xref"*, *"rename this function"*, *"look at offset 0x28"*. 

To be honest, it's a library with ridiculously good pattern matching. It knows compiler idioms, knows where to search, and gives you a fighting chance to build a mental model.

The barrier to entry didn't just get lowered; it got dismantled. A curious person can actually afford to be curious again.
