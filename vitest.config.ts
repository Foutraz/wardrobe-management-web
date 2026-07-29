import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    include: ['{technical,functional}/*/app/tests/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    server: {
      deps: {
        inline: ['vuetify'],
      },
    },
  },
})
