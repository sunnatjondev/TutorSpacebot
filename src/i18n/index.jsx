import { createContext, useContext, useState, useCallback } from 'react'
import uz from './uz'
import ru from './ru'

const translations = { uz, ru }

const I18nContext = createContext(null)

/**
 * Retrieves a nested key from translations, e.g. t('nav.home')
 * Supports template interpolation: t('role.greeting', { name: 'Alex' })
 */
function getNestedKey(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

function interpolate(str, vars = {}) {
  if (!str) return ''
  return str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('tutorspace_lang') || 'uz'
  })

  const setLanguage = useCallback((newLang) => {
    if (translations[newLang]) {
      setLang(newLang)
      localStorage.setItem('tutorspace_lang', newLang)
    }
  }, [])

  const t = useCallback(
    (key, vars = {}) => {
      const dict = translations[lang] || translations.uz
      const value = getNestedKey(dict, key)
      if (!value) {
        // Fallback to UZ if key missing in current lang
        const fallback = getNestedKey(translations.uz, key)
        return interpolate(fallback || key, vars)
      }
      return interpolate(value, vars)
    },
    [lang]
  )

  return (
    <I18nContext.Provider value={{ lang, setLanguage, t, languages: ['uz', 'ru'] }}>
      {children}
    </I18nContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
