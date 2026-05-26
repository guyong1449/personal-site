# Next.js Phase 1 And Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Astro shell in `apps/web` with a booting Next.js 15 app and add a typed content adapter that consumes `content/public` without changing the publisher contract.

**Architecture:** Phase 1 builds a minimal Next.js app shell with TypeScript, App Router, and global styling while keeping content integration out of scope. Phase 2 adds a domain-aware content adapter that loads metadata JSON and markdown detail documents from `content/public`, normalizes them into typed models, and exposes one internal API for future route pages.

**Tech Stack:** Next.js 15, React 19, TypeScript 5, Tailwind CSS 4, Node.js fs/path APIs, Vitest or Node test runner, react-markdown-ready content pipeline preparation.

---

## File Structure

### Modify

- `apps/web/package.json`
- `apps/web/README.md`
- `package.json`

### Delete

- `apps/web/astro.config.mjs`
- `apps/web/src/pages/index.astro`
- `apps/web/src/pages/notes/[slug].astro`
- `apps/web/src/lib/content.js`

### Create

- `apps/web/next.config.ts`
- `apps/web/tsconfig.json`
- `apps/web/postcss.config.mjs`
- `apps/web/eslint.config.mjs`
- `apps/web/next-env.d.ts`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/lib/config.ts`
- `apps/web/src/lib/utils.ts`
- `apps/web/src/lib/content/types.ts`
- `apps/web/src/lib/content/paths.ts`
- `apps/web/src/lib/content/frontmatter.ts`
- `apps/web/src/lib/content/load-index.ts`
- `apps/web/src/lib/content/load-entry.ts`
- `apps/web/src/lib/content/normalize.ts`
- `apps/web/src/lib/content/index.ts`
- `apps/web/src/lib/content/__tests__/load-index.test.ts`
- `apps/web/src/lib/content/__tests__/load-entry.test.ts`
- `apps/web/src/lib/content/__tests__/paths.test.ts`

### Phase 1 Ownership

- shell bootstrap only
- no domain routes beyond `/`
- no markdown rendering components yet

### Phase 2 Ownership

- content adapter only
- no TOC or presentation layer yet
- no SEO or feed work yet

---

### Task 1: Replace Astro Package Surface With Next.js Shell

**Files:**
- Modify: `apps/web/package.json`
- Modify: `package.json`
- Delete: `apps/web/astro.config.mjs`
- Delete: `apps/web/src/pages/index.astro`
- Delete: `apps/web/src/pages/notes/[slug].astro`
- Delete: `apps/web/src/lib/content.js`

- [ ] **Step 1: Update `apps/web/package.json` to a Next.js baseline**

Use this content:

```json
{
  "name": "web",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.3.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.7",
    "@types/node": "^22.15.30",
    "@types/react": "^19.1.6",
    "@types/react-dom": "^19.1.5",
    "eslint": "^9.28.0",
    "eslint-config-next": "^15.0.0",
    "tailwindcss": "^4.1.7",
    "typescript": "^5.8.3",
    "vitest": "^3.2.4"
  }
}
```

Purpose:

- remove Astro runtime dependency
- establish the package surface needed for Phase 1 and Phase 2 only

- [ ] **Step 2: Update root `package.json` scripts so repo-level commands still work**

Set the scripts block to:

```json
"scripts": {
  "dev:web": "pnpm --dir apps/web dev",
  "build:web": "pnpm --dir apps/web build",
  "lint:web": "pnpm --dir apps/web lint",
  "test:web": "pnpm --dir apps/web test",
  "export:content": "pnpm --dir tools/publisher export"
}
```

Purpose:

- preserve repo ergonomics after replacing Astro

- [ ] **Step 3: Remove Astro-only files from `apps/web`**

Delete:

```text
apps/web/astro.config.mjs
apps/web/src/pages/index.astro
apps/web/src/pages/notes/[slug].astro
apps/web/src/lib/content.js
```

Purpose:

- eliminate shell ambiguity before creating the Next app entrypoints

- [ ] **Step 4: Install dependencies**

Run:

```bash
pnpm --dir E:\Mywork\algorithm\personal-site\apps\web install
```

Expected:

- lockfile updates under `apps/web`
- no Astro dependency remains in the web app

- [ ] **Step 5: Commit**

Run:

```bash
git -C E:\Mywork\algorithm\personal-site add package.json apps/web/package.json apps/web/package-lock.json apps/web/pnpm-lock.yaml apps/web/astro.config.mjs apps/web/src/pages apps/web/src/lib/content.js
git -C E:\Mywork\algorithm\personal-site commit -m "chore: replace astro package surface with next baseline"
```

If `pnpm-lock.yaml` is not generated, omit it from `git add`.

---

### Task 2: Create The Next.js App Bootstrap Files

**Files:**
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/eslint.config.mjs`
- Create: `apps/web/next-env.d.ts`

