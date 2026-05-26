# Publisher

Placeholder package for the Obsidian-to-public-content export pipeline.

## Intended Responsibilities

- read source content from the user's curated Obsidian publication scope
- validate frontmatter
- export public-safe Markdown
- copy assets into `content/public/assets`
- generate metadata indexes
- generate social draft outputs

## Intended Command

```bash
pnpm --dir tools/publisher export
```

## Current State

No real export logic exists yet. This package only reserves the structure.
