# Web App

Next.js 15 App Router frontend.

Current scope:

- Phase 1: runtime shell, TypeScript, Tailwind baseline, minimal `/` route
- Phase 2: typed content adapter over `../../content/public`
- Phase 3+: route migration for `notes`, `courses`, and `gallery`

This app should read only from `../../content/public`, and should not introduce a second content source of truth.
