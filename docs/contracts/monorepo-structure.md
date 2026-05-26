# Personal Site Monorepo Structure

## Goal

Define a single-repository layout that keeps:

- Obsidian publication/export logic
- website frontend
- generated public content
- deployment configuration

logically separated while remaining easy to deploy on Vercel.

## Recommended Layout

```text
personal-site/
  apps/
    web/
  tools/
    publisher/
  content/
    public/
  docs/
    contracts/
    runbooks/
    social/
  .github/
    workflows/
```

## Core Rule

Frontend reads only generated content under `content/public`.
Publisher is the only layer allowed to understand both source content structure and public output structure.
