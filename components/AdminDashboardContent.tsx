'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/lib/app-context'
import { format } from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import {
  BookOpen, Users, Clock, TrendingUp, Star,
  MessageSquare, AlertCircle, CheckCircle, LayoutDashboard,
  Plus, List, Settings, BookMarked
} from 'lucide-react'

interface Props {
  stats: { totalBooks: number; totalBorrows: number; activeBorrows: number; totalUsers: number; totalQueues: number }
  recentBorrows: any[]
  recentFeedback: any[]
}

const statusConfig = {
  active: { label: 'กำลังยืม', color: 'text-neutral-900 bg-neutral-100 dark:text-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700' },
  returned: { label: 'คืนแล้ว', color: 'text-neutral-600 bg-neutral-100 dark:text-neutral-400 dark:bg-neutral-800' },
  overdue: { label: 'เกินกำหนด', color: 'text-white bg-black dark:bg-white dark:text-black font-bold' },
}

export default function AdminDashboardContent({ stats, recentBorrows, recentFeedback }: Props) {
  const { locale } = useApp()
  const dateLocale = locale === 'th' ? th : enUS

  function fmt(date: string) {
    return format(new Date(date), 'dd MMM yy', { locale: dateLocale })
  }

  const statCards = [
    { label: 'หนังสือทั้งหมด', value: stats.totalBooks, icon: BookOpen, color: 'text-neutral-900 bg-neutral-100 dark:text-white dark:bg-neutral-800' },
    { label: 'ผู้ใช้งาน', value: stats.totalUsers, icon: Users, color: 'text-neutral-900 bg-neutral-100 dark:text-white dark:bg-neutral-800' },
    { label: 'กำลังยืมอยู่', value: stats.activeBorrows, icon: Clock, color: 'text-neutral-900 bg-neutral-100 dark:text-white dark:bg-neutral-800' },
    { label: 'ยืมทั้งหมด', value: stats.totalBorrows, icon: TrendingUp, color: 'text-neutral-900 bg-neutral-100 dark:text-white dark:bg-neutral-800' },
    { label: 'จองคิวทั้งหมด', value: stats.totalQueues, icon: BookMarked, color: 'text-neutral-900 bg-neutral-100 dark:text-white dark:bg-neutral-800' },
  ]

  return (
    <div className="w-full p-6 sm:p-8 lg:p-10 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            <LayoutDashboard size={24} />
            Admin Dashboard
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">จัดการระบบยืม-คืนหนังสือ ชมรมมุสลิม มฟล.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/books/add"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm"
          >
            <Plus size={16} />
            เพิ่มหนังสือ
          </Link>
          <Link
            href="/admin/books"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs sm:text-sm font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <List size={16} />
            หนังสือ
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-1.5 px-4 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs sm:text-sm font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <Users size={16} />
            ผู้ใช้
          </Link>
        </div>
      </div>

      {/* Stats — 5 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs animate-fade-in">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{card.label}</p>
                  <p className="text-3xl font-bold text-neutral-900 dark:text-white mt-1">{card.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 ${card.color}`}>
                  <Icon size={18} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent borrows */}
        <div className="lg:col-span-2 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-neutral-900 dark:text-white">การยืมล่าสุด</h2>
            <Link href="/admin/borrows" className="text-xs font-semibold text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors">
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="space-y-3">
            {recentBorrows.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-6">ยังไม่มีการยืม</p>
            ) : recentBorrows.map(borrow => {
              const sc = statusConfig[borrow.status as keyof typeof statusConfig] || statusConfig.returned
              return (
                <div key={borrow.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0">
                    {borrow.profiles?.avatar_url ? (
                      <img src={borrow.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        <Users size={14} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                      {borrow.profiles?.full_name || borrow.profiles?.email}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{borrow.books?.title}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${sc.color}`}>
                      {sc.label}
                    </span>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{fmt(borrow.borrowed_at)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent feedback */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <MessageSquare size={16} className="text-neutral-900 dark:text-white" />
              Feedback ล่าสุด
            </h2>
          </div>
          <div className="space-y-4">
            {recentFeedback.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-6">ยังไม่มี feedback</p>
            ) : recentFeedback.map(fb => (
              <div key={fb.id} className="border-b border-neutral-100 dark:border-neutral-800 pb-3 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        size={11}
                        className={s <= fb.rating ? 'fill-neutral-900 text-neutral-900 dark:fill-white dark:text-white' : 'text-neutral-200 dark:text-neutral-700'}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 ml-auto">{fmt(fb.created_at)}</span>
                </div>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 line-clamp-2 leading-relaxed">{fb.message}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                  {fb.profiles?.full_name || fb.profiles?.email || 'สมาชิก'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}