# Personal Site

Monorepo structure for a personal website built with Next.js.

## Structure

```
personal-site/
├── apps/web          # Next.js frontend
├── tools/publisher   # Content export pipeline
└── content/public    # Generated public content
```

### apps/web

Next.js App Router frontend with:

- Notes, courses, gallery pages
- Markdown rendering with TOC
- Giscus comments integration
- RSS feed, sitemap, robots.txt
- Responsive design with mobile menu

### tools/publisher

Content export pipeline that processes source content into public-safe format for the frontend.

### content/public

Generated content consumed by the frontend:
- `notes/` - Learning notes
- `courses/` - Course materials
- `gallery/` - Creative works
- `assets/` - Images and media
- `metadata/` - Content metadata

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: Tailwind CSS
- **Content**: Markdown with frontmatter
- **Deployment**: Vercel (planned)

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
```

## Current Status

- Next.js frontend with full page structure
- Content loading system with typed adapters
- Publisher tool with basic export capabilities
- RSS feed generation
- Placeholder content in content/public

## Intended Workflow

1. Author content in Obsidian
2. Run publisher to export
3. Generated content appears in content/public
4. Next.js site reads and displays content
5. Vercel deploys the website
