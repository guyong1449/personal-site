# Runtime Overview

## Repository Role

This repository packages the public publishing path for a personal site.

The runtime path is:

`Obsidian Vault -> tools/publisher -> content/public -> apps/web -> Vercel`

## Layer Responsibilities

### `tools/publisher`

This package is the adaptation layer between Obsidian-authored source files and the website.

It is responsible for:

- reading markdown files from configured Vault scopes
- parsing frontmatter
- filtering publishable content
- resolving relative assets and shared Vault image assets
- rewriting Obsidian links into site routes
- exporting markdown, metadata, assets, and social drafts

### `content/public`

This directory is the site-facing content boundary.

It contains:

- `notes/`, `courses/`, `gallery/`: exported markdown documents
- `assets/`: copied images and covers
- `metadata/`: JSON indexes for frontend listing pages
- `social/`: generated cross-posting drafts

### `apps/web`

This app is a lightweight Astro consumer of generated content.

It is responsible for:

- reading metadata and detail markdown from `content/public`
- rendering local preview pages
- serving as the deployable static site target for Vercel

## Technology Stack

- Publisher: `Node.js` with ESM JavaScript
- Site app: `Astro`
- Content format: `Markdown + frontmatter + JSON metadata`
- Deployment target: `Vercel`

## Current Execution Model

The site is built as a static-content pipeline.

That means:

- the Vault remains the authoring source
- the publisher produces a clean, public-safe content snapshot
- the frontend consumes generated files without needing direct Vault access
- deployment does not require a database for the current scope
