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
├── tsconfig.json
├── package.json
├── pnpm-workspace.yaml
├── .env.example
├── .nuxtrc
├── eslint.config.mjs
├── .prettierrc
├── vitest.config.ts
├── vitest.setup.ts
├── sentry.client.config.ts
├── sentry.server.config.ts
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
leur message avant de le passer à `toast`. Les appelants passent donc une clé de traduction,
jamais une chaîne en dur.

La traduction passe par `useNuxtApp().$i18n.t()` et **non** par `useI18n()`, qui exige un
contexte `setup` de composant. Un layer technique doit rester appelable depuis un plugin, un
middleware ou un store — et c'est précisément ce que fait le plugin de `technical/ApiClient`
pour notifier une session expirée.

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

**Runtime** : `nuxt` 4, `vue`, `vue-router`, `nuxt-osdd`, `pinia` 4, `@pinia/nuxt`,
`pinia-plugin-persistedstate`, `@nuxtjs/i18n` 10, `vuetify` 4, `@mdi/font`,
`laravel-raom-nuxt`, `vue3-toastify`, `@sentry/nuxt`, `sass`, `sass-loader`.

**Développement** : `@nuxt/eslint`, `eslint`, `prettier`, `@nuxt/test-utils`, `vitest`,
`happy-dom`, `@vue/test-utils`, `typescript` 5, `vue-tsc`, et les trois paquets Babel que
`experimental.decorators` réclame (`@rollup/plugin-babel`,
`@babel/plugin-proposal-decorators`, `@babel/plugin-syntax-typescript`).

Deux substitutions par rapport à l'intention initiale, imposées par l'écosystème :
`pinia-plugin-persistedstate` remplace `@pinia-plugin-persistedstate/nuxt`, marqué
deprecated sur npm — le paquet vivant expose lui-même un module Nuxt via son entrée
`./nuxt`. Et `typescript` est tenu en 5.x parce que `@typescript-eslint` exige `< 6.1.0`.

**Storybook est absent** : voir la section 12.

Les scripts de build de `@parcel/watcher`, `@sentry/cli`, `esbuild` et `unrs-resolver` sont
autorisés dans `pnpm-workspace.yaml` — pnpm 11 ne lit plus ce réglage depuis
`package.json`.

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

Aucune story n'est livrée, Storybook étant hors d'atteinte sur Nuxt 4 — voir la section 12.
La convention d'emplacement (`app/stories/` par layer, en miroir de `app/`) reste celle à
appliquer le jour où Storybook devient installable.

Deux éléments d'infrastructure de test se sont avérés nécessaires :

- `vitest.setup.ts` enregistre Vuetify dans `config.global.plugins` de `@vue/test-utils`.
  `mountSuspended` monte dans l'application de VTU, pas dans celle de Nuxt, donc le
  `nuxtApp.vueApp.use(vuetify)` du plugin ne s'y applique pas.
- Les tests de composables passent par un composant hôte minimal, parce que `useI18n()`
  exige un contexte `setup`. Le helper est déclaré localement dans chaque fichier de test
  concerné plutôt que partagé : le mutualiser dans un `app/utils/` de layer le ferait
  entrer dans le bundle applicatif.

Un test de composant Vuetify dépendant du layout (`v-app-bar`, `v-main`) doit être monté
dans un `v-app`, sinon Vuetify lève « Could not find injected layout ».

## 9. Critères d'acceptation

La branche est terminée quand **toutes** ces vérifications passent, sortie constatée :

1. `pnpm install` — n'écrit que `pnpm-lock.yaml`.
2. `pnpm build` puis service de `.output` — `/` répond en 200 et le **HTML rendu côté
   serveur** contient `v-application`, `v-app-bar`, `v-main`, le titre traduit et le
   sélecteur de langue. Vérifier le HTML, pas seulement le code de statut : une application
   dont les composants ne se résolvent pas répond quand même 200 avec un
   `<div id="__nuxt"><!----></div>` vide.
3. `pnpm lint` — aucune erreur.
4. `pnpm typecheck` — aucune erreur.
5. `pnpm test` — les 5 fichiers de test verts.
6. `fr` est la locale par défaut et les deux dictionnaires sont construits.
7. Les décorateurs compilent : une classe `@Resource`/`@Field` temporaire, consommée par une
   page temporaire pour garantir sa compilation, produit son chunk au build. La sonde est
   supprimée ensuite.
8. Aucun `app/` à la racine, aucune layer générique, aucun import relatif traversant une
   frontière de layer.

## 10. Résultat des points laissés ouverts

Les trois éléments dépendants de versions ont été tranchés contre les paquets installés :

- **`@nuxtjs/i18n` 10** résout les traductions en `<layer>/<restructureDir>/<langDir>`, avec
  `restructureDir` à `i18n` et `langDir` à `locales` par défaut. Le socle vise `<layer>/lang/`
  via `restructureDir: '.'` et `langDir: 'lang'`, ce qui conserve le `lang/` par layer voulu.
