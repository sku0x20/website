# Current Website — Notes

## What It Is

Terminal emulator website. Green-on-black (#00ff41 on #0d1117). Particle/node background canvas. Matrix easter egg.

Two modes:
1. **Terminal mode** — type commands (help, ls, cd, cat, alias, date, clear, banner, matrix)
2. **GUI mode** — file browser grid with folders/files. Auto-switches on mobile (≤768px).

Content lives in a JS `fileSystem` object:
- `about.txt` — skills/stack blurb
- `projects/` — directory of project descriptions with GitHub links
- `matrix` — binary file that triggers the matrix animation

## What's Good

- Aesthetic is strong and on-brand for a systems engineer
- Interactive, memorable, different from standard portfolio sites
- Mobile fallback (GUI mode)
- Particle background adds depth without being distracting

## What's Outdated/Missing

- `about.txt` content is stale (mentions Node/Deno/Bun as polyglot, doesn't reflect current focus)
- Projects list is incomplete — missing stopgap (biggest project), hrh, avoid, assertgo, c_oop
- No resume link or resume page integration in the terminal
- No blog/writing section (eGlu.tech exists but not linked)
- `resume.html` exists separately but isn't linked from the terminal
- The professional identity in the site ("Cloud Infrastructure & Backend Architect") doesn't match the resume framing

## Resume (resume.md / resume.html)

Solid content. Key sections:
- Professional Summary (4 yrs, sole lead, ClickHouse 95% reduction, seeking team/mentorship)
- Experience at WiZNSystems with subsections: Cross-functional, Infra/DevOps, Backend/Perf, Independent Leadership
- Key Projects & Open Source
- Technical Skills
- Education & Technical Bibliography (reads: POEAA, GOOS, DDIA, Clean Code, etc.)

What's missing from resume that's real:
- stopgap published to Maven Central (big credibility signal)
- hrh (Rust, practical DevOps tool)
- avoid (custom Linux distro — shows deep Linux)
- assertgo (newer, cleaner assertG with generics)
- eGlu.tech (technical writing)
- c_oop (shows fundamentals depth)
- virtualization work (QEMU, Packer)