- [ ] **Step 1: Create `apps/web/next.config.ts`**

Use:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
```

Purpose:

- establish a minimal, deterministic Next config for the initial migration

- [ ] **Step 2: Create `apps/web/tsconfig.json`**

Use:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Purpose:

- enable strict TS and JSON imports for metadata loading in Phase 2

- [ ] **Step 3: Create `apps/web/postcss.config.mjs`**

Use:

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

- [ ] **Step 4: Create `apps/web/eslint.config.mjs`**

Use:

```js
import nextVitals from "eslint-config-next/core-web-vitals";

export default [...nextVitals];
```

- [ ] **Step 5: Create `apps/web/next-env.d.ts`**

Use:

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// This file is auto-maintained by Next.js.
```

- [ ] **Step 6: Commit**

Run:

```bash
git -C E:\Mywork\algorithm\personal-site add apps/web/next.config.ts apps/web/tsconfig.json apps/web/postcss.config.mjs apps/web/eslint.config.mjs apps/web/next-env.d.ts
git -C E:\Mywork\algorithm\personal-site commit -m "chore: add next bootstrap configuration"
```

---

### Task 3: Create A Minimal App Router Shell

**Files:**
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/globals.css`
- Create: `apps/web/src/lib/config.ts`
- Create: `apps/web/src/lib/utils.ts`

- [ ] **Step 1: Create `apps/web/src/lib/config.ts`**

Use:

```ts
export const siteConfig = {
  name: "Personal Site",
  description: "Public publishing pipeline preview site.",
  locale: "zh-CN",
  sections: [
    { title: "Notes", href: "/notes" },
    { title: "Courses", href: "/courses" },
    { title: "Gallery", href: "/gallery" },
  ],
};
```

- [ ] **Step 2: Create `apps/web/src/lib/utils.ts`**

Use:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Create `apps/web/src/app/globals.css`**

Use:

```css
@import "tailwindcss";

:root {
  --background: #f7f2ea;
  --foreground: #221b16;
  --panel: rgba(255, 252, 246, 0.96);
  --line: #deceb9;
  --accent: #8c4d1f;
}

html {
  color-scheme: light;
}