- **Storybook** est inatteignable sur Nuxt 4 — voir la section 12.
- **`@sentry/nuxt`** résout bien `sentry.client.config.ts` et `sentry.server.config.ts` depuis
  la racine du projet ; ils y restent. Le build confirme la présence de
  `.output/server/sentry.server.config.mjs`.

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

## 12. Ce que l'implémentation a démenti

Consigné ici parce que plusieurs de ces points contredisent une skill ou la documentation
d'un paquet, et qu'un futur lecteur du dépôt reproduira l'erreur sans cette trace.

### Storybook est retiré du périmètre

`@nuxtjs/storybook` 9 repose sur `@storybook-vue/nuxt`, dont la `peerDependency` est
`nuxt ^3.13.0`. L'intégration ne supporte pas Nuxt 4. Son arbre est de surcroît
contradictoire : elle épingle `storybook ~9.0.5` alors que ses propres `@storybook/*` en
9.1.2 réclament `^9.1.2`.

Deux issues restaient, aucune satisfaisante : rester sur Nuxt 3, ce qui contredirait le
standard et la structure `app/` du socle ; ou brancher `@storybook/vue3-vite` sans le module
Nuxt, ce qui priverait les stories des auto-imports dont tous nos composants dépendent et
imposerait de tout simuler à la main. Storybook attendra donc que l'intégration supporte
Nuxt 4. La convention `app/stories/` reste documentée.

### Ce que les skills annoncent et qui se révèle faux

- **Les `stores/` d'une layer ne sont pas auto-importés.** La skill `nuxt:osdd-structure`
  affirme que Pinia les prend « à la racine comme dans chaque layer ». Faux : le module
  n'ajoute que le `stores/` de la `srcDir` racine. Il faut déclarer le dossier de la layer
  dans son propre `imports.dirs`. Même constat pour `laravel-raom-nuxt`, dont le module fait
  `addImportsDir(srcDir + "/models")` — ce qui **confirme** en revanche la consigne du
  README d'`ApiClient` : chaque layer fonctionnelle déclarera ses propres modèles.
- **`~/` dans la config d'une layer résout vers la racine du projet**, pas vers la layer. Un
  chemin de layer doit passer par `fileURLToPath(new URL('./…', import.meta.url))`.
- **`defineNuxtConfig` n'est pas typé dans la config d'une layer** : il faut l'importer
  explicitement depuis `nuxt/config`, sinon `nuxt typecheck` échoue.
- **Une clé apportée par un module n'est typée que là où ce module est déclaré.**
  `pinia.storesDirs` dans la config d'`ApiClient` ne type pas, le module étant déclaré à la
  racine. `imports.dirs`, qui est du cœur de Nuxt, fonctionne partout — et c'est l'usage
  même que la skill OSDD réserve aux dossiers non auto-importés.
- **`createVuetify()` n'enregistre aucun composant** sans `components` et `directives`
  explicites, contrairement à ce que suggère « les composants Vuetify sont enregistrés
  globalement par le plugin ». Le coût est l'absence de tree-shaking : environ 850 ko de
  build en plus. `vite-plugin-vuetify` le rétablirait, au prix d'une dépendance hors liste
  approuvée — à arbitrer plus tard, pas pendant un scaffolding.

### Autres constats

- **`experimental.decorators` exige trois paquets Babel** (`@rollup/plugin-babel`,
  `@babel/plugin-proposal-decorators`, `@babel/plugin-syntax-typescript`). Sans eux, Nuxt
  émet un simple avertissement et les décorateurs ne fonctionnent pas.
- **Déclaré dans `technical/ApiClient/nuxt.config.ts`, `experimental.decorators` suffit** :
  la fusion des configs de layers le propage, il n'a pas fallu le remonter à la racine.
- **`laravel-raom-nuxt` doit être déclaré comme module**, pas seulement consommé via son
  plugin : c'est le module qui enregistre le plugin interne du paquet.
- **`nuxt typecheck` exige un `tsconfig.json` racine** référençant les quatre tsconfig
  générés par Nuxt 4.
- **La détection de langue du navigateur prenait le pas sur `defaultLocale`.** Elle est
  désactivée (`detectBrowserLanguage: false`) : l'API fait autorité sur la locale via
  `user.locale`, et son défaut est `fr`. Une détection navigateur entrerait en conflit avec
  cette source de vérité, en plus de rendre les tests non déterministes.
- **Un rendu vide répond 200.** Le premier build servait un `<div id="__nuxt"><!----></div>`
  avec un statut 200 : les composants Vuetify ne se résolvaient pas, le layout échouait, donc
  `NuxtPage` ne montait jamais. Les tests, eux, passaient — `vitest.setup.ts` fournissait
  Vuetify correctement à `@vue/test-utils` et masquait le défaut du plugin applicatif. D'où le
  critère d'acceptation n° 2, qui exige d'inspecter le HTML et non le seul code de statut.
