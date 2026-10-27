'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, type Locale, type TranslationKey } from './i18n'
import { useProfile, type Profile } from './useProfile'
import { PREF_COOKIE_LOCALE, PREF_COOKIE_THEME, setPrefCookie } from './session-cookie'

export type AlertType = 'success' | 'warning' | 'error' | 'info'

export interface AlertModalOptions {
  type?: AlertType
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
  showCancel?: boolean
}

export interface ToastItem {
  id: string
  type: AlertType
  title?: string
  message: string
}

interface AppContextType {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: TranslationKey) => string
  theme: 'light' | 'dark'
  toggleTheme: () => void
  profile: Profile | null
  profileLoading: boolean
  searchQuery: string
  setSearchQuery: (q: string) => void
  selectedCategory: string
  setSelectedCategory: (c: string) => void
  statusFilter: 'all' | 'available' | 'active'
  setStatusFilter: (s: 'all' | 'available' | 'active') => void
  alertModal: AlertModalOptions | null
  showAlert: (options: AlertModalOptions) => void
  showConfirm: (options: AlertModalOptions) => void
  closeAlert: () => void
  toasts: ToastItem[]
  showToast: (message: string, type?: AlertType, title?: string) => void
  removeToast: (id: string) => void
}  

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({
  children,
  initialLocale = 'th',
  initialTheme = 'dark',
}: {
  children: ReactNode
  initialLocale?: Locale
  initialTheme?: 'light' | 'dark'
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'active'>('all')
  const [alertModal, setAlertModal] = useState<AlertModalOptions | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const { profile, loading: profileLoading } = useProfile()  

  // One-time migration: old versions stored prefs in localStorage → move to cookies
  useEffect(() => {
    try {
      const hasCookie = (n: string) => document.cookie.split(';').some(c => c.trim().startsWith(`${n}=`))
      const legacyLocale = localStorage.getItem('locale') as Locale | null
      const legacyTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
      if (legacyLocale && !hasCookie(PREF_COOKIE_LOCALE)) {
        setPrefCookie(PREF_COOKIE_LOCALE, legacyLocale)
        setLocaleState(legacyLocale)
      }
      if (legacyTheme && !hasCookie(PREF_COOKIE_THEME)) {
        setPrefCookie(PREF_COOKIE_THEME, legacyTheme)
        setTheme(legacyTheme)
        document.documentElement.classList.toggle('dark', legacyTheme === 'dark')
      }
      localStorage.removeItem('locale')
      localStorage.removeItem('theme')
    } catch { /* storage unavailable */ }
  }, [])

  function setLocale(l: Locale) {
    setLocaleState(l)
    setPrefCookie(PREF_COOKIE_LOCALE, l)
    document.documentElement.lang = l
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setPrefCookie(PREF_COOKIE_THEME, next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  function t(key: TranslationKey): string {
    return translations[locale][key] || translations.th[key] || key
  }

  function showAlert(options: AlertModalOptions) {
    // If it is an informational, success, warning or error alert without cancel action,
    // show it as a high-visibility Toast / Snackbar above all modals (no backdrop blocking)
    if (!options.showCancel) {
      showToast(options.message, options.type || 'info', options.title)
      return
    }

    setAlertModal({
      ...options,
      showCancel: false,
      confirmText: options.confirmText || (locale === 'th' ? 'เข้าใจแล้ว' : 'Got it'),
    })
  }

  function showConfirm(options: AlertModalOptions) {
    setAlertModal({
      ...options,
      showCancel: true,
      confirmText: options.confirmText || (locale === 'th' ? 'ยืนยัน' : 'Confirm'),
      cancelText: options.cancelText || (locale === 'th' ? 'ยกเลิก' : 'Cancel'),
    })
  }

  function closeAlert() {
    setAlertModal(null)
  }

  function showToast(message: string, type: AlertType = 'info', title?: string) {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5)
    setToasts((prev) => [...prev, { id, message, type, title }])
    setTimeout(() => {
      removeToast(id)
    }, 4500)
  }

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <AppContext.Provider value={{
      locale,
      setLocale,
      t,
      theme,
      toggleTheme,
      profile,
      profileLoading,
      searchQuery,
      setSearchQuery,
      selectedCategory,
      setSelectedCategory,
      statusFilter,
      setStatusFilter,
      alertModal,
      showAlert,
      showConfirm,
      closeAlert,
      toasts,
      showToast,
      removeToast,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}