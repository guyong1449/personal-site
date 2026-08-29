# Workflows

- `ci.yml` — runs on every push to main and every pull request.
  Installs with pnpm, then executes the repo-wide `pnpm verify`: tests,
  lint, production build, link/asset checks, and a final assertion that
  tracked generated files match `content/site`.

Deployment stays on Vercel; CI is a quality gate only.
