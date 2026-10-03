'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation' // เพิ่มมารองรับการตรวจสอบหน้าล็อกอิน
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/app-context'
import { Moon, Sun, User, LogOut } from 'lucide-react'
import logoImg from '@/public/logo.jpg'

export default function Navbar() {
  const { t, theme, toggleTheme, locale, setLocale, profile } = useApp()
  const pathname = usePathname() // ตรวจสอบ path หน้าปัจจุบัน
  const supabase = createClient()

  const isAdmin = profile?.role === 'admin'

  // ซ่อน Navbar ด้านบนออกไปเลยถ้าอยู่ในหน้าล็อกอิน
  if (pathname === '/login') return null

  async function signOut() {
    await fetch('/auth/signout', { method: 'POST' })
    await supabase.auth.signOut() // Clear client-side state too
    window.location.href = '/login'
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/90 dark:bg-[#0a0a0c]/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* ฝั่งซ้าย: Logo & Brand Name (ปรับปรุงให้รองรับมือถือ ไม่ตกเฟรม) */}
          <Link href={isAdmin ? '/admin/dashboard' : '/'} className="flex items-center gap-2 shrink-0">
            <img src={logoImg.src} alt="Muslim Club Logo" width={25} height={32} className="object-contain" />
            <div>
              <div className="font-display text-sm font-bold text-gray-900 dark:text-white leading-tight">Muslim Club</div>
              <div className="text-[11px] sm:text-[13px] text-neutral-500 dark:text-neutral-400 font-medium tracking-wide">
                {isAdmin ? 'Admin Panel' : 'Book Borrowing System'}
              </div>
            </div>
          </Link>

          {/* ฝั่งขวา: Controls & Profile (ลบปุ่ม Mobile menu เดิมออกไปแล้ว) */}
          <div className="flex items-center gap-2">
            
            {/* ปุ่มสลับภาษา */}
            <button
              onClick={() => setLocale(locale === 'th' ? 'en' : 'th')}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
            >
              {locale === 'th' ? 'TH' : 'EN'}
            </button>

            {/* ปุ่มสลับธีม มืด/สว่าง */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* ส่วนจัดการโปรไฟล์ผู้ใช้งาน / ปุ่ม Login */}
            {profile ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <User size={16} className="text-neutral-500" />
                  )}
                  {/* ซ่อนชื่อยาวๆ บนมือถือ แสดงชื่อเต็มบน desktop */}
                  <span className="hidden sm:block text-xs font-medium text-neutral-800 dark:text-neutral-200 max-w-[100px] truncate">
                    {profile.full_name?.split(' ')[0] || profile.email}
                  </span>
                  {isAdmin && (
                    <span className="hidden sm:block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
                      Admin
                    </span>
                  )}
                </div>
                
                {/* ปุ่มออกจากระบบ */}
                <button
                  onClick={signOut}
                  className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                  title={t('logout') as string}
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              // ปรับปุ่มเข้าสู่ระบบให้แสดงผลขนาดกะทัดรัดพอดีจอในสมาร์ทโฟน
              <Link
                href="/login"
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-xl bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black transition-colors shadow-sm"
              >
                <User size={14} />
                <span>{t('login') as string}</span>
              </Link>
            )}

          </div>

        </div>
      </div>
    </nav>
  )
}
