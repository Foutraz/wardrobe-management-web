# Scaffolding du front Nuxt — wardrobe-management-web

Date : 2026-07-29
Branche : `scaffolding` (depuis `develop`)

## 1. Objectif

Poser le socle technique du front Nuxt de `wardrobe-management-web`, aligné sur l'API
Laravel `wardrobe-management-api` (branche `scaffolding`), en respectant les conventions
XEFI Nuxt et Global.

À l'issue de cette branche, le projet démarre, se construit, se teste et se lint, avec
toute la plomberie prête à recevoir du métier — mais **aucun métier**.

## 2. Ce que l'API impose

Relevé sur `../wardrobe-management-api-scaffolding` :

| Élément | Valeur |
|---|---|
| Préfixe des routes | `/api/v1` |
| Authentification | Sanctum, bearer token |
| Endpoints d'auth | `POST v1/register`, `v1/login`, `v1/token/refresh`, `v1/logout` |
| Charge utile du token | `token`, `token_type`, `expires_at`, `idle_timeout_minutes` |
| Rotation | `token/refresh` émet un nouveau token et détruit l'ancien |
| Ressources lomkit | `garments`, `wishlist-items`, `outfits`, `avatars`, `vinted-listing-drafts` |
| Locales | enum `Locale` : `fr` (défaut), `en` |
| Résolution de locale | depuis `user.locale`, **pas** depuis un en-tête HTTP |
| Domaines métier | catalog, identification, resale, styling, users, wardrobe |

Deux conséquences pour le socle :

- Le client API doit porter un `Authorization: Bearer` et survivre à une rotation de token.
- La locale du front devra à terme se synchroniser sur `user.locale`. Le point d'extension
  est prévu, la synchronisation elle-même appartient à la future layer `functional/Users`.

## 3. Périmètre

### Dans le périmètre

- 7 layers techniques OSDD.
- Outillage complet : pnpm, ESLint, Prettier, Vitest, `vue-tsc`, Storybook.
- Une route `/` qui rend un vrai layout, pour que le projet démarre sur autre chose que
  la page d'accueil par défaut de Nuxt.
- Les tests unitaires et stories de ce que le socle contient réellement.

### Hors périmètre

- Aucune layer `functional/`.
- Aucun modèle `laravel-raom` (ils appartiennent aux layers fonctionnelles).
- Aucun écran d'authentification (login, register, logout).
- Pas de CI, pas de Docker, pas de déploiement.

## 4. Architecture OSDD

Layers **à la racine**, via `nuxt-osdd@^1.0.5` :

```
/
├── nuxt.config.ts
├── package.json
├── .env.example
├── eslint.config.mjs
├── .prettierrc
├── vitest.config.ts
├── sentry.client.config.ts
├── sentry.server.config.ts
├── .storybook/
│   └── main.ts
└── technical/
    ├── ApiClient/
    ├── Vuetify/
    ├── Theme/
    ├── Internationalization/
    ├── Notification/
    ├── Forms/
    └── Monitoring/
```

Chaque layer : `nuxt.config.ts` + `README.md` + un sous-arbre `app/`. Noms en PascalCase.
**Pas de `app/` à la racine.** Pas de layer `Base`, `Shared`, `Common`, `Core`, `Utils`.

Le `nuxt.config.ts` racine :

```ts
import { defineOSDDNuxtConfig } from 'nuxt-osdd'

export default defineOSDDNuxtConfig({
  osdd: {
    technical: [
      'Vuetify',
      'Theme',
      'Internationalization',
      'Notification',
      'Forms',
      'ApiClient',
      'Monitoring',
    ],
    functional: [],
  },
  modules: ['@pinia/nuxt', '@pinia-plugin-persistedstate/nuxt'],
  runtimeConfig: {
    public: {
      apiUrl: '',
      sentryDsn: '',
    },
  },
  typescript: { strict: true, typeCheck: true },
})
```

Les modules propres à une layer sont déclarés dans le `nuxt.config.ts` de cette layer
(`@nuxtjs/i18n` dans `Internationalization`, `@sentry/nuxt` dans `Monitoring`). Seuls
Pinia et son plugin de persistance, qui servent plusieurs layers, restent à la racine.

**Aucun import relatif ne traverse une frontière de layer.** Les échanges inter-layers
passent par l'auto-import (composables, composants, stores).

## 5. Détail des layers

### 5.1 `technical/ApiClient`

Possède le client `laravel-raom-nuxt` et le transport du token. Ne connaît aucun domaine
métier.

```
technical/ApiClient/
├── nuxt.config.ts
├── README.md
└── app/
    ├── plugins/laravel-raom.ts
    ├── stores/useApiSessionStore.ts
    ├── types/api-session.d.ts
    └── tests/stores/useApiSessionStore.test.ts
```

