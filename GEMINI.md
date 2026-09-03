# Gemini Instructions

## Workflow

- Commit after every meaningful edit.
- Pair programming style — discuss before building. Short back-and-forth over long plans.
- No plan mode or deep thinking mode. Keep it conversational.

## Models

- Main agent: Gemini (default).
- Subagents: pass `model: "flash"` when spawning via `invoke_subagent` for quick tasks or research.
- Use `pro` model when facing a non-obvious design decision or when stuck.

## Code Quality

- Keep code clear and simple. Prefer readable over clever.
- No unnecessary abstractions, comments, or scaffolding.

## Blog Posts

- Filename must be prefixed with its publication date (`YYYY-MM-DD-`) and match the slugified `title` in frontmatter (e.g., `2026-09-03-local-development-with-strapi.md`). If the title changes during editing, rename the file to match before considering the post done.
