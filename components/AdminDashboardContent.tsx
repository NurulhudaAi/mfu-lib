'use client'
import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/lib/app-context'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import {
  LayoutDashboard, Users, BookOpen, Clock, TrendingUp, AlertTriangle,
  CheckCircle2, ArrowUpRight, Plus, BookMarked, Award, ArrowRight,
  ShieldCheck, ListOrdered, Calendar, RefreshCw, Trash2, Bell, Loader2
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
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()
  const { locale, t } = useApp()
  const dateLocale = locale === 'th' ? th : enUS

  const [queuesList, setQueuesList] = useState(queues)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cancelingQueueId, setCancelingQueueId] = useState<string | null>(null)
  const [confirmCancelQueueId, setConfirmCancelQueueId] = useState<string | null>(null)

  useEffect(() => {
    setQueuesList(queues)
  }, [queues])

  // Real-time listener on queue & borrows tables for live updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue' },
        () => {
          startTransition(() => {
            router.refresh()
          })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'borrows' },
        () => {
          startTransition(() => {
            router.refresh()
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, router])

  const handleManualRefresh = () => {
    setIsRefreshing(true)
    startTransition(() => {
      router.refresh()
    })
    setTimeout(() => setIsRefreshing(false), 800)
  }

  const handleCancelQueue = async (queueId: string) => {
    setCancelingQueueId(queueId)
    try {
      const res = await fetch(`/api/queue?id=${queueId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to cancel queue')
      }
      setQueuesList(prev => prev.filter(q => q.id !== queueId))
      setConfirmCancelQueueId(null)
      startTransition(() => {
        router.refresh()
      })
    } catch (err: any) {
      alert(err.message || (locale === 'th' ? 'เกิดข้อผิดพลาดในการยกเลิกคิว' : 'Error canceling queue'))
    } finally {
      setCancelingQueueId(null)
    }
  }


  const statusConfig: Record<string, { label: string; color: string; dotColor: string }> = {
    active: {
      label: t('active'),
      color: 'text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700',
      dotColor: 'bg-emerald-500'
    },
    returned: {
      label: t('returned'),
      color: 'text-neutral-600 dark:text-neutral-400 bg-neutral-100/70 dark:bg-neutral-800/50',
      dotColor: 'bg-neutral-400'
    },
    overdue: {
      label: t('overdue'),
      color: 'text-white bg-black dark:bg-white dark:text-black font-bold shadow-xs',
      dotColor: 'bg-rose-500'
    },
  }

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
            {t('adminCenter')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
            <LayoutDashboard size={26} className="text-neutral-900 dark:text-white" />
            {t('adminDashboardTitle')}
          </h1>
        </div>

        {/* Live Status indicator & Manual Refresh Button */}
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>{locale === 'th' ? 'อัปเดตเรียลไทม์' : 'Real-time active'}</span>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-2xs active:scale-95 disabled:opacity-50"
            title={locale === 'th' ? 'รีเฟรชข้อมูล' : 'Refresh data'}
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{locale === 'th' ? 'รีเฟรช' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── Key Stat Counters (7 Responsive Cards) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3.5">
        <Link
          href="/books"
          className="group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs hover:border-black dark:hover:border-white transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('adminBooksHeading')}</span>
            <BookOpen size={17} className="group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">{stats.totalBooks}</p>
          <p className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between">
            <span>{t('totalBooksCount')}</span>
            <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </Link>

        <Link
          href="/admin/users"
          className="group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs hover:border-black dark:hover:border-white transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('totalUsersCount')}</span>
            <Users size={17} className="group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">{stats.totalUsers}</p>
          <p className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between">
            <span>{locale === 'th' ? 'สมาชิก & แอดมิน' : 'Members & Admins'}</span>
            <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </Link>

        <Link
          href="/admin/borrows"
          className="group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs hover:border-black dark:hover:border-white transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('totalBorrowsCount')}</span>
            <TrendingUp size={17} className="group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">{stats.totalBorrows}</p>
          <p className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between">
            <span>{locale === 'th' ? 'ประวัติรายการสะสม' : 'Cumulative history'}</span>
            <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </Link>

        <Link
          href="/admin/borrows"
          className="group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs hover:border-emerald-500 transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('activeBorrowsCount')}</span>
            <Clock size={17} className="text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">{stats.activeBorrows}</p>
          <p className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between">
            <span>{locale === 'th' ? 'อยู่ระหว่างการอ่าน' : 'Currently reading'}</span>
            <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </Link>

        <Link
          href="/admin/borrows"
          className="group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs hover:border-rose-500 transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('overdueBorrowsCount')}</span>
            <AlertTriangle size={17} className="text-rose-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400">{stats.overdueBorrows}</p>
          <p className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between">
            <span>{locale === 'th' ? 'ต้องติดตามการคืน' : 'Requires follow-up'}</span>
            <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </Link>

        <Link
          href="/admin/borrows"
          className="group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs hover:border-black dark:hover:border-white transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('returnedBorrowsCount')}</span>
            <CheckCircle2 size={17} className="text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">{stats.returnedBorrows}</p>
          <p className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between">
            <span>{locale === 'th' ? 'ส่งคืนสำเร็จ' : 'Returned successfully'}</span>
            <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </Link>

        {/* Queues Stat Card */}
        <a
          href="#book-queues-section"
          className="group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs hover:border-black dark:hover:border-white transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('tabQueues')}</span>
            <BookMarked size={17} className="text-rose-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">{queuesList.length}</p>
          <p className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between">
            <span>{locale === 'th' ? 'รอรับหนังสือ' : 'Waiting in line'}</span>
            <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </a>
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
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">{t('mostBorrowedRanking')}</h2>
                  <p className="text-xs text-neutral-400">{locale === 'th' ? 'จัดอันดับตามจำนวนครั้งที่มีการยืม' : 'Ranked by borrow frequency'}</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                Top 6
              </span>
            </div>

            {mostBorrowedBooks.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 text-sm">
                <BookOpen size={36} className="mx-auto mb-2 opacity-20" />
                {t('noTopBooks')}
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
                            {book.author || (locale === 'th' ? 'ไม่ระบุผู้แต่ง' : 'Unknown author')}
                          </p>
                        </div>

                        {/* Borrow count pill */}
                        <div className="text-right shrink-0">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700">
                            {book.borrowCount} {locale === 'th' ? 'ครั้ง' : 'times'}
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
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">{t('topBorrowersRanking')}</h2>
                  <p className="text-xs text-neutral-400">{locale === 'th' ? 'สมาชิกที่มีความถี่ในการอ่านและยืมสูงสุด' : 'Members with highest borrow count'}</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                Top 6
              </span>
            </div>

            {topBorrowers.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 text-sm">
                <Users size={36} className="mx-auto mb-2 opacity-20" />
                {t('noTopBorrowers')}
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
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0 flex items-center justify-center">
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
                            {user.full_name || (locale === 'th' ? 'ไม่ระบุชื่อ' : 'Unknown')}
                          </p>
                          <p className="text-[11px] text-neutral-400 truncate">
                            {user.email || '—'}
                          </p>
                        </div>

                        {/* Count pill */}
                        <div className="text-right shrink-0">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700">
                            {user.borrowCount} {locale === 'th' ? 'เล่ม' : 'books'}
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

      {/* ── Two-Column Live Activity Feeds (Recent Borrows & Book Queues) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Borrows Activity Feed */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-neutral-900 dark:text-white text-base">{t('recentBorrowsActivity')}</h2>
                <p className="text-xs text-neutral-400">{t('realtimeUpdates')}</p>
              </div>
              <Link
                href="/admin/borrows"
                className="text-xs font-semibold text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors flex items-center gap-1"
              >
                {t('viewAllRecords')} ({allBorrows.length}) →
              </Link>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {recentBorrows.length === 0 ? (
                <p className="text-sm text-neutral-400 text-center py-8">{t('noBorrowActivity')}</p>
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
                          {locale === 'th' ? 'ยืม: ' : 'Borrowed: '}<span className="font-medium text-neutral-700 dark:text-neutral-300">{borrow.books?.title}</span>
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

        {/* Book Queues Live Activity Feed */}
        <div id="book-queues-section" className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-xs flex flex-col justify-between scroll-mt-24">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-neutral-900 dark:text-white text-base">{t('tabQueues')}</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                    {queuesList.length} {locale === 'th' ? 'คิว' : 'waiting'}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">{locale === 'th' ? 'อัปเดตสถานะคิวหนังสือแบบเรียลไทม์' : 'Real-time book queue order'}</p>
              </div>
              <Link
                href="/admin/borrows"
                className="text-xs font-semibold text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors flex items-center gap-1"
              >
                {locale === 'th' ? 'จัดการคิวทั้งหมด' : 'Manage queues'} →
              </Link>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {queuesList.length === 0 ? (
                <div className="text-center py-12 text-neutral-400">
                  <BookMarked size={36} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">{t('noQueues')}</p>
                </div>
              ) : (
                queuesList.slice(0, 8).map((q) => {
                  return (
                    <div key={q.id} className="py-3 flex items-center gap-3 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 px-2 rounded-xl transition-colors">
                      {/* Queue position badge */}
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-extrabold shrink-0 shadow-2xs ${
                        q.position === 1
                          ? 'bg-neutral-900 dark:bg-white text-white dark:text-black'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                      }`}>
                        #{q.position}
                      </span>

                      {/* Book cover thumbnail */}
                      <div className="w-8 h-10 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0">
                        {q.books?.cover_url ? (
                          <img src={q.books.cover_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
                            <BookOpen size={12} />
                          </div>
                        )}
                      </div>

                      {/* Book & User Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                          {q.books?.title || (locale === 'th' ? 'หนังสือ' : 'Book')}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate flex items-center gap-1.5">
                          <span>{q.profiles?.full_name || (locale === 'th' ? 'ไม่ระบุชื่อ' : 'Anonymous')}</span>
                          <span className="text-neutral-300 dark:text-neutral-600">·</span>
                          <span className="text-[11px] text-neutral-400">{fmtDate(q.created_at)}</span>
                        </p>
                      </div>

                      {/* Status & Cancel Queue Action */}
                      <div className="flex items-center gap-2 shrink-0">
                        {q.notified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <Bell size={10} />
                            {locale === 'th' ? 'ถึงคิวแล้ว' : 'Ready'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <Clock size={10} />
                            {locale === 'th' ? 'รอคิว' : 'Waiting'}
                          </span>
                        )}

                        {/* Delete/Cancel queue action */}
                        {confirmCancelQueueId === q.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl px-2 py-0.5">
                            <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 mr-0.5">
                              {locale === 'th' ? 'ยกเลิก?' : 'Cancel?'}
                            </span>
                            <button
                              type="button"
                              disabled={cancelingQueueId === q.id}
                              onClick={() => handleCancelQueue(q.id)}
                              className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                              {cancelingQueueId === q.id ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                locale === 'th' ? 'ใช่' : 'Yes'
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={cancelingQueueId === q.id}
                              onClick={() => setConfirmCancelQueueId(null)}
                              className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                            >
                              {locale === 'th' ? 'ไม่' : 'No'}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmCancelQueueId(q.id)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title={locale === 'th' ? 'ยกเลิกคิวนี้' : 'Cancel queue'}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}