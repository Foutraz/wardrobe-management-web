import { mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeAll, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { useValidationRules } from '../../composables/useValidationRules'

let rules: ReturnType<typeof useValidationRules>

beforeAll(async () => {
  await mountSuspended(
    defineComponent({
      setup: () => {
        rules = useValidationRules()

        return () => null
      },
    }),
  )
})

describe('useValidationRules', () => {
  it('accepts a filled value and rejects an empty one', () => {
    expect(rules.required('a shirt')).toBe(true)
    expect(rules.required(['a shirt'])).toBe(true)

    expect(rules.required('')).toBe('Ce champ est obligatoire')
    expect(rules.required(null)).toBe('Ce champ est obligatoire')
    expect(rules.required(undefined)).toBe('Ce champ est obligatoire')
    expect(rules.required([])).toBe('Ce champ est obligatoire')
  })

  it('rejects an unchecked checkbox but accepts a zero quantity', () => {
    expect(rules.required(false)).toBe('Ce champ est obligatoire')

    expect(rules.required(true)).toBe(true)
    expect(rules.required(0)).toBe(true)
  })

  it('accepts a well-formed email address and rejects a malformed one', () => {
    expect(rules.email('quentin@xefi.fr')).toBe(true)

    expect(rules.email('quentin@xefi')).toBe('Saisissez une adresse e-mail valide')
    expect(rules.email('quentin.xefi.fr')).toBe('Saisissez une adresse e-mail valide')
    expect(rules.email('')).toBe('Saisissez une adresse e-mail valide')
  })

  it('reports the boundary in the minimum length message', () => {
    const atLeastEight = rules.minLength(8)

    expect(atLeastEight('12345678')).toBe(true)
    expect(atLeastEight('1234567')).toBe('Saisissez au moins 8 caractères')
  })

  it('reports the boundary in the maximum length message', () => {
    const atMostThree = rules.maxLength(3)

    expect(atMostThree('abc')).toBe(true)
    expect(atMostThree('abcd')).toBe('Saisissez au plus 3 caractères')
  })
})
