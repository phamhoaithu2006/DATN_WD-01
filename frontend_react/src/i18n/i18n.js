import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import vi from '../locales/vi.json'
import en from '../locales/en.json'

const LOCALE_STORAGE_KEY = 'vivugo_language'

function getSavedLanguage() {
  try {
    return localStorage.getItem(LOCALE_STORAGE_KEY) || 'vi'
  } catch {
    return 'vi'
  }
}

i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: getSavedLanguage(),
  fallbackLng: 'vi',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
