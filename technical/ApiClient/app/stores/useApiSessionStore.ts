import type { IIssuedToken } from '../types/api-session'

export const useApiSessionStore = defineStore(
  'api-session',
  () => {
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
  },
  {
    persist: {
      storage: piniaPluginPersistedstate.cookies({
        sameSite: 'lax',
        secure: !import.meta.dev,
      }),
    },
  },
)
