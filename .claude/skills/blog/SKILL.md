---
name: blog
description: Draft or revise a post for sku20.dev — from a voice memo, notes, or an existing draft. Use when the user says "new blog", "write a post", "transcribe this for the blog", or hands over an audio file for a post.
---

# sku20.dev blog post

Pair-programming style: discuss before drafting, short back-and-forth.

## 1. Get the raw material

- Audio file → transcribe locally:
  ```
  uvx parakeet-mlx <file> --output-format txt --output-dir <scratchpad>/transcript
  ```
  Parakeet handles the user's Indian English fine. "Cloud" in a transcript usually means "Claude" — the user is talking to you, often asking you to fill a word or detail.
- Read 2–3 recent posts in `src/content/blog/` to match voice and frontmatter.

## 2. Ground every claim before drafting

The user speaks from memory; memory drifts. Before writing a technical claim, find the source:

- Gists: `gh gist list`, `gh gist view <id> -f <file> --raw` (many are secret — never link or paste them whole).
- Work code: `~/workspace/projects/` (e.g. `rpcbackend`). Read the actual code path, don't trust the recap.
- Numbers: cross-check `context/*.md` (profile, linkedin, work-eglu). If sources disagree, ask which is right.

Then list for the user: outline, conflicts found, and open questions. Wait for answers.

## 3. Draft

- File: `src/content/blog/YYYY-MM-DD-<slugified-title>.md`. Rename if the title changes.
- Frontmatter: `title`, `description`, `date: "Mon DD, YYYY"`, `tags: [...]`.
- Voice: first person singular ("I"), sassy and jabby, battle scars and exact mechanics over tutorial fluff. No stock closers reused from other posts.
- Privacy: no employer name next to criticism, look-alike schemas (main columns only), no secret gist links.
- Hedge what isn't known ("presumably"), don't invent fleet sizes or scale numbers.

Commit locally after the draft. Never push without asking — pushing publishes.

## 4. Review

Run the `writing-for-developer` skill on the draft (Facts / Focus / Flow, pattern checklist, human-voice check). Also:

- Em dashes: keep them sparse.
- Check every link resolves.
- Report findings as a list with line refs; ask before applying anything that changes meaning.
