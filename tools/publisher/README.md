# Publisher

Content export pipeline for converting Obsidian vault content into public-safe format for the Next.js frontend.

## Features

- Frontmatter parsing and validation
- Asset path resolution and copying
- Obsidian internal link rewriting (`[[links]]` → standard markdown)
- Obsidian embed syntax support (`![[image.png|size]]`)
- Multi-channel export (site, wechat, xiaohongshu)
- Metadata index generation

## Usage

```bash
# Run with default config
pnpm --dir tools/publisher export

# Run with custom config
pnpm --dir tools/publisher export -- --config config.yaml
```

## Configuration

Create a `config.yaml` file:

```yaml
vault_root: "E:/Mywork/Obsidian Vault"
public_scope:
  include:
    - "08-个人/DKU相关"
    - "03-知识库"
  exclude:
    - "03-知识库/drafts"
output_root: "../../content/public"
default_channel: "site"
```

## Content Requirements

Markdown files must have this frontmatter to be exported:

```yaml
---
title: "Your Title"
publish: true
content_type: note  # note, course, or artwork
channels:
  - site
summary: "Brief description"
tags:
  - tag1
  - tag2
---
```

## Supported Content Types

- `note` → exports to `content/public/notes/`
- `course` → exports to `content/public/courses/`
- `artwork` → exports to `content/public/gallery/`

## Output Structure

```
content/public/
├── assets/          # Copied images and media
├── notes/           # Exported notes
├── courses/         # Exported courses
├── gallery/         # Exported artwork
├── social/
│   ├── wechat/      # WeChat drafts
│   └── xiaohongshu/ # Xiaohongshu drafts
└── metadata/
    ├── notes.json   # Notes index
    ├── courses.json # Courses index
    └── gallery.json # Gallery index
```

## Testing

```bash
pnpm --dir tools/publisher test
```

## Current Status

- Fully functional export pipeline
- Tested with real Obsidian vault content
- Supports image embedding and link rewriting
- Generates metadata for frontend consumption
