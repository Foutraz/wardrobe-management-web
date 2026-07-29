# technical/Notification

Owns non-blocking user feedback: toasts, flash messages, and error notices.

## What it owns

- `app/plugins/toastify.ts` — registers `vue3-toastify` and its stylesheet.
- `app/composables/useNotification.ts` — `notifySuccess`, `notifyError`, `notifyWarning`.

## Usage

Callers pass a **translation key**, never a literal string, so no user-facing text is ever
hardcoded at a call site:

```ts
const { notifySuccess, notifyError } = useNotification()

notifySuccess('your changes have been saved')
notifyError('something went wrong, please try again')
```

The key must exist in every locale file of `technical/Internationalization`, or in the
owning functional layer's `lang/` folder when the message is domain-specific.

## Why a composable and not a Pinia store

A toast emitter holds no state: nothing is read or written by a second component. Pinia is
for state that must live above the component tree, so this stays a composable.

Promote it to a store the day it needs to *remember* something — a queue, deduplication of
repeated errors, or a notification history. That is the trigger, not the fact that several
components call it.

## Do not use `v-snackbar`

`v-snackbar` is the Vuetify primitive this layer replaces. It must not appear in new code.
