# technical/ApiClient

Owns the HTTP boundary with `wardrobe-management-api` and the transport of the bearer token.
It knows nothing about any business domain.

## What it owns

- `app/plugins/laravel-raom.ts` — provides the `$fetch` instance that `laravel-raom-nuxt`
  uses for **every** request. Sets `baseURL`, `Accept`, and `Authorization`, and handles 401.
- `app/stores/useApiSessionStore.ts` — the current session: `token`, `expiresAt`,
  `isAuthenticated`, `start(issued)`, `clear()`.
- `app/types/api-session.d.ts` — `IIssuedToken`, the shape the API's `TokenIssuer` returns.
  Its fields stay snake_case because that is the API's contract, not ours.
- `experimental.decorators`, which `laravel-raom-nuxt`'s `@Resource` / `@Field` decorators
  require. Without it they break silently.

## The API this layer talks to

`wardrobe-management-api`, a `lomkit/laravel-rest-api` backend behind Sanctum.

- Base URL: `${NUXT_PUBLIC_API_URL}/api/v1`.
- lomkit resources: `garments`, `wishlist-items`, `outfits`, `avatars`,
  `vinted-listing-drafts`.
- Auth endpoints: `POST login`, `register`, `token/refresh`, `logout`.

## Every API call goes through a model

`laravel-raom-nuxt` models are the only way to reach the API. No `$fetch`, no `useFetch`, no
hand-built lomkit payload.

```ts
const [garments, pagination] = await Garment.query().include('brand').limit(25).get()
const garment = await Garment.query().findByKey(id)
```

A model belongs to **its own functional layer**, under that layer's `app/models/`. Because
`imports.dirs` resolves relatively to the declaring layer, each functional layer opts its
models into auto-import from its own config — the declaration cannot be centralised here:

```ts
export default defineNuxtConfig({
  imports: { dirs: ['app/models'] },
})
```

There is no model in this layer: it holds no domain.

## Error handling

- **401** — the session is cleared and the user is notified. Nothing else.
- **422** — deliberately *not* intercepted. Validation errors must reach the calling form so
  it can render them field by field.

## Known limitation of the token storage

The token lives in a `sameSite=lax` cookie, `secure` outside development, written through
Nuxt's `useCookie` so SSR can read it. It is **not** `httpOnly`: the client has to read it to
build the `Authorization` header. That is inherent to bearer-token authentication from a
browser app, not an oversight.

## What is deliberately missing, and who will add it

Both items belong to the future `functional/Users` layer, which owns the endpoints involved:

- **Refreshing the token before it expires.** The API returns `expires_at` and
  `idle_timeout_minutes`, and `POST token/refresh` rotates the token while destroying the old
  one. That layer will feed `useApiSessionStore` without touching this plugin.
- **Redirecting to the sign-in screen on 401.** This foundation has no `/login` route, so
  redirecting there would produce a 404. Only the notification fires for now.
