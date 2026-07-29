import { toast } from 'vue3-toastify'

export const useNotification = () => {
  const { $i18n } = useNuxtApp()

  const notifySuccess = (translationKey: string) => {
    toast.success($i18n.t(translationKey))
  }

  const notifyError = (translationKey: string) => {
    toast.error($i18n.t(translationKey))
  }

  const notifyWarning = (translationKey: string) => {
    toast.warning($i18n.t(translationKey))
  }

  return { notifySuccess, notifyError, notifyWarning }
}
