# technical/Monitoring

Owns error and performance monitoring through `@sentry/nuxt`.

## What it owns

Only the module declaration. The initialisation itself lives in `sentry.client.config.ts` and
`sentry.server.config.ts` **at the project root**, because that is where the Sentry module
resolves them from — they cannot be moved into this layer.

## Activation

Sentry only initialises when `NUXT_PUBLIC_SENTRY_DSN` is set, which leaves it inert in
development without any extra flag. Set the DSN per environment:

```
NUXT_PUBLIC_SENTRY_DSN=https://…@…ingest.sentry.io/…
```

The client config reads the DSN from `useRuntimeConfig().public.sentryDsn`. The server config
reads `process.env.NUXT_PUBLIC_SENTRY_DSN` directly, because it runs before the Nuxt app
context exists.

## Source maps

Uploading source maps needs a Sentry auth token and project settings that do not exist yet.
Wire it when the Sentry project is created, not before.
