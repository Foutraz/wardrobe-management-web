<template>
  <v-app-bar flat>
    <v-app-bar-title>{{ $t('wardrobe') }}</v-app-bar-title>

    <template #append>
      <LangSelect />
    </template>
  </v-app-bar>
</template>
