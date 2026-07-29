# wardrobe-management-web

Nuxt front end of the wardrobe management application. Talks to `wardrobe-management-api`, a
Laravel `lomkit/laravel-rest-api` backend behind Sanctum.

## Requirements

- Node 22
- pnpm 11 — the only supported package manager. If it is not on your `PATH`, Node ships
  Corepack: run `corepack enable pnpm`, or prefix every command with `corepack pnpm`.

## Install

```bash
pnpm install
cp .env.example .env
```

Then point `NUXT_PUBLIC_API_URL` at your running API (`http://localhost:8000` by default).
Leave `NUXT_PUBLIC_SENTRY_DSN` empty to keep Sentry inert.

## Run

```bash
pnpm dev          # development server on http://localhost:3000
pnpm build        # production build into .output
pnpm preview      # serve the production build
```

## Check

```bash
pnpm lint         # ESLint
pnpm typecheck    # vue-tsc through nuxt typecheck
pnpm test         # Vitest
```

## Structure

The codebase is organised in OSDD layers at the project root, declared in `nuxt.config.ts`
and resolved by `nuxt-osdd`:

- `technical/` — infrastructure shared across features: API client, Vuetify, theme, i18n,
  notifications, form rules, monitoring.
- `functional/` — one layer per business domain. None yet.

Add a layer with `pnpm exec nuxt-osdd osdd:layer <Name> --technical|--functional`, then list it
under the matching `osdd` key in `nuxt.config.ts`.

Each layer owns its `app/` subtree, and its tests live in `app/tests/`, mirroring `app/`.