`nuxt.config.ts` active les décorateurs, sans lesquels les décorateurs
`@Resource` / `@Field` cassent silencieusement :

```ts
export default defineNuxtConfig({
  experimental: { decorators: true },
})
```

`app/types/api-session.d.ts` — la forme renvoyée par `TokenIssuer`, en snake_case parce
que c'est le contrat de l'API :

```ts
export interface IIssuedToken {
  token: string
  token_type: string
  expires_at: string
  idle_timeout_minutes: number
}
```

`app/stores/useApiSessionStore.ts` — store **setup**, persisté en cookie pour que le SSR
voie le token :

```ts
export const useApiSessionStore = defineStore('api-session', () => {
  const token = ref<string | null>(null)
  const expiresAt = ref<string | null>(null)

  const isAuthenticated = computed(() => token.value !== null)

  const start = (issued: IIssuedToken) => {
    token.value = issued.token
    expiresAt.value = issued.expires_at
  }

  const clear = () => {
    token.value = null
    expiresAt.value = null
  }

  return { token, expiresAt, isAuthenticated, start, clear }
}, {
  persist: { storage: 'cookies' },
})
```

`app/plugins/laravel-raom.ts` — **seul** endroit où l'authentification et le HTTP sont
câblés :

```ts
export default defineNuxtPlugin(() => {
  const { apiUrl } = useRuntimeConfig().public
  const sessionStore = useApiSessionStore()
  const { notifyError } = useNotification()

  const customFetch = $fetch.create({
    baseURL: `${apiUrl}/api/v1`,
    onRequest: ({ options }) => {
      options.headers.set('Accept', 'application/json')

      if (sessionStore.token !== null) {
        options.headers.set('Authorization', `Bearer ${sessionStore.token}`)
      }
    },
    onResponseError: ({ response }) => {
      if (response.status === 401) {
        sessionStore.clear()
        notifyError('your session has expired, please sign in again')
      }
    },
  })

  return { provide: { laravelRaom: { fetch: customFetch } } }
})
```

Les 422 ne sont pas interceptés : ils remontent pour que les formulaires affichent les
erreurs de validation champ par champ.

**Conventions documentées dans le `README.md` de la layer**, à appliquer par les futures
layers fonctionnelles :

- Les modèles `laravel-raom` vivent dans `app/models/` de **leur** layer fonctionnelle,
  qui déclare alors `imports: { dirs: ['app/models'] }` dans son propre `nuxt.config.ts`
  — `imports.dirs` se résout relativement à la layer, donc la déclaration ne peut pas
  être centralisée ici.
- Le rafraîchissement du token avant expiration appartient à `functional/Users`, qui
  possède l'endpoint `token/refresh`. Elle alimentera `useApiSessionStore` sans modifier
  ce plugin.
- La redirection vers l'écran de connexion sur 401 arrivera avec `functional/Users` :
  le socle n'a pas de route `/login`, rediriger dessus produirait un 404.

### 5.2 `technical/Vuetify`

Setup **générique** du package, réutilisable tel quel sur un autre projet XEFI.

```
technical/Vuetify/
├── nuxt.config.ts
├── README.md
└── app/plugins/vuetify.ts
```

`nuxt.config.ts` : `build.transpile: ['vuetify']`, `vite.ssr.noExternal: ['vuetify']`,
`vite.vue.template.transformAssetUrls`.

`app/plugins/vuetify.ts` : `createVuetify({ ssr: true })`, jeu d'icônes **MDI** par
défaut, et le thème obtenu via `useProjectTheme()` — auto-importé depuis `Theme`.

**Contrat de la layer** (à écrire dans son `README.md`) : `Vuetify` attend qu'une autre
layer expose un composable `useProjectTheme()` retournant une `ThemeDefinition`. C'est ce
qui permet de reprendre cette layer à l'identique ailleurs en ne réécrivant que `Theme`.

Aucune couleur, aucun token de marque ici.

### 5.3 `technical/Theme`

Spécifique au projet : identité visuelle et coquille applicative.

```
technical/Theme/
├── nuxt.config.ts
├── README.md
└── app/
    ├── assets/scss/main.scss
    ├── components/AppHeader.vue
    ├── composables/useProjectTheme.ts
    ├── layouts/default.vue
    ├── pages/index.vue
    ├── stories/components/AppHeader.stories.ts
    └── tests/components/AppHeader.test.ts
```

- `useProjectTheme()` retourne la `ThemeDefinition` Vuetify du projet. Le thème par
  défaut de Vuetify est conservé — il n'existe pas de thème XEFI transverse — et cette
  layer est l'unique endroit où le faire diverger.
