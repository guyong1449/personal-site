# Workflows

- `ci.yml` — runs on every push to main and every pull request.
  Installs with pnpm, then executes the repo-wide `pnpm check`
  (site-builder, studio, publisher tests + web lint and vitest) followed
  by `pnpm build:web`, which also regenerates `content/public` via the
  web prebuild.

Deployment stays on Vercel; CI is a quality gate only.
