import * as Sentry from '@sentry/nuxt'

const serverSentryDsn = process.env.NUXT_PUBLIC_SENTRY_DSN ?? ''

if (serverSentryDsn !== '') {
  Sentry.init({
    dsn: serverSentryDsn,
    tracesSampleRate: 0.1,
  })
}
