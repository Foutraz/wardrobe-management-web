const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const useValidationRules = () => {
  const { t } = useI18n()

  const required = (value: unknown) => {
    const isFilled = Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && value !== ''

    return isFilled || t('this field is required')
  }

  const email = (value: string) => EMAIL_PATTERN.test(value) || t('enter a valid email address')

  const minLength = (min: number) => (value: string) =>
    value.length >= min || t('enter at least {min} characters', { min })

  const maxLength = (max: number) => (value: string) =>
    value.length <= max || t('enter at most {max} characters', { max })

  return { required, email, minLength, maxLength }
}
