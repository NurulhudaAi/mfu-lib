'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, type Locale, type TranslationKey } from './i18n'
import { useProfile, type Profile } from './useProfile'

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
  showToast: (message: string, type?: AlertType) => void
  removeToast: (id: string) => void
}  

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('th')
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'active'>('all')
  const [alertModal, setAlertModal] = useState<AlertModalOptions | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const { profile, loading: profileLoading } = useProfile()  

  useEffect(() => {
    const savedLocale = localStorage.getItem('locale') as Locale | null
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedLocale) setLocaleState(savedLocale)
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    } else {
      const isDark = document.documentElement.classList.contains('dark')
      setTheme(isDark ? 'dark' : 'light')
      if (!isDark) {
        document.documentElement.classList.remove('dark')
      }
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

  function showAlert(options: AlertModalOptions) {
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

  function showToast(message: string, type: AlertType = 'info') {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      removeToast(id)
    }, 3500)
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