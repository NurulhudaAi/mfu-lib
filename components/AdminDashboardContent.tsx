'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/lib/app-context'
import { format } from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import {
  LayoutDashboard, Users, BookOpen, Clock, TrendingUp, AlertTriangle,
  CheckCircle2, ArrowUpRight, Plus, BookMarked, Award, ArrowRight,
  ShieldCheck, ListOrdered, Calendar, MessageSquare
} from 'lucide-react'

interface Props {
  stats: {
    totalBooks: number
    totalBorrows: number
    activeBorrows: number
    overdueBorrows: number
    returnedBorrows: number
    totalUsers: number
    totalQueues: number
  }
  mostBorrowedBooks: any[]
  topBorrowers: any[]
  recentBorrows: any[]
  allBorrows: any[]
  allUsers: any[]
  queues: any[]
}

const statusConfig: Record<string, { label: string; color: string; dotColor: string }> = {
  active: {
    label: 'กำลังยืม',
    color: 'text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700',
    dotColor: 'bg-emerald-500'
  },
  returned: {
    label: 'คืนแล้ว',
    color: 'text-neutral-600 dark:text-neutral-400 bg-neutral-100/70 dark:bg-neutral-800/50',
    dotColor: 'bg-neutral-400'
  },
  overdue: {
    label: 'เกินกำหนด',
    color: 'text-white bg-black dark:bg-white dark:text-black font-bold shadow-xs',
    dotColor: 'bg-rose-500'
  },
}

