import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { VApp } from 'vuetify/components'
import AppHeader from '../../components/AppHeader.vue'

const mountInsideApplication = () =>
  mountSuspended(
    defineComponent({
      render: () => h(VApp, () => h(AppHeader)),
    }),
  )

describe('AppHeader', () => {
  it('renders the translated application name', async () => {
    const application = await mountInsideApplication()

    expect(application.text()).toContain('Dressing')
  })

  it('offers the language selector', async () => {
    const application = await mountInsideApplication()

    expect(application.find('.v-select').exists()).toBe(true)
  })
})