- `layouts/default.vue` : `v-app` › `v-app-bar` (`AppHeader`) › `v-main`.
- `AppHeader.vue` : titre de l'application et `LangSelect` (auto-importé depuis
  `Internationalization`). Logo en `<img>` natif, pas `v-img`, pour qu'il soit dans le
  HTML rendu côté serveur.
- `pages/index.vue` : page minimale confirmant que le socle tourne. Kebab-case, donc
  `index.vue`.
- Les classes personnalisées suivent BEM, et un élément ne mélange jamais classes
  utilitaires Vuetify et règle scopée.

### 5.4 `technical/Internationalization`

```
technical/Internationalization/
├── nuxt.config.ts
├── README.md
├── lang/
│   ├── en.json
│   └── fr.json
└── app/
    ├── components/LangSelect.vue
    ├── stories/components/LangSelect.stories.ts
    └── tests/components/LangSelect.test.ts
```

`@nuxtjs/i18n` déclaré ici. Locales `fr` (défaut) et `en`, calquées sur l'enum `Locale`
de l'API.

JSON **plat**, clé = la phrase anglaise en minuscules, valeur = la traduction. Dans
`en.json`, clé = valeur. Seules les chaînes **transverses** vivent ici ; le métier ira
dans le `lang/` de sa propre layer, que nuxt-i18n fusionnera dans le même dictionnaire.

Contenu initial : navigation, sélecteur de langue, erreurs génériques, et les messages de
validation consommés par `Forms` :

```json
{
  "this field is required": "Ce champ est obligatoire",
  "enter a valid email address": "Saisissez une adresse e-mail valide",
  "enter at least {min} characters": "Saisissez au moins {min} caractères",
  "enter at most {max} characters": "Saisissez au plus {max} caractères",
  "your session has expired, please sign in again": "Votre session a expiré, veuillez vous reconnecter"
}
```

Point d'extension documenté dans le `README.md` : l'API renvoie `user.locale` à la
connexion ; `functional/Users` posera la locale de l'utilisateur au démarrage de session.

### 5.5 `technical/Notification`

```
technical/Notification/
├── nuxt.config.ts
├── README.md
└── app/
    ├── composables/useNotification.ts
    ├── plugins/toastify.ts
    └── tests/composables/useNotification.test.ts
```

`plugins/toastify.ts` enregistre `vue3-toastify` et sa feuille de style.

`useNotification()` expose `notifySuccess`, `notifyError`, `notifyWarning`, qui traduisent
leur message via `useI18n()` avant de le passer à `toast`. Les appelants passent donc une
clé de traduction, jamais une chaîne en dur.

`v-snackbar` est interdit pour tout nouveau besoin de notification.

### 5.6 `technical/Forms`

```
technical/Forms/
├── nuxt.config.ts
├── README.md
└── app/
    ├── composables/useValidationRules.ts
    └── tests/composables/useValidationRules.test.ts
```

`useValidationRules()` retourne `required`, `email`, `minLength(min)`, `maxLength(max)`,
chacune renvoyant `true` ou un message traduit. C'est l'unique déclaration de ces règles
dans le projet : aucun formulaire ne redéclare son propre `required`.

### 5.7 `technical/Monitoring`

```
technical/Monitoring/
├── nuxt.config.ts
└── README.md
```

`@sentry/nuxt` déclaré ici, DSN lu depuis `runtimeConfig.public.sentryDsn`. Sentry ne
s'initialise que si le DSN est renseigné, ce qui le laisse inerte en développement.

Les fichiers `sentry.client.config.ts` et `sentry.server.config.ts` sont résolus depuis la
racine du projet par le module, donc ils y restent. Si le module expose une option de
chemin, les déplacer dans la layer.

## 6. Dépendances

Toutes issues de la liste approuvée XEFI, plus `nuxt-osdd` et
`pinia-plugin-persistedstate` (sanctionné par la skill Pinia pour la persistance d'un
token).

**Runtime** : `nuxt` ^4, `vue`, `vue-router`, `nuxt-osdd`, `pinia`, `@pinia/nuxt`,
`@pinia-plugin-persistedstate/nuxt`, `@nuxtjs/i18n`, `vuetify` ^3, `@mdi/font`,
`laravel-raom-nuxt`, `vue3-toastify`, `@sentry/nuxt`, `sass`, `sass-loader`.

**Développement** : `@nuxt/eslint`, `eslint`, `prettier`, `@nuxt/test-utils`, `vitest`,
`happy-dom`, `@vue/test-utils`, `typescript`, `vue-tsc`, Storybook et son intégration
Nuxt.

`pnpm` exclusivement. `pnpm-lock.yaml` est le seul lockfile committé ; ni
`package-lock.json` ni `yarn.lock`.

## 7. Variables d'environnement

`.env.example` :

```
NUXT_PUBLIC_API_URL=http://localhost:8000
NUXT_PUBLIC_SENTRY_DSN=
```

