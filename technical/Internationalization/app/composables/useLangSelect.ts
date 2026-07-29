export const useLangSelect = () => {
  const { locale, locales, setLocale } = useI18n()

  const availableLocales = computed(() =>
    locales.value.map((availableLocale) => ({
      code: availableLocale.code,
      name: availableLocale.name ?? availableLocale.code,
    })),
  )

  const selectLocale = async (code: (typeof locales.value)[number]['code']) => {
    await setLocale(code)
  }

  return { locale, availableLocales, selectLocale }
}
