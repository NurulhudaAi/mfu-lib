'use client'

import { useState, useEffect, useRef, useMemo, ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useApp } from '@/lib/app-context'
import { createClient } from '@/lib/supabase'
import {
  Compass,
  BookOpen,
  ClipboardList,
  MessageSquare,
  ShieldCheck,
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
} from 'lucide-react'

interface Announcement {
  id: string
  title: string
  title_en?: string | null
  body: string
  body_en?: string | null
  type: 'info' | 'warning' | 'success'
  created_at: string
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
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  const isAdmin = profile?.role === 'admin'

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
  }, [])

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

  // Close mobile drawer on route change & sync search query from URL
  useEffect(() => {
    setIsMobileMenuOpen(false)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setSearchQuery(params.get('q') || '')
      setSelectedCategory(params.get('category') || 'all')
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

  function applyFilters(newQuery: string, newCat: string) {
    const params = new URLSearchParams()
    if (newQuery.trim()) {
      params.set('q', newQuery.trim())
    }
    if (newCat && newCat !== 'all') {
      params.set('category', newCat)
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
    applyFilters(searchQuery, selectedCategory)
  }

  function handleSelectCategory(cat: string) {
    setSelectedCategory(cat)
    setIsFilterOpen(false)
    applyFilters(searchQuery, cat)
  }

  function handleClearSearch() {
    setSearchQuery('')
    applyFilters('', selectedCategory)
  }

  // Navigation Links
  const navLinks = [
    {
      href: '/',
      label: locale === 'th' ? 'หน้าแรก' : 'Discover',
      icon: Compass,
      isActive: pathname === '/',
    },
    {
      href: '/books',
      label: locale === 'th' ? 'หนังสือทั้งหมด' : 'All Books',
      icon: Layers,
      isActive: pathname.startsWith('/books'),
    },
    {
      href: profile ? '/my-borrows' : '/login',
      label: locale === 'th' ? 'การยืมของฉัน' : 'My Library',
      icon: ClipboardList,
      isActive: pathname.startsWith('/my-borrows'),
    },
    {
      href: '/feedback',
      label: locale === 'th' ? 'ข้อเสนอแนะ' : 'Feedback',
      icon: MessageSquare,
      isActive: pathname.startsWith('/feedback'),
    },
  ]

  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#0a0a0c] flex transition-colors duration-300 antialiased font-sans text-neutral-900 dark:text-neutral-100">
      
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
                  key={link.href}
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

            {/* Admin Panel Link (if admin) */}
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-medium text-sm transition-all border border-neutral-300 dark:border-neutral-700 mt-2 ${
                  pathname.startsWith('/admin')
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'text-neutral-900 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                }`}
              >
                <ShieldCheck size={18} />
                <span>{locale === 'th' ? 'ระบบผู้ดูแล' : 'Admin Panel'}</span>
              </Link>
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
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden"
              aria-label="Open Navigation"
            >
              <Menu size={20} />
            </button>

            {/* Unified Top Header Search Bar with Integrated Category Filter Icon */}
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

                {/* Category Filter Icon Button */}
                <div className="relative" ref={filterDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`p-1.5 rounded-xl transition-all flex items-center justify-center ${
                      selectedCategory !== 'all'
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800'
                    }`}
                    title={locale === 'th' ? 'เลือกหมวดหมู่' : 'Filter category'}
                    aria-label="Filter category"
                  >
                    <SlidersHorizontal size={14} />
                  </button>

                  {/* Dropdown Menu */}
                  {isFilterOpen && (
                    <div className="absolute right-0 mt-3 w-60 p-2.5 bg-white dark:bg-[#161619] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-50 animate-fade-in text-neutral-900 dark:text-white">
                      <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-neutral-100 dark:border-neutral-800 px-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                          {locale === 'th' ? 'หมวดหมู่หนังสือ' : 'Categories'}
                        </span>
                        {selectedCategory !== 'all' && (
                          <button
                            type="button"
                            onClick={() => handleSelectCategory('all')}
                            className="text-[11px] font-medium text-neutral-500 hover:text-black dark:hover:text-white underline"
                          >
                            {locale === 'th' ? 'รีเซ็ต' : 'Reset'}
                          </button>
                        )}
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-0.5">
                        <button
                          type="button"
                          onClick={() => handleSelectCategory('all')}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                            selectedCategory === 'all'
                              ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                              : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80'
                          }`}
                        >
                          <span>{locale === 'th' ? 'หมวดหมู่ทั้งหมด' : 'All Categories'}</span>
                          {selectedCategory === 'all' && <Check size={13} />}
                        </button>

                        {categories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => handleSelectCategory(cat)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                              selectedCategory === cat
                                ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                              : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80'
                            }`}
                          >
                            <span className="truncate">{cat}</span>
                            {selectedCategory === cat && <Check size={13} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => setIsAnnounceModalOpen(true)}
              className="relative p-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors border border-neutral-200 dark:border-neutral-800"
              title={locale === 'th' ? 'ประกาศข่าวสาร' : 'Announcements'}
            >
              <Bell size={17} />
              {announcements.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-black dark:bg-white ring-2 ring-white dark:ring-neutral-900" />
              )}
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
                    {isAdmin ? 'Admin' : 'Member'}
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
        <main className="flex-1 min-w-0 pb-16 lg:pb-0">
          {children}
        </main>
      </div>

      {/* ======================================================== */}
      {/* 3. MOBILE BOTTOM NAVIGATION BAR                          */}
      {/* ======================================================== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-[#111113]/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-around z-30 px-2">
        {navLinks.map((link) => {
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-xl transition-all ${
                link.isActive
                  ? 'text-black dark:text-white font-bold'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span className="text-[10px] leading-none tracking-tight">{link.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ======================================================== */}
      {/* 4. MOBILE NAVIGATION DRAWER                              */}
      {/* ======================================================== */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
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
                      key={link.href}
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
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm border border-neutral-300 dark:border-neutral-700 mt-2"
                  >
                    <ShieldCheck size={18} />
                    <span>{locale === 'th' ? 'ระบบผู้ดูแล' : 'Admin Panel'}</span>
                  </Link>
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
                  <span>{theme === 'dark' ? 'โหมดสว่าง' : 'โหมดมืด'}</span>
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
      {/* 5. GLOBAL ANNOUNCEMENTS MODAL                             */}
      {/* ======================================================== */}
      {isAnnounceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsAnnounceModalOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
          />

          <div className="relative w-full max-w-lg bg-white dark:bg-[#121214] rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 sm:p-7 z-10 space-y-5 animate-slide-up">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-neutral-900 dark:text-white leading-tight">
                    {locale === 'th' ? 'ประกาศจากห้องสมุด' : 'Library Announcements'}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {announcements.length} {locale === 'th' ? 'รายการประกาศล่าสุด' : 'recent updates'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAnnounceModalOpen(false)}
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                <X size={18} />
              </button>
            </div>

            {/* Announcement List */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {announcements.length === 0 ? (
                <div className="text-center py-10 text-neutral-400">
                  <Info size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">
                    {locale === 'th' ? 'ยังไม่มีประกาศใหม่ในขณะนี้' : 'No announcements currently'}
                  </p>
                </div>
              ) : (
                announcements.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-sm text-neutral-900 dark:text-white">
                        {locale === 'th' ? item.title : (item.title_en || item.title)}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 uppercase shrink-0">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                      {locale === 'th' ? item.body : (item.body_en || item.body)}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsAnnounceModalOpen(false)}
                className="w-full py-3 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold text-xs tracking-wide hover:opacity-90 transition-all"
              >
                {locale === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
              </button>
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
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