export default function AdminDashboardContent({
  stats,
  mostBorrowedBooks,
  topBorrowers,
  recentBorrows,
  allBorrows,
  allUsers,
  queues,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { locale } = useApp()
  const dateLocale = locale === 'th' ? th : enUS

  function fmtDate(d: string | null) {
    if (!d) return '—'
    return format(new Date(d), 'dd MMM yyyy', { locale: dateLocale })
  }

  // Max counts for progress bar calculations
  const maxBookBorrows = mostBorrowedBooks[0]?.borrowCount || 1
  const maxUserBorrows = topBorrowers[0]?.borrowCount || 1

  return (
    <div className="w-full p-5 sm:p-8 lg:p-10 space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* ── Top Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Admin Operations Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
            <LayoutDashboard size={26} className="text-neutral-900 dark:text-white" />
            Dashboard
          </h1>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/borrows"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-95"
          >
            <Clock size={16} />
            จัดการการยืมคืน
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-700 dark:bg-neutral-200 text-white dark:text-neutral-900">
              {stats.activeBorrows}
            </span>
          </Link>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs sm:text-sm font-semibold transition-colors"
          >
            <Users size={16} />
            จัดการผู้ใช้งาน
          </Link>
          <Link
            href="/books"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs sm:text-sm font-semibold transition-colors"
          >
            <BookOpen size={16} />
            จัดการหนังสือ
          </Link>
          <Link
            href="/admin/feedback"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs sm:text-sm font-semibold transition-colors"
          >
            <MessageSquare size={16} />
            ข้อเสนอแนะ
          </Link>
        </div>
      </div>

      {/* ── Key Stat Counters ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Link
          href="/books"
          className="group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs hover:border-black dark:hover:border-white transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">จัดการหนังสือ</span>
            <BookOpen size={17} className="group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">{stats.totalBooks}</p>
          <p className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between">
            <span>คลังหนังสือในระบบ</span>
            <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </Link>

        <Link
          href="/admin/users"
          className="group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs hover:border-black dark:hover:border-white transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">ผู้ใช้ทั้งหมด</span>
            <Users size={17} className="group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">{stats.totalUsers}</p>
          <p className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between">
            <span>สมาชิก & แอดมิน</span>
            <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </Link>

        <Link
          href="/admin/borrows"
          className="group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs hover:border-black dark:hover:border-white transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">ยืมทั้งหมด</span>
            <TrendingUp size={17} className="group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">{stats.totalBorrows}</p>
          <p className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between">
            <span>ประวัติรายการสะสม</span>
            <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </Link>

        <Link
          href="/admin/borrows"
          className="group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs hover:border-emerald-500 transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">กำลังยืมอยู่</span>
            <Clock size={17} className="text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">{stats.activeBorrows}</p>
          <p className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between">
            <span>อยู่ระหว่างการอ่าน</span>
            <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </Link>

        <Link
          href="/admin/borrows"
          className="group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs hover:border-rose-500 transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">เกินกำหนด</span>
            <AlertTriangle size={17} className="text-rose-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400">{stats.overdueBorrows}</p>
          <p className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between">
            <span>ต้องติดตามการคืน</span>
            <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </Link>

        <Link
          href="/admin/borrows"
          className="group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs hover:border-black dark:hover:border-white transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">คืนเรียบร้อย</span>
            <CheckCircle2 size={17} className="text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">{stats.returnedBorrows}</p>
          <p className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between">
            <span>ส่งคืนสำเร็จ</span>
            <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </Link>
      </div>

      {/* ── Operational Shortcut Cards (Go to Outside Tabs) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Manage Borrows Card */}
        <Link
          href="/admin/borrows"
          className="group p-5 rounded-2xl bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-900/60 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-900 dark:hover:border-white transition-all shadow-xs flex items-center justify-between"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <Clock size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-neutral-900 dark:text-white text-base">จัดการการยืมคืน</h3>
                {stats.overdueBorrows > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                    เกิน {stats.overdueBorrows}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                ยืม {stats.activeBorrows} เล่ม, ตรวจหลักฐาน และคิว
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="text-neutral-400 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 ml-2" />
        </Link>

        {/* Manage Users Card */}
        <Link
          href="/admin/users"
          className="group p-5 rounded-2xl bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-900/60 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-900 dark:hover:border-white transition-all shadow-xs flex items-center justify-between"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <Users size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-neutral-900 dark:text-white text-base">จัดการผู้ใช้งาน</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                  {stats.totalUsers} คน
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                สมาชิก, เชิญผู้ดูแล, Blacklist
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="text-neutral-400 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 ml-2" />
        </Link>

        {/* Manage Feedback Card */}
        <Link
          href="/admin/feedback"
          className="group p-5 rounded-2xl bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-900/60 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-900 dark:hover:border-white transition-all shadow-xs flex items-center justify-between"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <MessageSquare size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-neutral-900 dark:text-white text-base">ข้อเสนอแนะ</h3>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                ความคิดเห็น, ขอเพิ่มหนังสือ และคะแนนรีวิว
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="text-neutral-400 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 ml-2" />
        </Link>
      </div>

      {/* ── Two-Column Ranking Grid (Most Borrowed & Top Borrowers) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Borrowed Books */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white font-bold">
                  <Award size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">หนังสือที่ถูกยืมบ่อย</h2>
                  <p className="text-xs text-neutral-400">จัดอันดับตามจำนวนครั้งที่มีการยืม</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                Top 6
              </span>
            </div>

            {mostBorrowedBooks.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 text-sm">
                <BookOpen size={36} className="mx-auto mb-2 opacity-20" />
                ยังไม่มีข้อมูลการยืมหนังสือ
              </div>
            ) : (
              <div className="space-y-4">
                {mostBorrowedBooks.map((book, idx) => {
                  const percentage = Math.round((book.borrowCount / maxBookBorrows) * 100)
                  return (
                    <div key={book.id || idx} className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          idx === 0 ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' :
                          idx === 1 ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200' :
                          idx === 2 ? 'bg-neutral-100 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400' :
                          'text-neutral-400 text-xs'
                        }`}>
                          {idx + 1}
                        </div>

                        {/* Cover Image thumbnail */}
                        <div className="w-8 h-11 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0">
                          {book.cover_url ? (
                            <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-300 dark:text-neutral-600">
                              <BookOpen size={14} />
                            </div>
                          )}
                        </div>

                        {/* Title & Author */}
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/books/${book.id}`}
                            className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white hover:underline truncate block"
                          >
                            {book.title}
                          </Link>
                          <p className="text-[11px] text-neutral-400 truncate">
                            {book.author || 'ไม่ระบุผู้แต่ง'}
                          </p>
                        </div>

                        {/* Borrow count pill */}
                        <div className="text-right shrink-0">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700">
                            {book.borrowCount} ครั้ง
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-neutral-100 dark:bg-neutral-800/80 rounded-full h-1.5 overflow-hidden ml-9">
                        <div
                          className="bg-neutral-900 dark:bg-white h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top Active Borrowers */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white font-bold">
                  <Users size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">ใครยืมบ่อย (Top Borrowers)</h2>
                  <p className="text-xs text-neutral-400">สมาชิกที่มีความถี่ในการอ่านและยืมสูงสุด</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                Top 6
              </span>
            </div>

            {topBorrowers.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 text-sm">
                <Users size={36} className="mx-auto mb-2 opacity-20" />
                ยังไม่มีข้อมูลผู้ยืมในระบบ
              </div>
            ) : (
              <div className="space-y-4">
                {topBorrowers.map((user, idx) => {
                  const percentage = Math.round((user.borrowCount / maxUserBorrows) * 100)
                  return (
                    <div key={user.id || idx} className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          idx === 0 ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' :
                          idx === 1 ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200' :
                          idx === 2 ? 'bg-neutral-100 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400' :
                          'text-neutral-400 text-xs'
                        }`}>
                          {idx + 1}
                        </div>

                        {/* User Avatar */}
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs font-bold">
                              {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                            </div>
                          )}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white truncate">
                            {user.full_name || 'ไม่ระบุชื่อ'}
                          </p>
                          <p className="text-[11px] text-neutral-400 truncate">
                            {user.email || '—'}
                          </p>
                        </div>

                        {/* Count pill */}
                        <div className="text-right shrink-0">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700">
                            {user.borrowCount} เล่ม
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-neutral-100 dark:bg-neutral-800/80 rounded-full h-1.5 overflow-hidden ml-9">
                        <div
                          className="bg-neutral-900 dark:bg-white h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Borrows Activity Feed ── */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-neutral-900 dark:text-white text-base">รายการยืมล่าสุด</h2>
            <p className="text-xs text-neutral-400">อัปเดตแบบเรียลไทม์ตามลำดับเวลา</p>
          </div>
          <Link
            href="/admin/borrows"
            className="text-xs font-semibold text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors flex items-center gap-1"
          >
            ดูทั้งหมด ({allBorrows.length}) →
          </Link>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
          {recentBorrows.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-8">ยังไม่มีประวัติการยืม</p>
          ) : (
            recentBorrows.slice(0, 8).map((borrow) => {
              const sc = statusConfig[borrow.status] || statusConfig.returned
              return (
                <div key={borrow.id} className="py-3 flex items-center gap-3.5 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 px-2 rounded-xl transition-colors">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0">
                    {borrow.profiles?.avatar_url ? (
                      <img src={borrow.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
                        <Users size={14} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                      {borrow.profiles?.full_name || borrow.profiles?.email}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      ยืม: <span className="font-medium text-neutral-700 dark:text-neutral-300">{borrow.books?.title}</span>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${sc.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dotColor}`} />
                      {sc.label}
                    </span>
                    <p className="text-[11px] text-neutral-400 mt-0.5">{fmtDate(borrow.borrowed_at)}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}