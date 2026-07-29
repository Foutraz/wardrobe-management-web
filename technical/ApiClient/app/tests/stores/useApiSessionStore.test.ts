import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useApiSessionStore } from '../../stores/useApiSessionStore'
import type { IIssuedToken } from '../../types/api-session'

const issuedToken: IIssuedToken = {
  token: 'plain-text-token',
  token_type: 'Bearer',
  expires_at: '2026-07-29T12:00:00+00:00',
  idle_timeout_minutes: 120,
}

describe('useApiSessionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('holds no session before anything is started', () => {
    const sessionStore = useApiSessionStore()

    expect(sessionStore.token).toBeNull()
    expect(sessionStore.expiresAt).toBeNull()
    expect(sessionStore.isAuthenticated).toBe(false)
  })

  it('keeps the issued token and its expiry once the session starts', () => {
    const sessionStore = useApiSessionStore()

    sessionStore.start(issuedToken)

    expect(sessionStore.token).toBe('plain-text-token')
    expect(sessionStore.expiresAt).toBe('2026-07-29T12:00:00+00:00')
    expect(sessionStore.isAuthenticated).toBe(true)
  })

  it('drops the token and the expiry when the session is cleared', () => {
    const sessionStore = useApiSessionStore()

    sessionStore.start(issuedToken)
    sessionStore.clear()

    expect(sessionStore.token).toBeNull()
    expect(sessionStore.expiresAt).toBeNull()
    expect(sessionStore.isAuthenticated).toBe(false)
  })
})
