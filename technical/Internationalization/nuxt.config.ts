import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],

  i18n: {
    restructureDir: '.',
    langDir: 'lang',
    defaultLocale: 'fr',
    strategy: 'no_prefix',
    detectBrowserLanguage: false,
    locales: [
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' },
      { code: 'en', language: 'en-GB', name: 'English', file: 'en.json' },
    ],
  },
})
