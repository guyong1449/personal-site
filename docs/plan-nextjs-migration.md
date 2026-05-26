# Personal Site Next.js Migration Reassessment

> Reference UI/template baseline: [guangzhengli/nextjs-blog-template](https://github.com/guangzhengli/nextjs-blog-template)
> Goal: replace the Astro preview app with a Next.js 15 App Router site without breaking the existing publisher contract.

---

## 1. Reassessment Summary

The previous migration plan had the right direction on framework choice, but it treated the reference repo as a direct blog template migration. That is not the architecture of this repository.

The real shape of this repo is:

```text
Obsidian Vault
  -> tools/publisher
  -> content/public
  -> apps/web
  -> Vercel
```

That means the migration target is not "build a Next.js blog from markdown source". It is "build a Next.js runtime that consumes a generated public snapshot".

### 1.1 What Must Stay

- `tools/publisher` remains the only adaptation layer between Obsidian and the site.
- `content/public` remains the site-facing boundary.
- frontend must consume generated markdown, assets, and metadata only.
- route prefixes must stay aligned with publisher output:
  - `/notes/:slug`
  - `/courses/:slug`
  - `/gallery/:slug`

### 1.2 What Should Change From the Old Plan

#### Change 1: do not collapse everything into `/blog`

The reference template is blog-centric, but this repo is not. Publisher already exports three content domains:

- `notes`
- `courses`
- `gallery`

Its internal-link rewriting also resolves to `/${directoryName}/${slug}`. If the new frontend rewrites everything into `/blog/[...slug]`, it breaks the contract already encoded in the exporter.

#### Change 2: do not make Content Collections the primary index

The old plan proposed Content Collections as the main content discovery mechanism. That creates a second indexing system on top of metadata JSON that the publisher already emits.

For this repo, the better split is:

- list pages read `content/public/metadata/*.json`
- detail pages read `content/public/{notes|courses|gallery}/*.md`

This keeps the generated snapshot as the single public source of truth and avoids duplicating publisher responsibilities in the frontend.

#### Change 3: do not force MDX-first architecture

Publisher exports `.md`, not `.mdx`. It may also emit raw HTML such as sized `<img>` tags when converting Obsidian embeds. A markdown-first rendering pipeline is the correct default. MDX support can be added later only if authoring requirements change.

#### Change 4: treat the template as a UI/reference donor, not an architecture donor

The template is still useful for:

- App Router structure
- `layout.tsx`, `robots.ts`, `sitemap.ts`
- header, TOC, comments, social icons
- design tokens and MDX/markdown presentation
- feed generation scripts

But its content topology should not be copied verbatim.

### 1.3 Recommended Architectural Direction

Use Next.js 15 App Router for the runtime shell, but keep a lightweight filesystem adapter inside `apps/web` that reads the generated snapshot directly.

In short:

- borrow the template's UI shell
- keep this repo's exporter boundary
- add a typed content adapter layer inside the Next app
- phase features by contract-criticality, not by template completeness

---

## 2. Current Repo Constraints

### 2.1 Current App Surface

Current Astro consumer is intentionally thin:

- `src/pages/index.astro` reads `metadata/notes.json`
- `src/pages/notes/[slug].astro` reads one markdown file from `content/public/notes`
- `src/lib/content.js` resolves repo-relative paths and parses simple frontmatter

This proves the intended runtime model already works: frontend consumes generated content only.

### 2.2 Publisher Contract That The New Frontend Must Respect

`tools/publisher/src/index.js` currently guarantees:

- exported markdown directories:
  - `content/public/notes`
  - `content/public/courses`
  - `content/public/gallery`
- generated metadata indexes:
  - `content/public/metadata/notes.json`
  - `content/public/metadata/courses.json`
  - `content/public/metadata/gallery.json`
- static assets under `content/public/assets`
- social drafts under `content/public/social/*`
- internal Obsidian links rewritten to stable site routes
- relative embeds and cover assets copied into `/assets/...`

### 2.3 Practical Implication

The new web app should not re-derive content classification from markdown when publisher already exported it. It should only:

- read indexes
- read detail documents
- render them consistently
- add presentation and site features around that boundary

---

## 3. Reference Template Mapping

### 3.1 Keep As-Is Or Near As-Is

These parts map well from the template:

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/not-found.tsx`
- `src/app/robots.ts`
- `src/app/sitemap.ts`
- `src/components/header/*`
- `src/components/toc.tsx`
- `src/components/giscus-comments.tsx`
- `src/components/go-to-top.tsx`
- `src/components/icons/*`
- `src/components/ui/*`
- `src/lib/config.ts`
- `src/lib/utils.ts`
- `scripts/generate-rss.js`
- `scripts/generate-sitemap.js`

### 3.2 Adapt Instead Of Copy

These parts need repository-specific adaptation:

- `content-collections.ts`
  - either remove entirely
  - or reduce to a thin optional helper, not the primary content source
- `src/app/blog/page.tsx`
  - replace with domain-aware listing routes
- `src/app/blog/[...slug]/page.tsx`
  - replace with explicit content-type routes
- `src/components/mdx-components.tsx`
  - keep the idea, but implement for markdown rendering pipeline and exported HTML edge cases

### 3.3 Do Not Inherit Blindly

- blog-only IA
- assumption that all content lives in `src/content/blog`
- assumption that `.md` should become `.mdx`
- assumption that feed generation only covers blog posts

---

## 4. Target Architecture

## 4.1 Runtime Layers

```text
apps/web
  -> app router pages and layouts
  -> presentation components
  -> content adapter layer
  -> generated snapshot under ../../content/public
```

Recommended split:

### Layer A: Site Shell

Responsibility:

- global layout
- typography and theme
- header and nav
- footer and social links
- metadata defaults

Files:

- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/components/header/*`
- `apps/web/src/lib/config.ts`

### Layer B: Content Adapter

Responsibility:

- locate `content/public`
- read metadata indexes
- read detail markdown
- normalize frontmatter and metadata into typed runtime models
- expose route-safe helpers for `generateStaticParams`, lists, and detail pages

Files:

- `apps/web/src/lib/content/types.ts`
- `apps/web/src/lib/content/paths.ts`
- `apps/web/src/lib/content/index.ts`
- `apps/web/src/lib/content/load-index.ts`
- `apps/web/src/lib/content/load-entry.ts`
- `apps/web/src/lib/content/normalize.ts`

This layer is the most important addition. It replaces the current `src/lib/content.js` with a typed, domain-aware contract adapter.

### Layer C: Markdown Rendering

Responsibility:

- render markdown body
- support GFM
- support math if needed
- support syntax highlighting
- support heading ids for TOC
- safely handle exporter-produced inline HTML

Files:

- `apps/web/src/components/markdown/markdown-body.tsx`
- `apps/web/src/components/markdown/markdown-components.tsx`
- `apps/web/src/lib/markdown/pipeline.ts`
- `apps/web/src/lib/toc.ts`

Recommended default stack:

- `react-markdown`
- `remark-gfm`
- `remark-math`
- `rehype-katex`
- `rehype-highlight`
- `rehype-slug`
- `rehype-raw`

Use `rehype-raw` only because exporter already emits controlled HTML. If untrusted content becomes possible later, add sanitization before expanding scope.

### Layer D: Route Pages

Responsibility:

- home aggregation
- per-domain list pages
- per-domain detail pages
- 404 handling

Files:

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/notes/page.tsx`
- `apps/web/src/app/notes/[slug]/page.tsx`
- `apps/web/src/app/courses/page.tsx`
- `apps/web/src/app/courses/[slug]/page.tsx`
- `apps/web/src/app/gallery/page.tsx`
- `apps/web/src/app/gallery/[slug]/page.tsx`
- `apps/web/src/app/not-found.tsx`

### Layer E: Secondary Outputs

Responsibility:

- sitemap
- robots
- feeds
- social metadata

Files:

- `apps/web/src/app/sitemap.ts`
- `apps/web/src/app/robots.ts`
- `apps/web/scripts/generate-rss.js`

---

## 4.2 Domain Model

Use explicit content domains rather than a generic blog post abstraction.

```ts
type ContentKind = "notes" | "courses" | "gallery";

type ContentListItem = {
  kind: ContentKind;
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  cover: string | null;
  updated: string | null;
  course?: string | null;
  week?: string | null;
  artCategory?: string | null;
  series?: string | null;
};

type ContentDocument = ContentListItem & {
  body: string;
  created?: string | null;
  contentType?: string | null;
};
```

Two important decisions:

1. `kind` should be injected by the frontend adapter based on source directory or metadata file, not inferred from markdown frontmatter alone.
2. the frontend runtime model should preserve publisher-specific optional fields instead of flattening everything into a blog schema.

---

## 4.3 Route Information Architecture

Recommended public routes:

```text
/
/notes
/notes/[slug]
/courses
/courses/[slug]
/gallery
/gallery/[slug]
```

Home page should aggregate across domains, not replace domain pages.

Suggested home composition:

- hero / author intro
- featured latest notes
- featured course content
- featured gallery items
- quick links to all sections

This keeps parity with the template's strong landing page while respecting your multi-domain content shape.

---

## 4.4 Asset Strategy

Do not copy generated assets into `apps/web/public/assets` as a primary plan.

That would create two public copies:

- `content/public/assets`
- `apps/web/public/assets`

Recommended approach:

- keep `content/public/assets` as the single generated asset directory
- expose it in Next via a build-time sync step only if Next cannot serve it directly in the final deployment shape

Preferred implementation:

1. first attempt: configure the app so build/runtime reads assets from the generated snapshot path used during deploy packaging
2. fallback: add a deterministic prebuild sync script:
   - source: `content/public/assets`
   - target: `apps/web/public/assets`

If fallback is used, treat it as a packaging step, not as a second authoring boundary.

---

## 5. File-Level Decomposition

## 5.1 Replace

- `apps/web/package.json`
- `apps/web/src/lib/content.js`
- `apps/web/src/pages/index.astro`
- `apps/web/src/pages/notes/[slug].astro`
- `apps/web/astro.config.mjs`

## 5.2 Create

- `apps/web/next.config.ts`
- `apps/web/tsconfig.json`
- `apps/web/postcss.config.mjs`
- `apps/web/eslint.config.mjs`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/not-found.tsx`
- `apps/web/src/app/robots.ts`
- `apps/web/src/app/sitemap.ts`
- `apps/web/src/app/notes/page.tsx`
- `apps/web/src/app/notes/[slug]/page.tsx`
- `apps/web/src/app/courses/page.tsx`
- `apps/web/src/app/courses/[slug]/page.tsx`
- `apps/web/src/app/gallery/page.tsx`
- `apps/web/src/app/gallery/[slug]/page.tsx`
- `apps/web/src/components/header/index.tsx`
- `apps/web/src/components/header/nav-data.ts`
- `apps/web/src/components/header/nav-desktop-menu.tsx`
- `apps/web/src/components/header/nav-mobile-menu.tsx`
- `apps/web/src/components/markdown/markdown-body.tsx`
- `apps/web/src/components/markdown/markdown-components.tsx`
- `apps/web/src/components/toc.tsx`
- `apps/web/src/components/giscus-comments.tsx`
- `apps/web/src/components/go-to-top.tsx`
- `apps/web/src/components/icons/github.tsx`
- `apps/web/src/components/icons/x.tsx`
- `apps/web/src/components/icons/xiaohongshu.tsx`
- `apps/web/src/components/ui/button.tsx`
- `apps/web/src/components/ui/collapsible.tsx`
- `apps/web/src/components/ui/navigation-menu.tsx`
- `apps/web/src/components/ui/sheet.tsx`
- `apps/web/src/lib/config.ts`
- `apps/web/src/lib/utils.ts`
- `apps/web/src/lib/content/types.ts`
- `apps/web/src/lib/content/paths.ts`
- `apps/web/src/lib/content/index.ts`
- `apps/web/src/lib/content/load-index.ts`
- `apps/web/src/lib/content/load-entry.ts`
- `apps/web/src/lib/content/normalize.ts`
- `apps/web/src/lib/markdown/pipeline.ts`
- `apps/web/src/lib/toc.ts`
- `apps/web/scripts/generate-rss.js`
- `apps/web/scripts/sync-public-assets.mjs`

## 5.3 Keep Unchanged Or Nearly Unchanged

- `tools/publisher/**`
- `content/public/**`
- repo root `package.json`
- `pnpm-workspace.yaml`

Only adjust root scripts if the Next app needs new command names.

---

## 6. Implementation Phases

## Phase 0: Contract Freeze

Goal:

- confirm the frontend will consume `content/public` exactly as generated now
- avoid accidental publisher scope creep during the migration

Actions:

- keep `tools/publisher` untouched
- document route preservation
- document metadata JSON as primary list source

Exit criteria:

- migration doc reflects multi-domain contract
- no plan item requires changing publisher output shape

## Phase 1: Next.js Shell Bootstrap

Goal:

- replace Astro runtime with a booting Next.js 15 app

Files:

- `apps/web/package.json`
- `apps/web/next.config.ts`
- `apps/web/tsconfig.json`
- `apps/web/postcss.config.mjs`
- `apps/web/eslint.config.mjs`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/globals.css`

Notes:

- this phase should produce a static home page with placeholder content only
- no content integration yet

Exit criteria:

- `pnpm --dir apps/web dev` runs
- `pnpm --dir apps/web build` passes

## Phase 2: Typed Content Adapter

Goal:

- re-establish feature parity with current Astro reader, but in a reusable typed layer

Files:

- `apps/web/src/lib/content/*`

Responsibilities:

- resolve repo root relative to app root
- load metadata indexes by kind
- load markdown document by kind + slug
- parse frontmatter
- normalize optional fields
- sort and filter consistently

Exit criteria:

- adapter can load notes index and note detail
- adapter API is generic enough for courses and gallery

## Phase 3: Route Migration

Goal:

- replace current Astro pages with Next App Router pages using the adapter

Files:

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/notes/page.tsx`
- `apps/web/src/app/notes/[slug]/page.tsx`
- `apps/web/src/app/courses/page.tsx`
- `apps/web/src/app/courses/[slug]/page.tsx`
- `apps/web/src/app/gallery/page.tsx`
- `apps/web/src/app/gallery/[slug]/page.tsx`
- `apps/web/src/app/not-found.tsx`

Notes:

- start with notes to match current behavior
- then add courses and gallery without changing adapter contract

Exit criteria:

- all generated note routes build statically
- missing content resolves to `not-found`
- route prefixes match publisher expectations

## Phase 4: Markdown Presentation Layer

Goal:

- restore and then improve content rendering quality

Files:

- `apps/web/src/components/markdown/*`
- `apps/web/src/lib/markdown/pipeline.ts`
- `apps/web/src/lib/toc.ts`
- `apps/web/src/components/toc.tsx`

Features:

- GFM
- heading anchors
- syntax highlighting
- math rendering
- image handling
- TOC extraction

Exit criteria:

- existing exported note renders correctly
- exporter-produced `<img>` embeds render safely
- TOC data can drive desktop sidebar

## Phase 5: Template UI Port

Goal:

- port the template's stronger shell and interaction components without importing its blog assumptions

Files:

- `apps/web/src/components/header/*`
- `apps/web/src/components/ui/*`
- `apps/web/src/components/icons/*`
- `apps/web/src/components/go-to-top.tsx`
- `apps/web/src/lib/config.ts`
- `apps/web/src/lib/utils.ts`

Notes:

- nav labels should reflect notes/courses/gallery
- home page sections should aggregate by domain

Exit criteria:

- responsive navigation works
- visual system no longer relies on inline CSS
- home page communicates domain structure clearly

## Phase 6: SEO, Feeds, Comments

Goal:

- add secondary site capabilities after the runtime is stable

Files:

- `apps/web/src/app/robots.ts`
- `apps/web/src/app/sitemap.ts`
- `apps/web/scripts/generate-rss.js`
- `apps/web/src/components/giscus-comments.tsx`

Notes:

- feed generation should decide explicitly whether it includes only notes or all textual domains
- comments should likely attach only to notes at first

Exit criteria:

- metadata, sitemap, and robots are generated
- feed scope is documented and deterministic

## Phase 7: Packaging And Cleanup

Goal:

- make the app deployable and remove Astro-specific leftovers

Files:

- `apps/web/scripts/sync-public-assets.mjs`
- root `package.json`
- `apps/web/package.json`
- remove Astro files once build parity is confirmed

Cleanup targets:

- `apps/web/astro.config.mjs`
- `apps/web/src/pages/**`
- obsolete Astro-only dependencies

Exit criteria:

- clean `pnpm --dir apps/web build`
- deploy packaging includes generated content and assets

---

## 7. Test And Verification Strategy

## 7.1 Fast Checks Per Phase

- Phase 1: `pnpm --dir apps/web build`
- Phase 2: unit tests for adapter path resolution and content loading
- Phase 3: static param generation and 404 behavior
- Phase 4: rendered snapshots for markdown edge cases
- Phase 5: responsive manual check
- Phase 6: verify generated `sitemap`, `robots`, and feeds

## 7.2 Recommended New Test Surface

Add tests inside `apps/web` for:

- loading metadata JSON per content kind
- loading markdown detail document
- rejecting unknown kind/slug
- preserving rewritten asset paths
- preserving rewritten internal links
- TOC extraction from headings

Publisher tests already cover export behavior. Web tests should cover only consumption behavior.

---

## 8. Key Risks

### Risk 1: Blog Template Overfitting

If implementation follows the reference repo too literally, the result will silently erase `courses` and `gallery` as first-class domains.

Mitigation:

- keep route prefixes explicit
- keep adapter API domain-aware

### Risk 2: Dual Source Of Truth

If the frontend uses both metadata JSON and a separate content collection index as peers, drift will eventually appear.

Mitigation:

- metadata JSON for lists
- markdown files for details
- optional collection tooling only as an internal helper, never as a competing source of truth

### Risk 3: Exported HTML Handling

Publisher may emit raw HTML image tags for sized embeds.

Mitigation:

- choose markdown renderer intentionally
- document controlled use of `rehype-raw`
- add rendering tests for actual exported samples

### Risk 4: Asset Packaging On Deploy

Next deployment must still expose `/assets/*` correctly.

Mitigation:

- test packaging locally before removing Astro
- keep asset sync as a deterministic prebuild fallback

---

## 9. Decision Record

### Final Recommendation

Migrate to Next.js 15, but do it as a contract-preserving frontend replacement, not as a template transplant.

### Concrete Decisions

1. Keep `tools/publisher` and `content/public` unchanged.
2. Preserve `/notes`, `/courses`, `/gallery` route families.
3. Use metadata JSON as list-page source of truth.
4. Use generated markdown files as detail-page source of truth.
5. Use a markdown-first renderer; do not force MDX-first architecture.
6. Treat `guangzhengli/nextjs-blog-template` as a UI and App Router reference, not as the content architecture.

### Suggested Next Implementation Order

1. bootstrap Next shell
2. build typed content adapter
3. migrate notes routes
4. generalize to courses and gallery
5. port template UI shell
6. add TOC, SEO, feeds, comments
7. remove Astro

