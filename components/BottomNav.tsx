'use client'
import { useState, useEffect, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useApp } from '@/lib/app-context'
import { BookOpen, ClipboardList, MessageSquare, LayoutDashboard, Megaphone, ChevronRight, ChevronLeft, Users } from 'lucide-react'

export default function BottomNav() {
  const { t, profile, profileLoading } = useApp()
  const pathname = usePathname()
  const router = useRouter()
  const isAdmin = profile?.role === 'admin'

  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState(pathname)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    setActiveTab(pathname)
  }, [pathname])

  if (profileLoading || pathname === '/login') return null

  const links = isAdmin
    ? [
        { href: '/admin/dashboard', labelKey: 'adminDashboard', icon: <LayoutDashboard size={20} /> },
        { href: '/admin/books', labelKey: 'adminBooks', icon: <BookOpen size={20} /> },
        { href: '/admin/borrows', labelKey: 'adminBorrows', icon: <ClipboardList size={20} /> },
        { href: '/admin/users', labelKey: 'adminUsers', icon: <Users size={20} /> },
        { href: '/admin/announcements', labelKey: 'adminAnnouncements', icon: <Megaphone size={20} /> },
      ]
    : [
        { href: '/books', labelKey: 'allBooks', icon: <BookOpen size={20} /> },
        ...(profile ? [{ href: '/my-borrows', labelKey: 'myBorrows', icon: <ClipboardList size={20} /> }] : []),
        { href: '/feedback', labelKey: 'feedback', icon: <MessageSquare size={20} /> },
      ]

  const handleTabClick = (href: string) => {
    if (href === activeTab) return
    setActiveTab(href)
    startTransition(() => {
      router.push(href)
    })
  }

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-in-out
        ${isCollapsed ? 'w-[60px]' : 'w-[96%] max-w-lg'}`}
    >
      <div
        className={`flex items-center p-2 rounded-full bg-white/40 dark:bg-gray-950/40 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 shadow-xl overflow-hidden transition-all duration-500
          ${isCollapsed ? 'justify-center px-2' : 'justify-between px-3'}
          ${isPending ? 'opacity-85' : 'opacity-100'}`}
      >
        {!isCollapsed && (
          <div className="flex items-center justify-between flex-1 transition-all duration-300">
            {links.map(({ href, labelKey, icon }) => {
              const isActive = activeTab === href || activeTab.startsWith(href + '/')
              return (
                <button
                  key={href}
                  onClick={() => handleTabClick(href)}
                  className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-full transition-all duration-200 flex-1 min-w-0 select-none
                    ${isActive
                      ? 'text-primary-700 dark:text-primary-400 bg-white/70 dark:bg-gray-950/70 font-semibold scale-105 shadow-md border border-white/30 dark:border-gray-800/40'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/20'
                    }`}
                >
                  {icon}
                  <span className="text-[9px] sm:text-[10px] tracking-wide text-center truncate w-full block mt-0.5 px-0.5">
                    {t(labelKey as any)}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-2 rounded-full transition-all duration-300 text-gray-500 hover:text-gray-900 dark:hover:text-white bg-white/20 dark:bg-gray-800/30 hover:bg-white/50 shadow-sm border border-white/10
            ${isCollapsed ? 'w-10 h-10 flex items-center justify-center' : 'ml-1 shrink-0'}`}
          title={isCollapsed ? 'ขยายเมนู' : 'พับเก็บเมนู'}
        >
          {isCollapsed ? <ChevronLeft size={18} className="animate-pulse" /> : <ChevronRight size={18} />}
        </button>
      </div>
    </div>
  )
}