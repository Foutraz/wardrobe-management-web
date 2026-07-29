# technical/Theme

Owns everything visual that is specific to **this** product, plus the application shell.
It is the counterpart of `technical/Vuetify`: that layer wires the package, this one says
what the product looks like.

## What it owns

- `app/composables/useProjectTheme.ts` — the Vuetify `theme` option. This is the single
  place where the project's palette may diverge from Vuetify's defaults. It currently
  returns Vuetify's stock `light` theme, because there is no Xefi-wide custom theme.
- `app/app.vue`, `app/layouts/default.vue`, `app/components/AppHeader.vue` — the shell.
- `app/pages/index.vue` — the root route.
- `app/assets/scss/main.scss` — the only global stylesheet, registered through this
  layer's `css` config.

## Conventions

- Custom class names follow BEM. An element is styled **either** with Vuetify utility
  classes **or** with one scoped class owning its full styling — never both.
- Global styles live in `main.scss` only. Component `<style>` blocks are always `scoped`.
- Logos and any first-paint imagery use a native `<img>`, not `v-img`, so they appear in
  the server-rendered HTML.
