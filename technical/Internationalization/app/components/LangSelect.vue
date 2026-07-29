<template>
  <v-select
    :model-value="locale"
    :items="availableLocales"
    :label="$t('language')"
    item-title="name"
    item-value="code"
    density="compact"
    variant="outlined"
    hide-details
    @update:model-value="selectLocale"
  />
</template>

<script setup lang="ts">
const { locale, availableLocales, selectLocale } = useLangSelect()
</script>
