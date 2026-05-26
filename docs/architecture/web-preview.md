# Web Preview

## Purpose

`apps/web` is the repository's local preview surface and static deployment app.

## Content Boundary

The app reads from `content/public` only.

It does not read the Obsidian Vault directly.

This keeps the frontend side stable even when the Vault layout changes.

## Current Pages

- `/`: note index page based on `metadata/notes.json`
- `/notes/[slug]`: note detail page based on exported markdown

## Data Access

The content loader in `src/lib/content.js` reads:

- `metadata/notes.json` for listing data
- `notes/<slug>.md` for detail pages

## Rendering Behavior

The note detail page:

- parses exported markdown with `marked`
- renders raw markdown and HTML image embeds
- constrains content images to the article width
- keeps article overflow clipped on the x-axis

## Deployment Shape

The Astro app builds a static site.

`content/public` is used as the app's public asset directory so copied images are directly served under `/assets/...`.
