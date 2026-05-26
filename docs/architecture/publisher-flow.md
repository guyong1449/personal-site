# Publisher Flow

## Purpose

`tools/publisher` turns selected Obsidian content into a frontend-ready public snapshot.

## Input Expectations

The publisher expects:

- a Vault root
- one or more included public scopes
- optional excluded paths
- markdown files with explicit frontmatter such as `publish: true`, `content_type`, and `channels`

## Processing Stages

### 1. Scope Scan

The publisher recursively scans the configured include paths and collects markdown files.

Files are ignored if they:

- sit under excluded paths
- do not declare `publish: true`
- do not include `site` in `channels`
- do not provide `title` and `content_type`

### 2. Entry Collection

Each publishable document is normalized into an internal entry with:

- source file path
- parsed frontmatter
- markdown body
- export directory
- slug

## 3. Route Resolution

Before export, the publisher builds a lookup table for internal links.

The lookup maps several forms to the final site route:

- frontmatter title
- slug
- relative Vault path without `.md`
- source file basename

This supports Obsidian links such as `[[Note]]` and `[[Note|Alias]]`.

## 4. Asset Resolution

Asset resolution checks multiple locations in order:

1. the file path relative to the note
2. the note-local `<note>_images` directory
3. sibling directories under the note folder
4. the shared Vault image directory `pic`

Resolved assets are copied into `content/public/assets`.

## 5. Document Rewriting

The publisher rewrites:

- frontmatter `cover`
- standard markdown images
- Obsidian image embeds
- Obsidian internal links

Sized Obsidian embeds are exported as HTML `<img>` tags with width and height metadata preserved, plus responsive style guards for frontend rendering.

## 6. Output Generation

For each publishable entry, the publisher writes:

- one markdown file into `notes`, `courses`, or `gallery`
- one metadata record into the matching JSON index
- optional social drafts for supported channels

## Output Shape

The final output root contains:

- `notes/*.md`
- `courses/*.md`
- `gallery/*.md`
- `assets/*`
- `metadata/*.json`
- `social/wechat/*.md`
- `social/xiaohongshu/*.md`

## Verification

The publisher package includes Node.js tests for:

- publish filtering
- metadata generation
- social draft generation
- asset copying and path rewriting
- internal link rewriting
