import * as Sentry from '@sentry/nuxt'

const sentryDsn = tryUseNuxtApp()?.$config.public.sentryDsn ?? ''

if (sentryDsn !== '') {
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: 0.1,
  })
}
