/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '../services/apiClient'
import { formatDateDdMmYyyy, formatDateTimeDdMmYyyy } from '../utils/dateFormat'

const LocaleContext = createContext(null)

const LOCALE_STORAGE_KEY = 'vivugo_language'
const LANGUAGE_MANUAL_KEY = 'vivugo_language_manual'
const SETTINGS_STORAGE_KEY = 'vivugo_locale_settings'

const defaultLocaleSettings = {
  default_language: 'vi',
  timezone: 'Asia/Ho_Chi_Minh',
  date_format: 'dd/mm/yyyy',
  currency: 'VND',
  site_name: 'ViVuGo',
  logo_url: '',
  contact_email: '',
  hotline: '',
  address: '',
  footer_text: '',
  footer_hotline: '',
  footer_email: '',
  footer_address: '',
}

function readStoredSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!stored) return defaultLocaleSettings

    const parsed = JSON.parse(stored)

    return {
      ...defaultLocaleSettings,
      default_language: typeof parsed.default_language === 'string' ? parsed.default_language : defaultLocaleSettings.default_language,
      timezone: typeof parsed.timezone === 'string' ? parsed.timezone : defaultLocaleSettings.timezone,
      date_format: typeof parsed.date_format === 'string' ? parsed.date_format : defaultLocaleSettings.date_format,
      currency: typeof parsed.currency === 'string' ? parsed.currency : defaultLocaleSettings.currency,
      site_name: typeof parsed.site_name === 'string' ? parsed.site_name : defaultLocaleSettings.site_name,
      logo_url: typeof parsed.logo_url === 'string' ? parsed.logo_url : defaultLocaleSettings.logo_url,
      contact_email: typeof parsed.contact_email === 'string' ? parsed.contact_email : defaultLocaleSettings.contact_email,
      hotline: typeof parsed.hotline === 'string' ? parsed.hotline : defaultLocaleSettings.hotline,
      address: typeof parsed.address === 'string' ? parsed.address : defaultLocaleSettings.address,
      footer_text: typeof parsed.footer_text === 'string' ? parsed.footer_text : defaultLocaleSettings.footer_text,
      footer_hotline: typeof parsed.footer_hotline === 'string' ? parsed.footer_hotline : defaultLocaleSettings.footer_hotline,
      footer_email: typeof parsed.footer_email === 'string' ? parsed.footer_email : defaultLocaleSettings.footer_email,
      footer_address: typeof parsed.footer_address === 'string' ? parsed.footer_address : defaultLocaleSettings.footer_address,
    }
  } catch {
    return defaultLocaleSettings
  }
}

function dateFormatToIntlOptions(format) {
  switch (format) {
    case 'yyyy-mm-dd':
      return { year: 'numeric', month: '2-digit', day: '2-digit' }
    case 'mm/dd/yyyy':
      return { year: 'numeric', month: '2-digit', day: '2-digit' }
    case 'dd/mm/yyyy':
    default:
      return { year: 'numeric', month: '2-digit', day: '2-digit' }
  }
}

function dateFormatToLocale(format, language) {
  switch (format) {
    case 'yyyy-mm-dd':
      return 'sv-SE'
    case 'mm/dd/yyyy':
      return 'en-US'
    case 'dd/mm/yyyy':
    default:
      return language === 'en' ? 'en-GB' : 'vi-VN'
  }
}

export function LocaleProvider({ children }) {
  const { i18n } = useTranslation()
  const [settings, setSettings] = useState(readStoredSettings)
  const [loaded, setLoaded] = useState(false)

  const loadPublicSettings = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/settings/public')
      const publicSettings = data.data || data

      const nextSettings = {
        ...defaultLocaleSettings,
        ...publicSettings,
      }

      setSettings(nextSettings)
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings))

      const userChoseLanguage = localStorage.getItem(LANGUAGE_MANUAL_KEY) === '1'
      if (!userChoseLanguage && nextSettings.default_language) {
        i18n.changeLanguage(nextSettings.default_language)
        localStorage.setItem(LOCALE_STORAGE_KEY, nextSettings.default_language)
        localStorage.removeItem(LANGUAGE_MANUAL_KEY)
      }
    } catch {
      // Dùng settings đã cache hoặc mặc định.
    } finally {
      setLoaded(true)
    }
  }, [i18n])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPublicSettings()
    }, 0)

    const handleRefresh = () => {
      void loadPublicSettings()
    }

    window.addEventListener('vivugo-settings-updated', handleRefresh)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('vivugo-settings-updated', handleRefresh)
    }
  }, [loadPublicSettings])

  const changeLanguage = useCallback(
    (lang, options = {}) => {
      const manual = options.manual !== false
      i18n.changeLanguage(lang)
      localStorage.setItem(LOCALE_STORAGE_KEY, lang)
      if (manual) {
        localStorage.setItem(LANGUAGE_MANUAL_KEY, '1')
      } else {
        localStorage.removeItem(LANGUAGE_MANUAL_KEY)
      }
    },
    [i18n],
  )

  const formatDate = useCallback(
    (dateValue) => {
      if (!dateValue) return ''
      return formatDateDdMmYyyy(dateValue, String(dateValue))
    },
    [],
  )

  const formatDateTime = useCallback(
    (dateValue) => {
      if (!dateValue) return ''
      return formatDateTimeDdMmYyyy(dateValue, String(dateValue))
    },
    [],
  )

  const formatCurrency = useCallback(
    (amount) => {
      if (amount === null || amount === undefined) return ''

      try {
        const numAmount = Number(amount)
        if (isNaN(numAmount)) return String(amount)

        const locale = settings.currency === 'VND' ? 'vi-VN' : 'en-US'

        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: settings.currency,
          maximumFractionDigits: settings.currency === 'VND' ? 0 : 2,
        }).format(numAmount)
      } catch {
        return String(amount)
      }
    },
    [settings.currency],
  )

  const formatNumber = useCallback(
    (number) => {
      if (number === null || number === undefined) return ''

      try {
        const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'
        return new Intl.NumberFormat(locale).format(Number(number))
      } catch {
        return String(number)
      }
    },
    [i18n.language],
  )

  const getTimezoneName = useCallback(() => {
    try {
      return new Intl.DateTimeFormat(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
        timeZone: settings.timezone,
        timeZoneName: 'short',
      })
        .formatToParts(new Date())
        .find((part) => part.type === 'timeZoneName')?.value || settings.timezone
    } catch {
      return settings.timezone
    }
  }, [settings.timezone, i18n.language])

  const value = useMemo(
    () => ({
      language: i18n.language,
      timezone: settings.timezone,
      dateFormat: settings.date_format,
      currency: settings.currency,
      loaded,
      changeLanguage,
      reloadSettings: loadPublicSettings,
      formatDate,
      formatDateTime,
      formatCurrency,
      formatNumber,
      getTimezoneName,
      settings,
    }),
    [
      i18n.language,
      settings,
      loaded,
      changeLanguage,
      loadPublicSettings,
      formatDate,
      formatDateTime,
      formatCurrency,
      formatNumber,
      getTimezoneName,
    ],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const context = useContext(LocaleContext)

  if (!context) {
    throw new Error('useLocale phải được sử dụng bên trong LocaleProvider')
  }

  return context
}

export default LocaleContext
