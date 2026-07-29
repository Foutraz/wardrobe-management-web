import { defineNuxtConfig } from 'nuxt/config'
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  modules: ['laravel-raom-nuxt'],

  experimental: {
    decorators: true,
  },

  imports: {
    dirs: [fileURLToPath(new URL('./app/stores', import.meta.url))],
  },
})
