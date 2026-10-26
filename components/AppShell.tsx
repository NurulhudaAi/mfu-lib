'use client'

import { useState, useEffect, useRef, useMemo, ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useApp } from '@/lib/app-context'
import { getCategoryLabel } from '@/lib/i18n'
import { createClient } from '@/lib/supabase'
import {
  Compass,
  BookOpen,
  ClipboardList,
  MessageSquare,
  ShieldCheck,
  LayoutDashboard,
  Sun,
  Moon,
  Search,
  SlidersHorizontal,
  Check,
  Bell,
  User,
  LogOut,
  X,
  Layers,
  Menu,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Users,
  EyeOff,
  Megaphone,
  Sparkles,
  Clock,
  ArrowRight,
  CheckCheck,
} from 'lucide-react'
import { cleanAnnouncementBody } from './AnnouncementCarousel'

interface Announcement {
  id: string
  title: string
  title_en?: string | null
  body: string
  body_en?: string | null
  type: 'info' | 'warning' | 'success'
  created_at: string
}

interface UserNotification {
  id: string
  type: 'queue_ready' | 'due_tomorrow' | 'overdue'
  title: string
  titleEn: string
  message: string
  messageEn: string
  bookId?: string
  bookTitle?: string
  bookAuthor?: string
  coverUrl?: string
  borrowId?: string
  actionUrl: string
  actionLabel: string
  actionLabelEn: string
  createdAt: string
  priority: 'high' | 'warning' | 'danger'
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const {
    t,
    locale,
    setLocale,
    theme,
    toggleTheme,
    profile,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    statusFilter,
    setStatusFilter,
    alertModal,
    closeAlert,
    toasts,
    removeToast,
  } = useApp()
  const supabase = createClient()

  const [categories, setCategories] = useState<string[]>([])
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAnnounceModalOpen, setIsAnnounceModalOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<{
    id: string
    title: string
    body?: string
    type: string
    tag: string
    actionUrl?: string
    actionLabel?: string
    createdAt?: string
  } | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [personalNotifications, setPersonalNotifications] = useState<UserNotification[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)

  // Unified notifications stream without section divisions (headline-only)
  const allNotifications = useMemo(() => {
    type UnifiedNotify = {
      id: string
      title: string
      body?: string
      type: 'queue_ready' | 'due_tomorrow' | 'overdue' | 'announcement'
      actionUrl?: string
      actionLabel?: string
      tag: string
      createdAt?: string
    }

    const items: UnifiedNotify[] = []

    for (const p of personalNotifications) {
      let tag = locale === 'th' ? 'การแจ้งเตือน' : 'Alert'
      if (p.type === 'queue_ready') tag = locale === 'th' ? 'ถึงคิวแล้ว' : 'Ready'
      else if (p.type === 'due_tomorrow') tag = locale === 'th' ? 'เตือน 1 วัน' : 'Due 1d'
      else if (p.type === 'overdue') tag = locale === 'th' ? 'เกินกำหนด' : 'Overdue'

      items.push({
        id: `personal-${p.id}`,
        title: locale === 'th' ? p.title : (p.titleEn || p.title),
        body: locale === 'th' ? p.message : (p.messageEn || p.message),
        type: p.type,
        actionUrl: p.actionUrl,
        actionLabel: locale === 'th' ? p.actionLabel : (p.actionLabelEn || p.actionLabel),
        tag,
        createdAt: p.createdAt,
      })
    }

    for (const a of announcements) {
      items.push({
        id: `ann-${a.id}`,
        title: locale === 'th' ? a.title : (a.title_en || a.title),
        body: locale === 'th' ? a.body : (a.body_en || a.body),
        type: 'announcement',
        actionUrl: undefined,
        actionLabel: undefined,
        tag: locale === 'th' ? 'ประกาศ' : 'Announcement',
        createdAt: a.created_at,
      })
    }

    return items
  }, [personalNotifications, announcements, locale])

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const isSuperAdmin = profile?.role === 'super_admin'
  const isFeedbackPage = pathname.startsWith('/feedback') || pathname.startsWith('/admin/feedback')

