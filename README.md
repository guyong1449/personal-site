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
- **Deployment**: Vercel production

## Development

```bash
# Install dependencies
pnpm install

# Run development server at http://127.0.0.1:4317
pnpm dev:web

# Build for production
pnpm build:web
```

## Current Status

- Next.js frontend with notes, courses, gallery, search metadata, RSS and sitemap
- Single-file publishing from any Obsidian Vault folder
- Visual frontmatter editor with automatic slug generation
- Local preview on port 4317 and publish API on port 4318
- Vercel production deployment is live at `https://guyong.site`; `www.guyong.site` is also connected over HTTPS
- Fallback production URL: `https://personal-site-pearl-eta-55.vercel.app`
- Public content snapshot currently empty and ready for real articles

## Intended Workflow

1. Author content in Obsidian
2. Run the Obsidian command **发布当前文件到网站** (the local service starts automatically)
3. Generated content appears in content/public
4. Next.js site reads and displays content
5. Vercel deploys the website

The current-file command works from any folder in the configured Vault. Directory-based full export remains available as an optional batch workflow.
