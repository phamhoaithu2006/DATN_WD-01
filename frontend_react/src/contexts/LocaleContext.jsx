/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '../services/apiClient'

const LocaleContext = createContext(null)

const LOCALE_STORAGE_KEY = 'vivugo_language'
const LANGUAGE_MANUAL_KEY = 'vivugo_language_manual'
const SETTINGS_STORAGE_KEY = 'vivugo_locale_settings'

const defaultLocaleSettings = {
  default_language: 'vi',
  timezone: 'Asia/Ho_Chi_Minh',
  date_format: 'dd/mm/yyyy',
  currency: 'VND',
}

function readStoredSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!stored) return defaultLocaleSettings

    const parsed = JSON.parse(stored)

    // Ép về string — phòng cache cũ bị object/array
    return {
      default_language: typeof parsed.default_language === 'string' ? parsed.default_language : defaultLocaleSettings.default_language,
      timezone: typeof parsed.timezone === 'string' ? parsed.timezone : defaultLocaleSettings.timezone,
      date_format: typeof parsed.date_format === 'string' ? parsed.date_format : defaultLocaleSettings.date_format,
      currency: typeof parsed.currency === 'string' ? parsed.currency : defaultLocaleSettings.currency,
    }
  } catch {
    return defaultLocaleSettings
  }
}

/**
 * Ánh xạ date_format setting sang Intl.DateTimeFormat options
 */
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

/**
 * Ánh xạ date_format sang locale phù hợp cho Intl
 */
function dateFormatToLocale(format, language) {
  switch (format) {
    case 'yyyy-mm-dd':
      return 'sv-SE' // yyyy-mm-dd format
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

  // Fetch locale settings từ public API
  useEffect(() => {
    let active = true

    async function loadPublicSettings() {
      try {
        const { data } = await apiClient.get('/settings/public')
        const publicSettings = data.data || data

        const localeSettings = {
          default_language: publicSettings.default_language || defaultLocaleSettings.default_language,
          timezone: publicSettings.timezone || defaultLocaleSettings.timezone,
          date_format: publicSettings.date_format || defaultLocaleSettings.date_format,
          currency: publicSettings.currency || defaultLocaleSettings.currency,
        }

        if (active) {
          setSettings(localeSettings)
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(localeSettings))

          // Áp dụng ngôn ngữ từ server nếu user chưa từng chọn ngôn ngữ
          const userChoseLanguage = localStorage.getItem(LANGUAGE_MANUAL_KEY) === '1'
          if (!userChoseLanguage && localeSettings.default_language) {
            i18n.changeLanguage(localeSettings.default_language)
            localStorage.setItem(LOCALE_STORAGE_KEY, localeSettings.default_language)
            localStorage.removeItem(LANGUAGE_MANUAL_KEY)
          }

          setLoaded(true)
        }
      } catch {
        // Dùng settings đã cache hoặc default
        if (active) setLoaded(true)
      }
    }

    loadPublicSettings()

    return () => {
      active = false
    }
  }, [i18n])

  // Đổi ngôn ngữ
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

  // Format ngày theo setting
  const formatDate = useCallback(
    (dateValue) => {
      if (!dateValue) return ''

      try {
        const date = dateValue instanceof Date ? dateValue : new Date(dateValue)
        if (isNaN(date.getTime())) return String(dateValue)

        const locale = dateFormatToLocale(settings.date_format, i18n.language)
        const options = {
          ...dateFormatToIntlOptions(settings.date_format),
          timeZone: settings.timezone,
        }

        return new Intl.DateTimeFormat(locale, options).format(date)
      } catch {
        return String(dateValue)
      }
    },
    [settings.date_format, settings.timezone, i18n.language],
  )

  // Format ngày + giờ theo setting
  const formatDateTime = useCallback(
    (dateValue) => {
      if (!dateValue) return ''

      try {
        const date = dateValue instanceof Date ? dateValue : new Date(dateValue)
        if (isNaN(date.getTime())) return String(dateValue)

        const locale = dateFormatToLocale(settings.date_format, i18n.language)
        const options = {
          ...dateFormatToIntlOptions(settings.date_format),
          hour: '2-digit',
          minute: '2-digit',
          timeZone: settings.timezone,
        }

        return new Intl.DateTimeFormat(locale, options).format(date)
      } catch {
        return String(dateValue)
      }
    },
    [settings.date_format, settings.timezone, i18n.language],
  )

  // Format tiền tệ theo setting
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

  // Format số theo locale
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

  // Lấy tên timezone hiển thị
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
