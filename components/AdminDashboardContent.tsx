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
  active: { label: 'กำลังยืม', color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30' },
  returned: { label: 'คืนแล้ว', color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30' },
  overdue: { label: 'เกินกำหนด', color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30' },
}

export default function AdminDashboardContent({ stats, recentBorrows, recentFeedback }: Props) {
  const { locale } = useApp()
  const dateLocale = locale === 'th' ? th : enUS

  function fmt(date: string) {
    return format(new Date(date), 'dd MMM yy', { locale: dateLocale })
  }

  const statCards = [
    { label: 'หนังสือทั้งหมด', value: stats.totalBooks, icon: BookOpen, color: 'text-green-600 bg-green-100 dark:bg-green-950' },
    { label: 'ผู้ใช้งาน', value: stats.totalUsers, icon: Users, color: 'text-blue-600 bg-blue-100 dark:bg-blue-950' },
    { label: 'กำลังยืมอยู่', value: stats.activeBorrows, icon: Clock, color: 'text-amber-600 bg-amber-100 dark:bg-amber-950' },
    { label: 'ยืมทั้งหมด', value: stats.totalBorrows, icon: TrendingUp, color: 'text-purple-600 bg-purple-100 dark:bg-purple-950' },
    { label: 'จองคิวทั้งหมด', value: stats.totalQueues, icon: BookMarked, color: 'text-rose-600 bg-rose-100 dark:bg-rose-950' },
  ]

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <LayoutDashboard size={24} className="text-green-600" />
            Admin Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">จัดการระบบยืม-คืนหนังสือ</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/books/add"
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            เพิ่มหนังสือ
          </Link>
          <Link
            href="/admin/books"
            className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <List size={16} />
            หนังสือ
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
            <div key={card.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 animate-fade-in">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{card.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${card.color}`}>
                  <Icon size={20} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent borrows */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 dark:text-white">การยืมล่าสุด</h2>
            <Link href="/admin/borrows" className="text-xs text-green-600 dark:text-green-400 hover:underline">ดูทั้งหมด</Link>
          </div>
          <div className="space-y-3">
            {recentBorrows.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">ยังไม่มีการยืม</p>
            ) : recentBorrows.map(borrow => {
              const sc = statusConfig[borrow.status as keyof typeof statusConfig] || statusConfig.returned
              return (
                <div key={borrow.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                    {borrow.profiles?.avatar_url ? (
                      <img src={borrow.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Users size={14} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {borrow.profiles?.full_name || borrow.profiles?.email}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{borrow.books?.title}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.color}`}>
                      {sc.label}
                    </span>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{fmt(borrow.borrowed_at)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent feedback */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <MessageSquare size={16} className="text-green-600" />
              Feedback ล่าสุด
            </h2>
          </div>
          <div className="space-y-4">
            {recentFeedback.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">ยังไม่มี feedback</p>
            ) : recentFeedback.map(fb => (
              <div key={fb.id} className="border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={11} className={s <= fb.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-gray-700'} />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">{fmt(fb.created_at)}</span>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">{fb.message}</p>
                {/* แสดงชื่อคนรีวิวแทน category */}
                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  {fb.profiles?.full_name || fb.profiles?.email || 'ไม่ระบุชื่อ'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </main>
  )
}