  // Dynamic search placeholder depending on current page context
  const searchPlaceholder = useMemo(() => {
    if (pathname === '/my-borrows') {
      return locale === 'th'
        ? 'ค้นหาหนังสือที่ยืมหรือจองคิว...'
        : 'Search borrowed or queued books...'
    }
    if (pathname.startsWith('/admin/books')) {
      return locale === 'th'
        ? 'ค้นหาหนังสือในคลัง...'
        : 'Search library books...'
    }
    if (pathname.startsWith('/admin/borrows')) {
      return locale === 'th'
        ? 'ค้นหารายการยืมหรือผู้ยืม...'
        : 'Search borrows or members...'
    }
    return locale === 'th'
      ? 'ค้นหาชื่อหนังสือ, ผู้แต่ง, หมวดหมู่...'
      : 'Search books, authors, categories...'
  }, [pathname, locale])

  // Fetch notifications and announcements
  const fetchNotificationsData = async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setPersonalNotifications(data.personalNotifications || [])
        setUnreadCount(data.unreadCount || 0)
        if (data.announcements && data.announcements.length > 0) {
          setAnnouncements(data.announcements)
        }
      }
    } catch {
      // ignore
    }
  }

  // Fetch announcements for notification bell globally & unique categories
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const { data: annData } = await supabase
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(6)
        if (annData) setAnnouncements(annData)

        const { data: catData } = await supabase
          .from('books')
          .select('category')
          .not('category', 'is', null)
        if (catData) {
          const uniqueCats = [...new Set(catData.map((b: any) => b.category).filter(Boolean))] as string[]
          setCategories(uniqueCats)
        }
      } catch (err) {
        // ignore
      }
    }
    fetchInitialData()
    fetchNotificationsData()

    // Refresh notifications every 45s or when route changes
    const interval = setInterval(fetchNotificationsData, 45000)
    return () => clearInterval(interval)
  }, [profile?.id, pathname])

  // Close category dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Close mobile drawer on route change & sync search query & filters from URL
  useEffect(() => {
    setIsMobileMenuOpen(false)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setSearchQuery(params.get('q') || '')
      setSelectedCategory(params.get('category') || 'all')
      const s = params.get('status')
      if (s === 'available' || s === 'active') {
        setStatusFilter(s)
      } else {
        setStatusFilter('all')
      }
    }
  }, [pathname])

  // Login page has its own minimal full-screen layout
  if (pathname === '/login') {
    return <>{children}</>
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function applyFilters(newQuery: string, newCat: string, newStatus?: string) {
    const params = new URLSearchParams()
    if (newQuery.trim()) {
      params.set('q', newQuery.trim())
    }
    if (newCat && newCat !== 'all') {
      params.set('category', newCat)
    }
    const currentStatus = newStatus !== undefined ? newStatus : statusFilter
    if (currentStatus && currentStatus !== 'all') {
      params.set('status', currentStatus)
    }
    const queryString = params.toString()

    let targetPath = '/books'
    if (pathname === '/my-borrows') {
      targetPath = '/my-borrows'
    } else if (pathname.startsWith('/admin/books')) {
      targetPath = '/admin/books'
    } else if (pathname.startsWith('/admin/borrows')) {
      targetPath = '/admin/borrows'
    }

    router.push(`${targetPath}${queryString ? `?${queryString}` : ''}`)
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    applyFilters(searchQuery, selectedCategory, statusFilter)
  }

  function handleSelectCategory(cat: string) {
    setSelectedCategory(cat)
    applyFilters(searchQuery, cat, statusFilter)
  }

  function handleToggleAvailable() {
    const nextStatus = statusFilter === 'available' ? 'all' : 'available'
    setStatusFilter(nextStatus)
    applyFilters(searchQuery, selectedCategory, nextStatus)
  }

  function handleSetStatusFilter(nextStatus: 'all' | 'available' | 'active') {
    setStatusFilter(nextStatus)
    applyFilters(searchQuery, selectedCategory, nextStatus)
  }

  function handleResetFilters() {
    setSelectedCategory('all')
    setStatusFilter('all')
    applyFilters(searchQuery, 'all', 'all')
  }

  function handleClearSearch() {
    setSearchQuery('')
    applyFilters('', selectedCategory, statusFilter)
  }

  const hasActiveFilter = selectedCategory !== 'all' || statusFilter !== 'all'

  // Navigation Links
  const navLinks = [
    {
      key: 'home',
      href: '/',
      label: locale === 'th' ? 'หน้าแรก' : 'Discover',
      icon: Compass,
      isActive: pathname === '/',
    },
    {
      key: 'books',
      href: '/books',
      label: locale === 'th' ? (isAdmin ? 'จัดการหนังสือ' : 'หนังสือทั้งหมด') : (isAdmin ? 'Manage Books' : 'All Books'),
      icon: Layers,
      isActive: pathname.startsWith('/books'),
    },
    // Only show "การยืมของฉัน" & "ข้อเสนอแนะ" for non-admin users
    ...(!isAdmin
      ? [
          {
            key: 'my-borrows',
            href: profile ? '/my-borrows' : '/login',
            label: locale === 'th' ? 'การยืมของฉัน' : 'My Library',
            icon: ClipboardList,
            isActive: pathname.startsWith('/my-borrows'),
          },
          {
            key: 'feedback',
            href: profile ? '/feedback' : '/login',
            label: locale === 'th' ? 'ข้อเสนอแนะ' : 'Feedback',
            icon: MessageSquare,
            isActive: pathname.startsWith('/feedback'),
          },
        ]
      : []),
  ]

  // Admin Outer Navigation Links
  const adminLinks = [
    {
      key: 'admin-dashboard',
      href: '/admin/dashboard',
      label: locale === 'th' ? 'แดชบอร์ด' : 'Dashboard',
      icon: LayoutDashboard,
      isActive: pathname === '/admin/dashboard' || pathname === '/admin',
    },
    {
      key: 'admin-borrows',
      href: '/admin/borrows',
      label: locale === 'th' ? 'จัดการการยืมคืน' : 'Borrow & Return',
      icon: ClipboardList,
      isActive: pathname.startsWith('/admin/borrows'),
    },
    {
      key: 'admin-users',
      href: '/admin/users',
      label: locale === 'th' ? 'ผู้ใช้งาน' : 'Users',
      icon: Users,
      isActive: pathname.startsWith('/admin/users'),
    },
    {
      key: 'admin-announcements',
      href: '/admin/announcements',
      label: locale === 'th' ? 'จัดการประกาศ' : 'Announcements',
      icon: Megaphone,
      isActive: pathname.startsWith('/admin/announcements'),
    },
    {
      key: 'admin-feedback',
      href: '/admin/feedback',
      label: locale === 'th' ? 'ข้อเสนอแนะ' : 'Feedback',
      icon: MessageSquare,
      isActive: pathname.startsWith('/admin/feedback'),
    },
  ]

  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#0a0a0c] flex antialiased font-sans text-neutral-900 dark:text-neutral-100">
      
      {/* ======================================================== */}
      {/* 1. LEFT DOCKED SIDEBAR (Desktop)                         */}
      {/* ======================================================== */}
      <aside className="w-60 xl:w-64 h-screen sticky top-0 shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111113] p-5 flex-col justify-between hidden lg:flex z-30">
        <div className="space-y-8">
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center gap-3 px-2 group">
            <div className="w-10 h-10 rounded-2xl bg-white p-1 flex items-center justify-center shadow-xs border border-neutral-200 dark:border-neutral-700 transition-transform group-hover:scale-105 shrink-0 overflow-hidden">
              <img src="/logo.jpg" alt="Muslim Club Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-base tracking-tight text-neutral-900 dark:text-white leading-none">
                Muslim Club
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium tracking-wide mt-1 truncate">
                MFU Library
              </div>
            </div>
          </Link>

          {/* Navigation Menu Links */}
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.key}
                  href={link.href}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${
                    link.isActive
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900/60'
                  }`}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                </Link>
              )
            })}

            {/* Admin Outer Links */}
            {isAdmin && (
              <div className="pt-4 mt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-1">
                <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  {locale === 'th' ? 'ระบบผู้ดูแล' : 'Administration'}
                </div>
                {adminLinks.map((link) => {
                  const Icon = link.icon
                  return (
                    <Link
                      key={link.key}
                      href={link.href}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${
                        link.isActive
                          ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900/60'
                      }`}
                    >
                      <Icon size={18} />
                      <span>{link.label}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </nav>
        </div>

        {/* Bottom Settings & Controls */}
        <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all"
          >
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'dark' ? (locale === 'th' ? 'โหมดสว่าง' : 'Light Mode') : (locale === 'th' ? 'โหมดมืด' : 'Dark Mode')}</span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
              {theme}
            </span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLocale(locale === 'th' ? 'en' : 'th')}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all"
          >
            <span className="flex items-center gap-3">
              <span className="w-4 h-4 rounded-full border border-neutral-400 dark:border-neutral-600 flex items-center justify-center text-[9px] font-bold">
                {locale === 'th' ? 'TH' : 'EN'}
              </span>
              <span>{locale === 'th' ? 'ภาษา' : 'Language'}</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
              {locale === 'th' ? 'ไทย' : 'ENG'}
            </span>
          </button>

          {/* Sign Out / Sign In */}
          {profile ? (
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all text-left"
            >
              <LogOut size={16} />
              <span>{locale === 'th' ? 'ออกจากระบบ' : 'Logout'}</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-all shadow-sm"
            >
              <User size={14} />
              <span>{locale === 'th' ? 'เข้าสู่ระบบ' : 'Login'}</span>
            </Link>
          )}
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN APPLICATION CONTENT (Edge-to-Edge)               */}
      {/* ======================================================== */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen bg-white dark:bg-[#0a0a0c]">
        
        {/* Global Top Header Bar */}
        <header className="h-16 px-6 sm:px-8 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4 sticky top-0 z-20 bg-white/80 dark:bg-[#111113]/80 backdrop-blur-md">
          {/* Mobile hamburger & search */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <Link
              href="/"
              className="flex items-center gap-2 shrink-0 lg:hidden group"
              aria-label="Muslim Club MFU Library"
            >
              <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-xs border border-neutral-200 dark:border-neutral-700 overflow-hidden shrink-0 transition-transform group-hover:scale-105">
                <img src="/logo.jpg" alt="Muslim Club Logo" className="w-full h-full object-contain" />
              </div>
            </Link>

            {/* Unified Top Header Search Bar (Hidden on Feedback pages) */}
            {!isFeedbackPage && (
              <form onSubmit={handleSearchSubmit} className="relative flex-1">
                <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-20 py-2 rounded-2xl bg-neutral-100 dark:bg-[#151518] border border-neutral-200 dark:border-neutral-800 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:border-black dark:focus:border-white transition-all shadow-xs"
              />

              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                    title={locale === 'th' ? 'ล้างการค้นหา' : 'Clear search'}
                  >
                    <X size={14} />
                  </button>
                )}

                {/* Search Filter Icon Button (Category & Book Status) */}
                <div className="relative" ref={filterDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`p-1.5 rounded-xl transition-all flex items-center justify-center relative ${
                      hasActiveFilter
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800'
                    }`}
                    title={
                      hasActiveFilter
                        ? locale === 'th' ? 'ตัวกรอง (กำลังใช้งาน)' : 'Filters (Active)'
                        : locale === 'th' ? 'ตัวกรองการค้นหา' : 'Filter search'
                    }
                    aria-label="Filter search"
                  >
                    <SlidersHorizontal size={14} />
                    {hasActiveFilter && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#111113]" />
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {isFilterOpen && (
                    <div className="absolute right-0 mt-3 w-64 sm:w-72 p-3 bg-white dark:bg-[#161619] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-50 animate-fade-in text-neutral-900 dark:text-white">
                      {/* Dropdown Header */}
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100 dark:border-neutral-800 px-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                          {locale === 'th' ? 'ตัวกรองการค้นหา' : 'Search Filters'}
                        </span>
                        {hasActiveFilter && (
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="text-[11px] font-medium text-neutral-500 hover:text-black dark:hover:text-white underline transition-colors"
                          >
                            {locale === 'th' ? 'รีเซ็ตทั้งหมด' : 'Reset all'}
                          </button>
                        )}
                      </div>

                      {/* 1. Status Filter (หนังสือทั้งหมด, พร้อมให้ยืม, ซ่อนที่ปิดใช้งาน) */}
                      <div className="mb-3">
                        <div className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-1 mb-1.5">
                          {locale === 'th' ? 'สถานะหนังสือ' : 'Book Status'}
                        </div>
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => handleSetStatusFilter('all')}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                              statusFilter === 'all'
                                ? 'bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs'
                                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80'
                            }`}
                          >
                            <span>{locale === 'th' ? 'หนังสือทั้งหมด' : 'All Books'}</span>
                            {statusFilter === 'all' && <Check size={13} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetStatusFilter('available')}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                              statusFilter === 'available'
                                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${statusFilter === 'available' ? 'bg-white' : 'bg-emerald-500'}`} />
                              <span>{locale === 'th' ? 'พร้อมให้ยืม' : 'Available Only'}</span>
                            </span>
                            {statusFilter === 'available' && <Check size={13} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetStatusFilter('active')}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                              statusFilter === 'active'
                                ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 font-semibold shadow-xs'
                                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <EyeOff size={13} />
                              <span>{locale === 'th' ? 'ซ่อนที่ปิดใช้งาน' : 'Hide Inactive'}</span>
                            </span>
                            {statusFilter === 'active' && <Check size={13} />}
                          </button>
                        </div>
                      </div>

                      {/* 2. Categories Filter */}
                      <div>
                        <div className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-1 mb-1.5">
                          {locale === 'th' ? 'หมวดหมู่หนังสือ' : 'Categories'}
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5">
                          <button
                            type="button"
                            onClick={() => handleSelectCategory('all')}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                              selectedCategory === 'all'
                                ? 'bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs'
                                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80'
                            }`}
                          >
                            <span>{locale === 'th' ? 'ทุกหมวดหมู่' : 'All Categories'}</span>
                            {selectedCategory === 'all' && <Check size={13} />}
                          </button>

                          {categories.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleSelectCategory(cat)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                                selectedCategory === cat
                                  ? 'bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs'
                                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80'
                              }`}
                            >
                              <span className="truncate">{getCategoryLabel(cat, locale)}</span>
                              {selectedCategory === cat && <Check size={13} />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => setIsAnnounceModalOpen(true)}
              className="relative p-2 rounded-xl sm:p-2.5 sm:rounded-2xl bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors border border-neutral-200 dark:border-neutral-800"
              title={locale === 'th' ? 'การแจ้งเตือน' : 'Notifications'}
            >
              <Bell size={17} />
              {unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-[#111113] shadow-xs">
                  {unreadCount}
                </span>
              ) : allNotifications.length > 0 ? (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-black dark:bg-white ring-2 ring-white dark:ring-neutral-900" />
              ) : null}
            </button>

            {/* Profile Capsule */}
            {profile ? (
              <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-neutral-200 dark:border-neutral-800">
                <div className="w-8 h-8 rounded-xl bg-neutral-200 dark:bg-neutral-800 overflow-hidden flex items-center justify-center shrink-0 border border-neutral-300 dark:border-neutral-700">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={16} className="text-neutral-600 dark:text-neutral-300" />
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-neutral-900 dark:text-white leading-tight">
                    {profile.full_name?.split(' ')[0] || profile.email?.split('@')[0]}
                  </div>
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
                    {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'Member'}
                  </div>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-all shadow-sm"
              >
                <User size={14} />
                <span>{locale === 'th' ? 'เข้าสู่ระบบ' : 'Sign In'}</span>
              </Link>
            )}
          </div>
        </header>

        {/* Page Content Body (Full-Width, Edge-to-Edge) */}
        <main className="flex-1 min-w-0 pb-20 sm:pb-24 lg:pb-0">
          {children}
        </main>
      </div>

      {/* ======================================================== */}
      {/* 3. MOBILE BOTTOM NAVIGATION BAR                          */}
      {/* ======================================================== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-[#111113]/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-around z-30 px-1.5 pb-safe">
        {isAdmin ? (
          <>
            {/* 1. Dashboard */}
            <Link
              href="/admin/dashboard"
              className={`flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all min-w-0 flex-1 ${
                pathname === '/admin/dashboard' || pathname === '/admin'
                  ? 'text-black dark:text-white font-bold'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <LayoutDashboard size={18} className="shrink-0" />
              <span className="text-[10px] leading-tight tracking-tight truncate max-w-full text-center">
                {locale === 'th' ? 'แดชบอร์ด' : 'Dashboard'}
              </span>
            </Link>

            {/* 2. Books */}
            <Link
              href="/books"
              className={`flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all min-w-0 flex-1 ${
                pathname.startsWith('/books')
                  ? 'text-black dark:text-white font-bold'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Layers size={18} className="shrink-0" />
              <span className="text-[10px] leading-tight tracking-tight truncate max-w-full text-center">
                {locale === 'th' ? 'หนังสือ' : 'Books'}
              </span>
            </Link>

            {/* 3. Borrows */}
            <Link
              href="/admin/borrows"
              className={`flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all min-w-0 flex-1 ${
                pathname.startsWith('/admin/borrows')
                  ? 'text-black dark:text-white font-bold'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <ClipboardList size={18} className="shrink-0" />
              <span className="text-[10px] leading-tight tracking-tight truncate max-w-full text-center">
                {locale === 'th' ? 'ยืม-คืน' : 'Borrows'}
              </span>
            </Link>

            {/* 4. Users */}
            <Link
              href="/admin/users"
              className={`flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all min-w-0 flex-1 ${
                pathname.startsWith('/admin/users')
                  ? 'text-black dark:text-white font-bold'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Users size={18} className="shrink-0" />
              <span className="text-[10px] leading-tight tracking-tight truncate max-w-full text-center">
                {locale === 'th' ? 'ผู้ใช้งาน' : 'Users'}
              </span>
            </Link>

            {/* 5. More / Menu Drawer */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all min-w-0 flex-1 ${
                pathname.startsWith('/admin/feedback') || pathname.startsWith('/admin/announcements') || pathname === '/'
                  ? 'text-black dark:text-white font-bold'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
              aria-label="Open Full Navigation Menu"
            >
              <Menu size={18} className="shrink-0" />
              <span className="text-[10px] leading-tight tracking-tight truncate max-w-full text-center">
                {locale === 'th' ? 'เมนู' : 'Menu'}
              </span>
            </button>
          </>
        ) : (
          navLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.key}
                href={link.href}
                className={`flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all min-w-0 flex-1 ${
                  link.isActive
                    ? 'text-black dark:text-white font-bold'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Icon size={18} className="shrink-0" />
                <span className="text-[10px] leading-tight tracking-tight truncate max-w-full text-center">{link.label}</span>
              </Link>
            )
          })
        )}
      </nav>

      {/* ======================================================== */}
      {/* 4. MOBILE NAVIGATION DRAWER                              */}
      {/* ======================================================== */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 transition-opacity"
          />

          <div className="relative w-72 max-w-[80vw] bg-white dark:bg-[#111113] border-r border-neutral-200 dark:border-neutral-800 p-6 flex flex-col justify-between z-10 animate-slide-in">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-xs border border-neutral-200 dark:border-neutral-700 shrink-0 overflow-hidden">
                    <img src="/logo.jpg" alt="Muslim Club Logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-neutral-900 dark:text-white leading-none">
                      Muslim Club
                    </div>
                    <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                      MFU Library
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mobile Links */}
              <nav className="space-y-1">
                {navLinks.map((link) => {
                  const Icon = link.icon
                  return (
                    <Link
                      key={link.key}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm ${
                        link.isActive
                          ? 'bg-black text-white dark:bg-white dark:text-black'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                      }`}
                    >
                      <Icon size={18} />
                      <span>{link.label}</span>
                    </Link>
                  )
                })}

                {isAdmin && (
                  <div className="pt-4 mt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-1">
                    <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                      {locale === 'th' ? 'ระบบผู้ดูแล' : 'Administration'}
                    </div>
                    {adminLinks.map((link) => {
                      const Icon = link.icon
                      return (
                        <Link
                          key={link.key}
                          href={link.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                            link.isActive
                              ? 'bg-black text-white dark:bg-white dark:text-black'
                              : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                          }`}
                        >
                          <Icon size={18} />
                          <span>{link.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </nav>
            </div>

            {/* Mobile Footer Settings */}
            <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400"
              >
                <div className="flex items-center gap-2">
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                  <span>{theme === 'dark' ? (locale === 'th' ? 'โหมดสว่าง' : 'Light Mode') : (locale === 'th' ? 'โหมดมืด' : 'Dark Mode')}</span>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                  {theme}
                </span>
              </button>

              <button
                onClick={() => setLocale(locale === 'th' ? 'en' : 'th')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400"
              >
                <span>{locale === 'th' ? 'ภาษา' : 'Language'}</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                  {locale === 'th' ? 'TH' : 'EN'}
                </span>
              </button>

              {profile ? (
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                >
                  <LogOut size={16} />
                  <span>{locale === 'th' ? 'ออกจากระบบ' : 'Logout'}</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-black text-white dark:bg-white dark:text-black"
                >
                  <User size={14} />
                  <span>{locale === 'th' ? 'เข้าสู่ระบบ' : 'Sign In'}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. GLOBAL NOTIFICATIONS MODAL (UNIFIED & HEADLINE-ONLY)  */}
      {/* ======================================================== */}
      {isAnnounceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsAnnounceModalOpen(false)}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 animate-fade-in"
          />

          <div className="relative w-full max-w-lg bg-white dark:bg-[#121214] rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 sm:p-6 z-10 space-y-4 animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white">
                  <Bell size={19} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-neutral-900 dark:text-white leading-tight">
                    {locale === 'th' ? 'การแจ้งเตือน' : 'Notifications'}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {allNotifications.length > 0
                      ? locale === 'th'
                        ? `ทั้งหมด ${allNotifications.length} รายการ`
                        : `${allNotifications.length} notification${allNotifications.length > 1 ? 's' : ''}`
                      : locale === 'th'
                      ? 'ไม่มีการแจ้งเตือน'
                      : 'No notifications'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {allNotifications.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setUnreadCount(0)
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('mfu_lib_notifications_read', String(Date.now()))
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                    title={locale === 'th' ? 'ทำเครื่องหมายว่าอ่านแล้วทั้งหมด' : 'Mark all as read'}
                  >
                    <CheckCheck size={14} className={unreadCount > 0 ? 'text-emerald-500' : 'text-neutral-400'} />
                    <span>{locale === 'th' ? 'อ่านทั้งหมด' : 'Mark all read'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsAnnounceModalOpen(false)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Unified Headline-Only Notification List */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {allNotifications.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 border border-dashed border-neutral-200 dark:border-neutral-800">
                  <CheckCircle2 size={34} className="mx-auto mb-2 text-neutral-400 opacity-60" />
                  <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                    {locale === 'th' ? 'ไม่มีการแจ้งเตือน' : 'No notifications'}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {locale === 'th' ? 'คุณได้รับข้อมูลอัปเดตครบถ้วนแล้ว' : 'You are all caught up!'}
                  </p>
                </div>
              ) : (
                allNotifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.actionUrl) {
                        setIsAnnounceModalOpen(false)
                        router.push(item.actionUrl)
                      } else {
                        setSelectedNotification(item)
                      }
                    }}
                    className={`group flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      item.type === 'queue_ready'
                        ? 'border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-500/70'
                        : item.type === 'due_tomorrow'
                        ? 'border-amber-400/50 bg-amber-50/40 dark:bg-amber-950/20 hover:border-amber-400/80'
                        : item.type === 'overdue'
                        ? 'border-red-400/50 bg-red-50/40 dark:bg-red-950/20 hover:border-red-400/80'
                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 hover:border-neutral-400 dark:hover:border-neutral-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${
                          item.type === 'queue_ready'
                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                            : item.type === 'due_tomorrow'
                            ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                            : item.type === 'overdue'
                            ? 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300'
                            : 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {item.type === 'queue_ready' ? (
                          <Sparkles size={16} />
                        ) : item.type === 'due_tomorrow' ? (
                          <Clock size={16} />
                        ) : item.type === 'overdue' ? (
                          <AlertTriangle size={16} />
                        ) : (
                          <Megaphone size={16} />
                        )}
                      </span>

                      {/* Headline Only */}
                      <p className="font-semibold text-xs sm:text-sm text-neutral-900 dark:text-white truncate">
                        {item.title}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedNotification(item)
                        }}
                        className="text-[11px] font-semibold text-neutral-500 hover:text-black dark:hover:text-white underline-offset-2 hover:underline cursor-pointer"
                        title={locale === 'th' ? 'อ่านรายละเอียดทั้งหมด' : 'Read details'}
                      >
                        {locale === 'th' ? 'อ่านทั้งหมด' : 'Details'}
                      </button>

                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          item.type === 'queue_ready'
                            ? 'bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200'
                            : item.type === 'due_tomorrow'
                            ? 'bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200'
                            : item.type === 'overdue'
                            ? 'bg-red-200/80 dark:bg-red-900/80 text-red-900 dark:text-red-200'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {item.tag}
                      </span>

                      {item.actionUrl && (
                        <ArrowRight
                          size={14}
                          className="text-neutral-400 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-0.5 transition-all"
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5.1 NOTIFICATION DETAIL READER MODAL ('อ่านทั้งหมด')      */}
      {/* ======================================================== */}
      {selectedNotification && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedNotification(null)}
            className="fixed inset-0 bg-black/60 dark:bg-black/80 animate-fade-in"
          />

          <div className="relative w-full max-w-md bg-white dark:bg-[#161619] rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 sm:p-6 z-10 space-y-4 animate-scale-in">
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                  {selectedNotification.type === 'queue_ready' ? (
                    <Sparkles size={16} className="text-emerald-500" />
                  ) : selectedNotification.type === 'due_tomorrow' ? (
                    <Clock size={16} className="text-amber-500" />
                  ) : selectedNotification.type === 'overdue' ? (
                    <AlertTriangle size={16} className="text-rose-500" />
                  ) : (
                    <Megaphone size={16} />
                  )}
                </span>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    {selectedNotification.tag}
                  </span>
                  {selectedNotification.createdAt && (
                    <p className="text-[11px] text-neutral-400">
                      {new Date(selectedNotification.createdAt).toLocaleDateString(
                        locale === 'th' ? 'th-TH' : 'en-US',
                        { day: 'numeric', month: 'short', year: 'numeric' }
                      )}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-2.5">
              <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white leading-snug">
                {selectedNotification.title}
              </h3>
              <div className="max-h-[50vh] overflow-y-auto pr-1">
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-line font-normal">
                  {cleanAnnouncementBody(selectedNotification.body || '') || selectedNotification.title}
                </p>
              </div>
            </div>

            {/* Footer Action */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                {locale === 'th' ? 'ปิด' : 'Close'}
              </button>

              {selectedNotification.actionUrl && (
                <Link
                  href={selectedNotification.actionUrl}
                  onClick={() => {
                    setSelectedNotification(null)
                    setIsAnnounceModalOpen(false)
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <span>
                    {selectedNotification.actionLabel ||
                      (locale === 'th' ? 'ไปยังหน้าดำเนินการ' : 'Go to action')}
                  </span>
                  <ArrowRight size={13} />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. GLOBAL INTERACTIVE ALERT / CONFIRM MODAL             */}
      {/* ======================================================== */}
      {alertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={closeAlert}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 animate-fade-in"
          />

          <div className="relative w-full max-w-sm bg-white dark:bg-[#141416] rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 z-10 text-center animate-scale-in space-y-4">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center mx-auto text-neutral-900 dark:text-white shadow-xs">
              {alertModal.type === 'success' && (
                <CheckCircle2 size={28} className="text-black dark:text-white" />
              )}
              {alertModal.type === 'warning' && (
                <AlertTriangle size={28} className="text-black dark:text-white" />
              )}
              {alertModal.type === 'error' && (
                <AlertCircle size={28} className="text-black dark:text-white" />
              )}
              {(!alertModal.type || alertModal.type === 'info') && (
                <Info size={28} className="text-black dark:text-white" />
              )}
            </div>

            {/* Title & Message */}
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
                {alertModal.title}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed whitespace-pre-line">
                {alertModal.message}
              </p>
            </div>

            {/* Buttons */}
            <div className={`flex items-center gap-2.5 pt-2 ${alertModal.showCancel ? 'flex-row' : 'flex-col'}`}>
              {alertModal.showCancel && (
                <button
                  type="button"
                  onClick={() => {
                    if (alertModal.onCancel) alertModal.onCancel()
                    closeAlert()
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  {alertModal.cancelText || (locale === 'th' ? 'ยกเลิก' : 'Cancel')}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (alertModal.onConfirm) alertModal.onConfirm()
                  closeAlert()
                }}
                className={`py-2.5 px-4 rounded-xl font-bold text-xs transition-opacity shadow-sm ${
                  alertModal.showCancel ? 'flex-1' : 'w-full'
                } bg-black text-white dark:bg-white dark:text-black hover:opacity-90`}
              >
                {alertModal.confirmText || (locale === 'th' ? 'ตกลง' : 'OK')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. GLOBAL TOAST NOTIFICATIONS                            */}
      {/* ======================================================== */}
      {toasts.length > 0 && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xl border border-neutral-800 dark:border-neutral-200 text-xs font-semibold animate-slide-up max-w-sm"
            >
              {toast.type === 'success' && <CheckCircle2 size={16} />}
              {toast.type === 'warning' && <AlertTriangle size={16} />}
              {toast.type === 'error' && <AlertCircle size={16} />}
              {(!toast.type || toast.type === 'info') && <Info size={16} />}
              <span className="flex-1">{toast.message}</span>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg hover:bg-white/20 dark:hover:bg-black/20 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
