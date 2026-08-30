# Workflows

- `ci.yml` — runs on every push to main and every pull request.
  Installs with pnpm, then executes the repo-wide `pnpm verify`: tests,
  lint, TypeScript, production build, link/asset checks, and a final assertion that
  tracked generated files match `content/site`.
- Production dependencies are audited separately; high/critical advisories fail CI.

Deployment stays on Vercel; CI is a quality gate only.