body {
  margin: 0;
  background:
    radial-gradient(circle at top right, rgba(190, 140, 82, 0.14), transparent 24%),
    linear-gradient(180deg, #fbf8f2 0%, var(--background) 100%);
  color: var(--foreground);
  font-family: Georgia, "Times New Roman", serif;
}

a {
  color: inherit;
  text-decoration: none;
}

* {
  box-sizing: border-box;
}
```

- [ ] **Step 4: Create `apps/web/src/app/layout.tsx`**

Use:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={siteConfig.locale}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Create `apps/web/src/app/page.tsx`**

Use:

```tsx
import { siteConfig } from "@/lib/config";

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-8 shadow-[0_16px_40px_rgba(69,47,25,0.08)]">
        <p className="mb-3 text-sm uppercase tracking-[0.2em] text-[var(--accent)]">
          Migration Phase 1
        </p>
        <h1 className="mb-4 text-5xl leading-tight">Personal Site</h1>
        <p className="max-w-3xl text-lg leading-8 text-[rgba(34,27,22,0.82)]">
          This is the Next.js bootstrap shell. Content routes are intentionally not
          connected yet. Phase 2 will add the typed adapter that reads the generated
          public snapshot under content/public.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {siteConfig.sections.map((section) => (
            <span
              key={section.href}
              className="rounded-full border border-[var(--line)] px-4 py-2 text-sm"
            >
              {section.title}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Run build to verify Phase 1 shell**

Run:

```bash
pnpm --dir E:\Mywork\algorithm\personal-site\apps\web build
```

Expected:

- build succeeds
- `/` static route is generated

- [ ] **Step 7: Commit**

Run:

```bash
git -C E:\Mywork\algorithm\personal-site add apps/web/src/app apps/web/src/lib/config.ts apps/web/src/lib/utils.ts
git -C E:\Mywork\algorithm\personal-site commit -m "feat: bootstrap next app shell"
```

---

### Task 4: Define Typed Content Models And Public Snapshot Paths

**Files:**
- Create: `apps/web/src/lib/content/types.ts`
- Create: `apps/web/src/lib/content/paths.ts`
- Test: `apps/web/src/lib/content/__tests__/paths.test.ts`

- [ ] **Step 1: Create `apps/web/src/lib/content/types.ts`**

Use:

```ts
export const contentKinds = ["notes", "courses", "gallery"] as const;

export type ContentKind = (typeof contentKinds)[number];

export type ContentListItem = {
  kind: ContentKind;
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  cover: string | null;
  updated: string | null;
  course: string | null;
  week: string | null;
  artCategory: string | null;
  series: string | null;
};

export type ContentDocument = ContentListItem & {
  body: string;
  created: string | null;
  contentType: string | null;
};
```

- [ ] **Step 2: Create `apps/web/src/lib/content/paths.ts`**

Use:

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ContentKind } from "./types";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(currentDir, "..", "..", "..");
const repoRoot = path.resolve(appRoot, "..", "..");
const publicRoot = path.join(repoRoot, "content", "public");

export function getPublicRoot() {
  return publicRoot;
}

export function getMetadataPath(kind: ContentKind) {
  return path.join(publicRoot, "metadata", `${kind}.json`);
}

export function getDocumentPath(kind: ContentKind, slug: string) {
  return path.join(publicRoot, kind, `${slug}.md`);
}
```

- [ ] **Step 3: Create `apps/web/src/lib/content/__tests__/paths.test.ts`**

Use:

```ts
import { describe, expect, it } from "vitest";
import { getDocumentPath, getMetadataPath, getPublicRoot } from "../paths";

describe("content paths", () => {
  it("resolves the generated public root", () => {
    expect(getPublicRoot().replace(/\\/g, "/")).toContain("/content/public");
  });

  it("builds metadata paths by kind", () => {
    expect(getMetadataPath("notes").replace(/\\/g, "/")).toMatch(/metadata\/notes\.json$/);
  });

  it("builds document paths by kind and slug", () => {
    expect(getDocumentPath("notes", "dku-duo-push").replace(/\\/g, "/")).toMatch(
      /notes\/dku-duo-push\.md$/,
    );
  });
});
```

- [ ] **Step 4: Run the path tests**

Run:

```bash
pnpm --dir E:\Mywork\algorithm\personal-site\apps\web test -- --run apps/web/src/lib/content/__tests__/paths.test.ts
```

Expected:

- all three tests pass

- [ ] **Step 5: Commit**

Run:

```bash
git -C E:\Mywork\algorithm\personal-site add apps/web/src/lib/content/types.ts apps/web/src/lib/content/paths.ts apps/web/src/lib/content/__tests__/paths.test.ts
git -C E:\Mywork\algorithm\personal-site commit -m "feat: add typed content path layer"
```

---

### Task 5: Implement Frontmatter Parsing And Metadata Normalization

**Files:**
- Create: `apps/web/src/lib/content/frontmatter.ts`
- Create: `apps/web/src/lib/content/normalize.ts`

- [ ] **Step 1: Create `apps/web/src/lib/content/frontmatter.ts`**

Use:

```ts
export type ParsedFrontmatterDocument = {
  frontmatter: Record<string, unknown>;
  body: string;
};

export function parseFrontmatterDocument(source: string): ParsedFrontmatterDocument {
  if (!source.startsWith("---\n")) {
    return { frontmatter: {}, body: source };
  }

  const endMarker = "\n---\n";
  const endIndex = source.indexOf(endMarker, 4);

  if (endIndex === -1) {
    return { frontmatter: {}, body: source };
  }

  const rawFrontmatter = source.slice(4, endIndex);
  const body = source.slice(endIndex + endMarker.length).trim();
  const frontmatter: Record<string, unknown> = {};
  let activeListKey: string | null = null;

  for (const rawLine of rawFrontmatter.split("\n")) {
    if (!rawLine.trim()) continue;

    const indent = rawLine.match(/^ */)?.[0].length ?? 0;
    const trimmed = rawLine.trim();

    if (trimmed.startsWith("- ") && indent === 2 && activeListKey) {
      const current = frontmatter[activeListKey];
      if (Array.isArray(current)) {
        current.push(trimmed.slice(2).replace(/^"(.*)"$/, "$1"));
      }
      continue;
    }

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const rawValue = trimmed.slice(colonIndex + 1).trim();

    if (!rawValue) {
      frontmatter[key] = [];
      activeListKey = key;
      continue;
    }

    activeListKey = null;
    frontmatter[key] = rawValue.replace(/^"(.*)"$/, "$1");
  }

  return { frontmatter, body };
}
```

- [ ] **Step 2: Create `apps/web/src/lib/content/normalize.ts`**

Use:

```ts
import type { ContentDocument, ContentKind, ContentListItem } from "./types";

type RawMetadata = Record<string, unknown>;
type RawFrontmatter = Record<string, unknown>;

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function normalizeListItem(kind: ContentKind, raw: RawMetadata): ContentListItem {
  return {
    kind,
    slug: asString(raw.slug) ?? "",
    title: asString(raw.title) ?? "",
    summary: asString(raw.summary) ?? "",
    tags: asStringArray(raw.tags),
    cover: asString(raw.cover),
    updated: asString(raw.updated),
    course: asString(raw.course),
    week: asString(raw.week),
    artCategory: asString(raw.art_category),
    series: asString(raw.series),
  };
}

export function normalizeDocument(
  kind: ContentKind,
  rawMetadata: RawMetadata,
  rawFrontmatter: RawFrontmatter,
  body: string,
): ContentDocument {
  const base = normalizeListItem(kind, rawMetadata);

  return {
    ...base,
    body,
    created: asString(rawFrontmatter.created),
    contentType: asString(rawFrontmatter.content_type),
  };
}
```

- [ ] **Step 3: Commit**

Run:

```bash
git -C E:\Mywork\algorithm\personal-site add apps/web/src/lib/content/frontmatter.ts apps/web/src/lib/content/normalize.ts
git -C E:\Mywork\algorithm\personal-site commit -m "feat: add frontmatter and metadata normalization"
```

---

### Task 6: Implement Metadata And Document Loaders

**Files:**
- Create: `apps/web/src/lib/content/load-index.ts`
- Create: `apps/web/src/lib/content/load-entry.ts`
- Create: `apps/web/src/lib/content/index.ts`
- Test: `apps/web/src/lib/content/__tests__/load-index.test.ts`
- Test: `apps/web/src/lib/content/__tests__/load-entry.test.ts`

- [ ] **Step 1: Create `apps/web/src/lib/content/load-index.ts`**

Use:

```ts
import fs from "node:fs/promises";
import { getMetadataPath } from "./paths";
import { normalizeListItem } from "./normalize";
import type { ContentKind, ContentListItem } from "./types";

export async function loadIndex(kind: ContentKind): Promise<ContentListItem[]> {
  const source = await fs.readFile(getMetadataPath(kind), "utf8");
  const parsed = JSON.parse(source) as Record<string, unknown>[];

  return parsed
    .map((item) => normalizeListItem(kind, item))
    .filter((item) => item.slug && item.title)
    .sort((left, right) => left.title.localeCompare(right.title, "zh-CN"));
}
```

- [ ] **Step 2: Create `apps/web/src/lib/content/load-entry.ts`**

Use:

```ts
import fs from "node:fs/promises";
import { parseFrontmatterDocument } from "./frontmatter";
import { loadIndex } from "./load-index";
import { normalizeDocument } from "./normalize";
import { getDocumentPath } from "./paths";
import type { ContentDocument, ContentKind } from "./types";

export async function loadEntry(kind: ContentKind, slug: string): Promise<ContentDocument | null> {
  const index = await loadIndex(kind);
  const metadata = index.find((item) => item.slug === slug);

  if (!metadata) {
    return null;
  }

  const source = await fs.readFile(getDocumentPath(kind, slug), "utf8");
  const parsed = parseFrontmatterDocument(source);

  return normalizeDocument(kind, metadata, parsed.frontmatter, parsed.body);
}
```

- [ ] **Step 3: Create `apps/web/src/lib/content/index.ts`**

Use:

```ts
export * from "./types";
export * from "./paths";
export * from "./load-index";
export * from "./load-entry";
export * from "./normalize";
```

- [ ] **Step 4: Create `apps/web/src/lib/content/__tests__/load-index.test.ts`**

Use:

```ts
import { describe, expect, it } from "vitest";
import { loadIndex } from "../load-index";

describe("loadIndex", () => {
  it("loads exported notes metadata", async () => {
    const notes = await loadIndex("notes");

    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0]).toMatchObject({
      kind: "notes",
    });
  });
});
```

- [ ] **Step 5: Create `apps/web/src/lib/content/__tests__/load-entry.test.ts`**

Use:

```ts
import { describe, expect, it } from "vitest";
import { loadEntry } from "../load-entry";

describe("loadEntry", () => {
  it("loads a known note document", async () => {
    const note = await loadEntry("notes", "dku-duo-push");

    expect(note).not.toBeNull();
    expect(note?.slug).toBe("dku-duo-push");
    expect(note?.body.length).toBeGreaterThan(0);
  });

  it("returns null for an unknown slug", async () => {
    const note = await loadEntry("notes", "missing-slug");

    expect(note).toBeNull();
  });
});
```

- [ ] **Step 6: Run the adapter tests**

Run:

```bash
pnpm --dir E:\Mywork\algorithm\personal-site\apps\web test -- --run apps/web/src/lib/content/__tests__/paths.test.ts apps/web/src/lib/content/__tests__/load-index.test.ts apps/web/src/lib/content/__tests__/load-entry.test.ts
```

Expected:

- all adapter tests pass

- [ ] **Step 7: Commit**

Run:

```bash
git -C E:\Mywork\algorithm\personal-site add apps/web/src/lib/content/load-index.ts apps/web/src/lib/content/load-entry.ts apps/web/src/lib/content/index.ts apps/web/src/lib/content/__tests__/load-index.test.ts apps/web/src/lib/content/__tests__/load-entry.test.ts
git -C E:\Mywork\algorithm\personal-site commit -m "feat: add public snapshot content adapter"
```

---

### Task 7: Update Developer Docs For The New Runtime Baseline

**Files:**
- Modify: `apps/web/README.md`
- Modify: `agent.md`

- [ ] **Step 1: Update `apps/web/README.md`**

Document:

- app is now Next.js-based
- current scope only includes shell and content adapter
- route migration is Phase 3

- [ ] **Step 2: Confirm `agent.md` matches the implementation boundary**

Check that it still states:

- `tools/publisher` owns content adaptation
- `content/public` is generated source of truth
- Phase 1 is shell only
- Phase 2 is typed adapter only

- [ ] **Step 3: Commit**

Run:

```bash
git -C E:\Mywork\algorithm\personal-site add apps/web/README.md agent.md
git -C E:\Mywork\algorithm\personal-site commit -m "docs: align repo docs with next migration phases"
```

---

## Self-Review

### Spec Coverage

- Phase 1 shell bootstrap: covered by Tasks 1 to 3.
- Phase 2 typed adapter: covered by Tasks 4 to 6.
- documentation and implementation purpose: covered by Task 7.

### Placeholder Scan

- No task uses `TBD` or `TODO`.
- Each task names exact files and concrete commands.
- Tests are attached directly to the adapter work.

### Type Consistency

- `ContentKind`, `ContentListItem`, and `ContentDocument` are defined once in `types.ts`.
- loader APIs consistently use `loadIndex(kind)` and `loadEntry(kind, slug)`.
- normalization uses publisher field names without inventing a competing schema.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-26-nextjs-phase1-phase2.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
