const UNAUTHORIZED = 401

export default defineNuxtPlugin(() => {
  const { apiUrl } = useRuntimeConfig().public
  const sessionStore = useApiSessionStore()
  const { notifyError } = useNotification()

  const customFetch = $fetch.create({
    baseURL: `${apiUrl}/api/v1`,

    onRequest: ({ options }) => {
      options.headers.set('Accept', 'application/json')

      if (sessionStore.token !== null) {
        options.headers.set('Authorization', `Bearer ${sessionStore.token}`)
      }
    },

    onResponseError: ({ response }) => {
      if (response.status !== UNAUTHORIZED) {
        return
      }

      sessionStore.clear()
      notifyError('your session has expired, please sign in again')
    },
  })

  return {
    provide: {
      laravelRaom: { fetch: customFetch },
    },
  }
})
