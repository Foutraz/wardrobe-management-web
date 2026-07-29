import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import LangSelect from '../../components/LangSelect.vue'

describe('LangSelect', () => {
  it('shows the active locale', async () => {
    const select = await mountSuspended(LangSelect)

    expect(select.text()).toContain('Français')
  })

  it('labels itself in the active locale', async () => {
    const select = await mountSuspended(LangSelect)

    expect(select.text()).toContain('Langue')
  })
})
