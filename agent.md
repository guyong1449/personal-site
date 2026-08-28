# Personal Site Agent Guide

## Purpose

This repository publishes the personal site `GUYONG` (`guyong.site`). It is a
contract-driven pipeline, not a generic blog starter:

```text
.local-content (drafts, gitignored)
  -> Studio publish flow
content/site (canonical, git-tracked)
  -> tools/site-builder
content/public (generated snapshot)
  -> apps/web
  -> Vercel
```

Legacy path: Obsidian Vault -> tools/publisher -> content/public. The Studio is
now the primary authoring surface; `tools/publisher` is kept for reference and
must not be treated as the source of truth.

---

## Canonical Architecture

### 1. Draft Layer

`.local-content/notes|gallery|assets` holds machine-local drafts. Gitignored.
Original files outside the repo (e.g. Obsidian notes) are never modified by
any tool in this repository; import copies content in and re-importing the
same slug requires explicit confirmation.

### 2. Canonical Layer

`content/site/notes|gallery|assets` is the single maintenance source for
published content and is git-tracked. Edits happen through the Studio publish
flow (or by hand followed by `pnpm build:content`).

### 3. Generated Snapshot Layer

`content/public` is produced only by `tools/site-builder`:

- validated frontmatter, stable slugs, recency-ordered metadata
- `metadata/notes.json`, `metadata/gallery.json`, `metadata/search.json`
- markdown normalized under `notes/` and `gallery/`, assets copied

Treat this directory as generated output. The web app reads nothing else.

### 4. Frontend Layer

`apps/web` is the deployable Next.js 15 App Router app.

- lists read `content/public/metadata/*.json` via `src/lib/content`
- detail pages read the exported markdown
- content model: text content is `content_type: note` (course context lives in
  tags such as `course/CS308`); gallery stays a separate kind
- public routes: `/`, `/notes`, `/gallery`, `/account`, `/search`, detail
  routes, sitemap/RSS/robots
- `/studio` exists only in dev (rewrite to the local Studio); production
  returns 404

### 5. Studio Layer

`tools/studio` runs standalone on `127.0.0.1:4319` only. Write APIs reject
non-local origins. It owns drafts, import, publish, unpublish, and permanent
deletion (title-confirmed, draft-only, exclusive assets reclaimed).

### 6. Deployment Layer

Vercel deploys `apps/web` after content is exported into `content/public`
(rebuilt during `prebuild`). Publishing commits only content pathspecs
(`content/site`, `content/public/metadata`, `apps/web/public/feed.xml`) with
`content: publish|unpublish <slug>` messages; never `git add .` / `-A`.

---

## Visual Contract (lead-snow-cyan, 2026-08)

- Palette ratio 主:辅:重 = 7:2:1 — pale cyan-white surfaces, slate/steel text
  and structure, bright teal accents only
- Square corners, no soft shadows, compact vertical rhythm
- Quicksand for Latin, system CJK stack for Chinese
- Selected-page state lives in the thin footer nav, not the header
- Previous flat style preserved on `backup/style-v1-flat`

---

## Rules For Implementation

- keep changes small and reviewable; one batch per commit
- every batch ends with lint, `tsc --noEmit`, vitest, and `next build`
- do not stage unrelated user changes with content commits
- do not edit `content/public` by hand
- do not deploy to production without an explicit user request

## Working Commands

- `pnpm dev:web` / `pnpm build:web` / `pnpm lint:web` / `pnpm test:web`
- `pnpm studio` (local only)
- `pnpm build:content` / `pnpm test:content`
- `corepack pnpm` if the global pnpm shim is broken (Windows/conda PATH issue)
