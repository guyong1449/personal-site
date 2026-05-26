# Personal Site Agent Guide

## Purpose

This repository is the public publishing path for a personal site.

The system is not a generic blog starter. It is a contract-driven pipeline:

```text
Obsidian Vault
  -> tools/publisher
  -> content/public
  -> apps/web
  -> Vercel
```

Any implementation work in this repo must preserve that boundary.

---

## Canonical Architecture

### 1. Authoring Layer

Source content lives in an Obsidian Vault outside this repository.

This repo must not make the frontend read the Vault directly.

### 2. Publisher Layer

`tools/publisher` is the only adaptation layer between private authoring content and public site content.

It is responsible for:

- scanning configured Vault scopes
- parsing frontmatter
- filtering publishable entries
- resolving and copying assets
- rewriting Obsidian internal links to site routes
- exporting public markdown, metadata, and social drafts

Do not move these responsibilities into `apps/web`.

### 3. Public Snapshot Layer

`content/public` is the frontend-facing content boundary.

It contains:

- `notes/`
- `courses/`
- `gallery/`
- `assets/`
- `metadata/`
- `social/`

Treat this directory as generated output. Do not hand-edit exported documents as a normal workflow.

### 4. Frontend Layer

`apps/web` is the deployable site app.

Current state:

- Astro preview app

Target state:

- Next.js 15 App Router app

Its job is to consume the generated snapshot only:

- list pages read `content/public/metadata/*.json`
- detail pages read `content/public/{notes|courses|gallery}/*.md`
- assets are served from exported `/assets/*`

### 5. Deployment Layer

Vercel deploys the frontend app after content has already been exported into `content/public`.

The deployment target should not need direct Vault access or a database for the current scope.

---

## Migration Target

The current migration target is:

- replace Astro with Next.js 15 App Router
- preserve publisher contract
- preserve route families:
  - `/notes/[slug]`
  - `/courses/[slug]`
  - `/gallery/[slug]`
- keep metadata JSON as list-page source of truth
- keep exported markdown as detail-page source of truth

The reference repo `guangzhengli/nextjs-blog-template` is a UI and App Router reference only.

Do not blindly copy its blog-only information architecture.

---

## Target Next.js Runtime Split

### A. Site Shell

Purpose:

- global layout
- global metadata
- typography, theme, navigation, footer

Expected files:

- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/components/header/*`
- `apps/web/src/lib/config.ts`

### B. Content Adapter

Purpose:

- provide the only frontend read interface to `content/public`
- normalize metadata and markdown into typed runtime models
- expose list and detail loaders

Expected files:

- `apps/web/src/lib/content/types.ts`
- `apps/web/src/lib/content/paths.ts`
- `apps/web/src/lib/content/index.ts`
- `apps/web/src/lib/content/load-index.ts`
- `apps/web/src/lib/content/load-entry.ts`
- `apps/web/src/lib/content/normalize.ts`

### C. Markdown Rendering

Purpose:

- render exported markdown consistently
- support GFM, code blocks, math, heading ids, TOC
- handle exporter-produced inline HTML safely

Expected files:

- `apps/web/src/components/markdown/*`
- `apps/web/src/lib/markdown/pipeline.ts`
- `apps/web/src/lib/toc.ts`

### D. Route Pages

Purpose:

- home aggregation page
- domain list pages
- domain detail pages
- 404 handling

Expected files:

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/notes/*`
- `apps/web/src/app/courses/*`
- `apps/web/src/app/gallery/*`
- `apps/web/src/app/not-found.tsx`

### E. Secondary Outputs

Purpose:

- sitemap
- robots
- feeds
- comments

Expected files:

- `apps/web/src/app/sitemap.ts`
- `apps/web/src/app/robots.ts`
- `apps/web/scripts/generate-rss.js`
- `apps/web/src/components/giscus-comments.tsx`

---

## Rules For Implementation

### Scope Rules

- keep changes small and reviewable
- do not change publisher output shape unless a contract update is explicitly requested
- do not invent a second source of truth for content indexing
- do not collapse all content into a single `/blog` route family

### Frontend Rules

- prefer a markdown-first rendering pipeline over MDX-first assumptions
- keep route prefixes aligned with publisher rewriting logic
- if static assets must be copied into `apps/web/public`, treat that as packaging only

### Testing Rules

- publisher tests validate export behavior
- web tests should validate consumption behavior only
- each migration phase should end with the fastest relevant build or test check

### Git Rules

- ignore local build and dev artifacts such as `.astro/` and dev logs
- do not commit secrets or machine-local config

---

## Phase Purposes

### Phase 0: Contract Freeze

Purpose:

- lock in what the frontend is allowed to consume
- prevent migration work from leaking into publisher redesign

### Phase 1: Next.js Shell Bootstrap

Purpose:

- replace the Astro runtime shell with a minimal Next.js 15 app
- establish TypeScript, linting, styling, and app router entry points
- prove the new app can boot and build before content integration starts

Primary output:

- a static Next app with layout, globals, and placeholder home page

### Phase 2: Typed Content Adapter

Purpose:

- rebuild current Astro content-loading behavior in a typed, reusable Next-compatible layer
- make lists and detail pages consume generated content through one internal API

Primary output:

- typed loaders for metadata indexes and markdown documents across notes, courses, and gallery

### Phase 3: Route Migration

Purpose:

- replace Astro pages with Next route pages using the adapter

### Phase 4: Markdown Presentation

Purpose:

- improve rendering quality and add TOC-capable markdown processing

### Phase 5: Template UI Port

Purpose:

- port the reference template's layout and interaction strengths without importing its blog assumptions

### Phase 6: SEO And Feeds

Purpose:

- add sitemap, robots, metadata, RSS/feed generation, and comments

### Phase 7: Packaging And Cleanup

Purpose:

- remove Astro leftovers and make deployment deterministic

---

## Working Commands

- Export content: `pnpm --dir tools/publisher export -- --config <config-path>`
- Test publisher: `pnpm --dir tools/publisher test`
- Run web app: `pnpm --dir apps/web dev`
- Build web app: `pnpm --dir apps/web build`

If `pnpm` is unavailable on the current machine, validate the local package manager before continuing and switch to a working equivalent rather than blocking on tooling preference.

---

## Documents To Read Before Editing

- `docs/plan-nextjs-migration.md`
- `docs/architecture/runtime-overview.md`
- `docs/architecture/publisher-flow.md`
- `docs/contracts/export-schema.md`
- `docs/contracts/content-frontmatter.md`
- `tools/publisher/src/index.js`

For the current migration, `docs/plan-nextjs-migration.md` is the implementation-level north star and this `agent.md` is the repo entry summary.
