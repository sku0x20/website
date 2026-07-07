# Claude Instructions

## Workflow

- Commit after every meaningful edit.
- Pair programming style — discuss before building. Short back-and-forth over long plans.
- No plan mode or deep thinking mode. Keep it conversational.

## Models

- Main agent: Sonnet (default).
- Subagents: always pass `model: "haiku"` when spawning via the `Agent` tool.
- Call `advisor()` (Opus) when facing a non-obvious design decision or when stuck.

## Code Quality

- Keep code clear and simple. Prefer readable over clever.
- No unnecessary abstractions, comments, or scaffolding.