Le client API construit sa `baseURL` en `${apiUrl}/api/v1`.

## 8. Tests et stories

Jamais co-localisés. Chaque layer porte ses `app/tests/` et `app/stories/` en miroir de
son `app/`, à plat, en `.test.ts` et `.stories.ts`.

Tests livrés par le socle :

| Fichier | Vérifie |
|---|---|
| `ApiClient/app/tests/stores/useApiSessionStore.test.ts` | `start` pose token et expiration, `clear` les purge, `isAuthenticated` suit |
| `Forms/app/tests/composables/useValidationRules.test.ts` | chaque règle accepte le valide et rejette l'invalide avec le bon message |
| `Notification/app/tests/composables/useNotification.test.ts` | chaque niveau appelle `toast` avec le message traduit |
| `Theme/app/tests/components/AppHeader.test.ts` | le header rend le titre et contient `LangSelect` |
| `Internationalization/app/tests/components/LangSelect.test.ts` | liste les deux locales et émet le changement |

Stories livrées : `AppHeader.stories.ts`, `LangSelect.stories.ts`.

`.storybook/main.ts` ne scanne que les stories des layers :
`technical/*/app/stories/**/*.stories.ts` et `functional/*/app/stories/**/*.stories.ts`.

## 9. Critères d'acceptation

La branche est terminée quand **toutes** ces commandes passent, sortie constatée :

1. `pnpm install` — n'écrit que `pnpm-lock.yaml`.
2. `pnpm dev` — `/` répond en 200 et rend le layout, le header et le sélecteur de langue.
3. `pnpm build` — succès.
4. `pnpm lint` — aucune erreur.
5. `pnpm typecheck` (`vue-tsc --noEmit`) — aucune erreur.
6. `pnpm test` — les 5 tests ci-dessus verts.
7. Storybook démarre et affiche les 2 stories.
8. Basculer de `fr` à `en` change les chaînes affichées ; `fr` est la locale par défaut.

Et ces vérifications structurelles :

9. Les décorateurs compilent : une classe `@Resource`/`@Field` temporaire, placée dans une
   layer, passe `pnpm build`. Si `experimental.decorators` déclaré dans
   `technical/ApiClient/nuxt.config.ts` ne suffit pas à cause de la fusion des configs de
   layers, le remonter dans le `nuxt.config.ts` racine. La classe est supprimée après
   vérification.
10. Aucun `app/` à la racine, aucune layer générique, aucun import relatif traversant une
    frontière de layer.

## 10. Points à confirmer à l'implémentation

Trois éléments dépendent de versions et doivent être vérifiés contre la documentation
installée plutôt que supposés :

- **`@nuxtjs/i18n`** : l'emplacement des fichiers de traduction a changé entre versions
  majeures. Le socle vise `lang/` avec `langDir` déclaré explicitement ; ajuster au
  comportement de la version installée sans renoncer au `lang/` par layer.
- **Intégration Storybook–Nuxt** : confirmer le paquet à utiliser et sa configuration de
  `stories`.
- **`@sentry/nuxt`** : confirmer d'où le module résout `sentry.*.config.ts`.

## 11. Écarts assumés par rapport aux skills

Trois écarts, chacun délibéré.

**Layers à la racine, pas sous `layers/`.** La skill `nuxt:osdd-structure` décrit
`layers/technical/X` **et** affirme que Nuxt détecte les layers sans `extends`. Les deux
sont incompatibles : la documentation Nuxt confirme que seuls les enfants **directs** de
`~~/layers/` sont auto-enregistrés, et qu'ils doivent contenir un `nuxt.config.ts` —
`layers/technical/Theme`, à deux niveaux, n'est donc jamais détecté. Le package
`nuxt-osdd` que la skill cite comme implémentation sanctionnée place d'ailleurs les layers
à la racine. Cette disposition a en outre l'avantage d'être identique à celle de
`wardrobe-management-api` (`functional/wardrobe`, `technical/media`). Arbitrage validé
par l'utilisateur.

**Layers déclarées dans la clé `osdd`.** Corollaire du point précédent : la clé `osdd`
alimente `extends`, ce que la skill qualifie d'anti-pattern. Aucune alternative n'existe
avec cette disposition, et la clé reste un manifeste déclaratif que la CLI
`nuxt-osdd osdd:layer` maintient.

**Notification en composable, pas en store Pinia.** La skill `nuxt:vuetify` suggère un
store Pinia pour centraliser les notifications ; la skill `nuxt:pinia-management` interdit
de promouvoir un composable en store sans état réellement partagé. Un émetteur de toasts
est sans état : il reste un composable. Il sera promu en store le jour où une file
d'attente ou une déduplication demandera d'en conserver l'état.
