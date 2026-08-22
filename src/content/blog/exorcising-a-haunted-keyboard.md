---
title: "Exorcising a Haunted Keyboard"
description: "My laptop keyboard ghost-types the delete key, so I tear it apart to unplug it, learn the power button lives there too, and disable it via the registry instead."
date: "Aug 22, 2026"
tags: ["Hardware", "Windows"]
---

I wanted to back up some data. That's it. That was the whole plan for the evening. So I open my laptop, and everything's going fine until an old friend shows back up: ghost typing. _Sigh._

Not just any key either. The delete key. Out of nowhere, ten-odd dialog windows pop open, each one cheerfully informing me it's deleting these files, because apparently my keyboard has decided today's the day to speedrun destroying my filesystem. The irony.

This isn't a software problem, and it isn't really a hardware problem either — it's some cursed in-between where the keyboard controller itself has opinions. It just starts firing the same keystroke over and over, no input from me, and won't stop until I physically press that key myself. Sometimes mashing other keys interrupts it, sometimes it doesn't care. And which key gets chosen to haunt me is random — one day it's the volume-up hotkey, one day it's F3. For now it's settled on delete — maybe I banged it too hard last time — which I suppose I should be grateful for, since at least it's consistent about it.

Naturally, being the long-term visionary that I am, my solution was: remove the keyboard. Physically. From the laptop. So I crack open the case.

My laptop's an ASUS ROG Strix GL503GE, a name that already sounds like a cry for help. I see a fat ribbon cable coming out of the keyboard and disappearing into the motherboard, so naturally I assume it connects somewhere on the back — a very bad assumption. Before that assumption gets tested, I've already gone full surgeon mode: unscrew everything, pull the heatsink, pull the fans, disconnect every peripheral in sight. Then I flip the board over and discover the ribbon was folded over and coming in from the front the whole time. Cool. Great. Love that for me. Mildly seething, I reapply thermal paste like a responsible adult and screw everything back together.

Then I unplug the ribbon. Except there are two — one for the RGB backlight, one for the actual keyboard. I unplug both, feeling very pleased with myself, and pack the laptop back up.

Time to power it on. I press the power button. Nothing. I plug in the charger. Still nothing. I stand there like an idiot wondering why my laptop has apparently died, until it hits me: the power button lives on the keyboard. Why. Why would you do that.

So, back in I go, unscrew everything again, plug the ribbon back in, and it powers on. Phew. But now I've got a new problem — I didn't want the keyboard generating interrupts at all, since that's apparently costing me CPU cycles for no reason. Some PCs have a BIOS setting for "turn on when power is restored," which would let me just skip the power button entirely. I go looking for it in this thing. As expected: not there. Another door closes.

So the hardware route is dead for now, until I get some tape and start isolating individual wires in that ribbon — skip the power ones, tape off the rest. Except I have no idea which wire is which, and I'm not about to guess my way through that with a multimeter tonight.

Onto software, then. Fine, I'll eat a little cost, let's just disable the keyboard in Windows. Except it turns out this isn't a PS/2 keyboard, it's HID, so the classic `sc config i8042prt start= disabled` trick does absolutely nothing. I could disable the HID service wholesale, except that also takes down USB, which is a bit of a nuclear option for "stop the delete key from firing itself."

Uninstalling the device from Device Manager works — for about five seconds, until a rescan or reboot brings it right back like nothing happened. Swapping drivers doesn't help either; it just keeps working regardless.

Group Policy has an option to disable it properly, except that's not available on Windows Home. Fortunately, the registry is always willing to pick up the slack — you can block a driver from ever installing for a specific Hardware ID. So I did that.

Keyboard: finally, actually disabled. Except the hotkeys still work, which means they're routed through some other mechanism entirely that I have yet to identify.

But fundamentally — why is the power button wired through the keyboard in the first place? That's just bad design. And why is disabling an internal keyboard this much of an ordeal? It should be a checkbox, not a small research project.
