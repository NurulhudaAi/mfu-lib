'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, type Locale, type TranslationKey } from './i18n'
import { useProfile, type Profile } from './useProfile'

interface AppContextType {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: TranslationKey) => string
  theme: 'light' | 'dark'
  toggleTheme: () => void
  profile: Profile | null
  profileLoading: boolean
}  

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('th')
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const { profile, loading: profileLoading } = useProfile()  

  useEffect(() => {
    const savedLocale = localStorage.getItem('locale') as Locale | null
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedLocale) setLocaleState(savedLocale)
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    } else {
      document.documentElement.classList.add('dark')
    }
  }, [])

  function setLocale(l: Locale) {
    setLocaleState(l)
    localStorage.setItem('locale', l)
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  function t(key: TranslationKey): string {
    return translations[locale][key] || translations.th[key] || key
  }

  return (
    <AppContext.Provider value={{ locale, setLocale, t, theme, toggleTheme, profile, profileLoading }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}