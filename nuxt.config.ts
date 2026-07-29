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

  modules: ['@nuxt/eslint', '@pinia/nuxt', 'pinia-plugin-persistedstate/nuxt'],

  runtimeConfig: {
    public: {
      apiUrl: '',
      sentryDsn: '',
    },
  },

  typescript: {
    strict: true,
  },
})
