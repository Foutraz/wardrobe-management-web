# technical/Internationalization

Owns `@nuxtjs/i18n` and the **transverse** translation dictionary.

Locales are `fr` (default) and `en`, mirroring the `Locale` enum of
`wardrobe-management-api`.

## Translation conventions

- **Flat JSON.** No nested objects, no grouping by feature or screen.
- **The key is the full English sentence, lowercase.** `$t('this field is required')`, not
  `$t('validation.required')`.
- **In `en.json`, the value equals the key**, with its display casing. That file is the
  source of truth for which sentences exist, so a diff against `fr.json` reveals gaps.
- **Interpolation uses `{name}` placeholders**, identical across every locale. Never
  concatenate strings around `$t`.
- **A new key is added to every locale file in the same change.** Never leave a key in
  `en.json` alone.

## What belongs here, and what does not

Only strings more than one feature renders: navigation, shared buttons, generic errors, and
the validation messages consumed by `technical/Forms`.

Domain strings belong in the owning functional layer's own `lang/` folder — for example
`functional/Wardrobe/lang/fr.json`. nuxt-i18n merges every layer's files into one runtime
dictionary, which is exactly what makes the flat sentence-as-key form safe across layers. A
layer declares its own folder with `i18n: { restructureDir: '.', langDir: 'lang' }`.

Never duplicate a string between this file and a functional layer's file.

## Pending extension

The API returns `user.locale` on login. `functional/Users` will set the user's locale at
session start, so the interface follows the account preference rather than the browser. The
API resolves its own response language from `user.locale` too, not from a request header, so
there is no `Accept-Language` to send.
