import * as Sentry from '@sentry/nuxt'

const { sentryDsn } = useRuntimeConfig().public

if (sentryDsn !== '') {
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: 0.1,
  })
}
