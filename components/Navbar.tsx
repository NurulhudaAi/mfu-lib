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
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* ฝั่งซ้าย: Logo & Brand Name (ปรับปรุงให้รองรับมือถือ ไม่ตกเฟรม) */}
          <Link href={isAdmin ? '/admin/dashboard' : '/'} className="flex items-center gap-2 shrink-0">
            <img src={logoImg.src} alt="Muslim Club Logo" width={25} height={32} className="object-contain" />
            <div>
              <div className="font-display text-sm font-bold text-gray-900 dark:text-white leading-tight">Muslim Club</div>
              <div className="text-[11px] sm:text-[13px] text-primary-700 dark:text-primary-600 font-medium tracking-wide">
                {isAdmin ? 'Admin Panel' : 'Book Borrowing System'}
              </div>
            </div>
          </Link>

          {/* ฝั่งขวา: Controls & Profile (ลบปุ่ม Mobile menu เดิมออกไปแล้ว) */}
          <div className="flex items-center gap-2">
            
            {/* ปุ่มสลับภาษา */}
            <button
              onClick={() => setLocale(locale === 'th' ? 'en' : 'th')}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              {locale === 'th' ? 'TH' : 'EN'}
            </button>

            {/* ปุ่มสลับธีม มืด/สว่าง */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* ส่วนจัดการโปรไฟล์ผู้ใช้งาน / ปุ่ม Login */}
            {profile ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <User size={16} className="text-gray-500" />
                  )}
                  {/* ซ่อนชื่อยาวๆ บนมือถือ แสดงชื่อเต็มบน desktop */}
                  <span className="hidden sm:block text-xs font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                    {profile.full_name?.split(' ')[0] || profile.email}
                  </span>
                  {isAdmin && (
                    <span className="hidden sm:block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300">
                      Admin
                    </span>
                  )}
                </div>
                
                {/* ปุ่มออกจากระบบ */}
                <button
                  onClick={signOut}
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title={t('logout') as string}
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              // ปรับปุ่มเข้าสู่ระบบให้แสดงผลขนาดกะทัดรัดพอดีจอในสมาร์ทโฟน
              <Link
                href="/login"
                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors"
              >
                <User size={14} />
                <span className="hidden xs:inline">{t('login') as string}</span>
              </Link>
            )}

          </div>

        </div>
      </div>
    </nav>
  )
}
