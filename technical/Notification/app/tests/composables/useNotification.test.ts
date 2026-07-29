import { mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { useNotification } from '../../composables/useNotification'

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
}))

vi.mock('vue3-toastify', () => ({ toast: toastMock }))

let notification: ReturnType<typeof useNotification>

beforeAll(async () => {
  await mountSuspended(
    defineComponent({
      setup: () => {
        notification = useNotification()

        return () => null
      },
    }),
  )
})

describe('useNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends the translated message to the success toast', () => {
    notification.notifySuccess('the technical foundation is up and running')

    expect(toastMock.success).toHaveBeenCalledWith('Le socle technique est opérationnel')
  })

  it('sends the translated message to the error toast', () => {
    notification.notifyError('your session has expired, please sign in again')

    expect(toastMock.error).toHaveBeenCalledWith('Votre session a expiré, veuillez vous reconnecter')
  })

  it('sends the translated message to the warning toast', () => {
    notification.notifyWarning('something went wrong, please try again')

    expect(toastMock.warning).toHaveBeenCalledWith('Une erreur est survenue, veuillez réessayer')
  })
})
