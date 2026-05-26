# Personal Site

Single-repository skeleton for:

- Astro website frontend
- Obsidian publishing/export pipeline
- generated public content
- Vercel deployment

## Structure

- `apps/web`: website frontend
- `tools/publisher`: export pipeline from Obsidian-oriented source content to public website/social outputs
- `content/public`: generated public-safe content consumed by the frontend
- `docs/contracts`: project contracts for metadata, export shape, and monorepo boundaries

## Current Status

This repository is intentionally initialized as a minimal skeleton only.

What exists now:

- monorepo directory layout
- placeholder Astro app shell
- placeholder publisher package
- publication contract docs

What does not exist yet:

- real Astro UI implementation
- working export pipeline
- Vercel project binding
- social distribution automation

## Intended Workflow

1. author content in Obsidian
2. run publisher
3. generate content into `content/public`
4. Astro site reads generated content
5. Vercel builds and deploys the website
