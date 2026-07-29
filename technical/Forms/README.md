# technical/Forms

Owns the validation rules consumed by Vuetify's `:rules` prop.

## What it owns

`app/composables/useValidationRules.ts` — `required`, `email`, `minLength(min)`,
`maxLength(max)`. Each returns `true` when the value is acceptable, or a translated message.

## Usage

```vue
<script setup lang="ts">
const { required, email } = useValidationRules()
</script>

<template>
  <v-text-field :rules="[required, email]" />
</template>
```

## The rule this layer exists to enforce

**No form declares its own validation rule.** A `const required = (value) => !!value ||
'Required'` inside a component is the anti-pattern this layer removes: it scatters the
wording across every screen, so a message tweak becomes a thirty-file sweep and the tone
drifts between forms.

Adding a rule means adding it here, plus its message in every locale file of
`technical/Internationalization`. When you meet a component declaring a rule inline, lift it
into this composable and have the component consume it.

Parameterised rules compose naturally here (`minLength(8)`, `maxLength(255)`) — that is
awkward to do when the rule is copy-pasted.

## Validation library

None. The project uses Vuetify's `v-form` with inline `:rules`. Do not introduce Vuelidate
or VeeValidate without a discussion — a second validation approach next to this one splits
the convention.
