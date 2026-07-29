# technical/Vuetify

Wires the Vuetify package into the application. Holds nothing specific to this product —
another Xefi project can lift this layer as-is.

## What it owns

- `app/plugins/vuetify.ts` — registers Vuetify with SSR enabled and MDI as the default icon
  set, and imports the Vuetify and MDI stylesheets.
- The Vite and build settings Vuetify needs (`build.transpile`, `vite.ssr.noExternal`).

## Contract with the rest of the application

This layer expects another layer to expose an auto-imported `useProjectTheme()` returning
Vuetify's `theme` option. `technical/Theme` provides it here. Reusing this layer elsewhere
means providing your own `useProjectTheme()` — no branding, colour, or design token lives
in this layer.

## Conventions

- Vuetify components are registered globally by the plugin: never `import { VBtn } from
  'vuetify/components'` in a template.
- Vuetify composables (`useDisplay`, `useTheme`, `useDate`) are **not** auto-imported and
  need an explicit `import ... from 'vuetify'`.
- Prefer a Vuetify component, composable, or utility class over an external package.
- Notifications are the documented exception: use `useNotification()` from
  `technical/Notification`, never `v-snackbar`.
