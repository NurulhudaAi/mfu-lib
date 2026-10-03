'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useApp } from '@/lib/app-context'
import { format } from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import { Search, BookOpen, Users, Image as ImageIcon, AlertTriangle, X, BookMarked, CheckCircle, ExternalLink } from 'lucide-react'

interface Props {
  borrows: any[]
  queues: any[]
}

const statusConfig = {
  active: { label: 'กำลังยืม', color: 'text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700' },
  returned: { label: 'คืนแล้ว', color: 'text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/60' },
  overdue: { label: 'เกินกำหนด', color: 'text-white bg-black dark:bg-white dark:text-black font-bold' },
}

type Tab = 'borrows' | 'queues'

export default function AdminBorrowsContent({ borrows, queues }: Props) {
  const [tab, setTab] = useState<Tab>('borrows')
  const [filter, setFilter] = useState<'all' | 'active' | 'returned' | 'overdue'>('all')
  const [search, setSearch] = useState('')
  const [queueSearch, setQueueSearch] = useState('')
  const [proofModal, setProofModal] = useState<any | null>(null)
  const [mounted, setMounted] = useState(false)
  const { locale } = useApp()
  const dateLocale = locale === 'th' ? th : enUS

  function fmt(d: string) {
    return format(new Date(d), 'dd MMM yy HH:mm', { locale: dateLocale })
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent background scrolling and avoid layout shift
  useEffect(() => {
    if (!proofModal) return

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight

    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
    }
  }, [proofModal])

  // ESC key to close modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && proofModal) {
        setProofModal(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [proofModal])

  const filtered = borrows.filter(b => {
    const matchFilter = filter === 'all' || b.status === filter
    const matchSearch = !search ||
      b.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.profiles?.email?.toLowerCase().includes(search.toLowerCase()) ||
      b.books?.title?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const filteredQueues = queues.filter(q =>
    !queueSearch ||
    q.profiles?.full_name?.toLowerCase().includes(queueSearch.toLowerCase()) ||
    q.profiles?.email?.toLowerCase().includes(queueSearch.toLowerCase()) ||
    q.books?.title?.toLowerCase().includes(queueSearch.toLowerCase())
  )

  const counts = {
    all: borrows.length,
    active: borrows.filter(b => b.status === 'active').length,
    returned: borrows.filter(b => b.status === 'returned').length,
    overdue: borrows.filter(b => b.status === 'overdue').length,
  }

  return (
    <div className="w-full p-6 sm:p-8 lg:p-10 space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">การยืม</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{borrows.length} รายการทั้งหมด</p>
      </div>

      {/* Main tabs */}
      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setTab('borrows')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0 ${tab === 'borrows'
            ? 'border-black text-black dark:border-white dark:text-white'
            : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
        >
          <BookOpen size={15} />
          การยืม
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
            {borrows.length}
          </span>
        </button>
        <button
          onClick={() => setTab('queues')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0 ${tab === 'queues'
            ? 'border-black text-black dark:border-white dark:text-white'
            : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
        >
          <BookMarked size={15} />
          จองคิว
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
            {queues.length}
          </span>
        </button>
      </div>

      {/* ── TAB: การยืม ── */}
      {tab === 'borrows' && (
        <>
          {/* Responsive Filter & Search Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center justify-between">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {(['all', 'active', 'returned', 'overdue'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                    filter === s
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xs'
                      : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {s === 'all' ? 'ทั้งหมด' : statusConfig[s]?.label} ({counts[s]})
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64 shrink-0">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อผู้ใช้ / หนังสือ..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors shadow-2xs"
              />
            </div>
          </div>

          {/* Desktop Table View (hidden on mobile) */}
          <div className="hidden md:block bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-x-auto shadow-xs">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40">
                  <th className="text-left px-4 py-3 font-semibold text-neutral-700 dark:text-neutral-300">ผู้ใช้</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-700 dark:text-neutral-300">หนังสือ</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-700 dark:text-neutral-300">วันยืม</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-700 dark:text-neutral-300">ครบกำหนด</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-700 dark:text-neutral-300">วันที่คืน</th>
                  <th className="text-center px-4 py-3 font-semibold text-neutral-700 dark:text-neutral-300">สถานะ</th>
                  <th className="text-center px-4 py-3 font-semibold text-neutral-700 dark:text-neutral-300">หลักฐาน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-neutral-400">ไม่พบรายการ</td></tr>
                ) : filtered.map(borrow => {
                  const sc = statusConfig[borrow.status as keyof typeof statusConfig] || statusConfig.returned
                  const isOverdue = borrow.status === 'active' && new Date(borrow.due_date) < new Date()
                  return (
                    <tr key={borrow.id} className={`transition-colors ${isOverdue ? 'bg-neutral-100/60 dark:bg-neutral-800/60 font-medium' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                            {borrow.profiles?.avatar_url ? (
                              <img src={borrow.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Users size={12} className="text-gray-400" /></div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate max-w-[130px]">
                              {borrow.profiles?.full_name || 'ไม่ระบุ'}
                            </p>
                            <p className="text-xs text-gray-400 truncate max-w-[130px]">{borrow.profiles?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white truncate max-w-[160px]">{borrow.books?.title}</p>
                        {borrow.books?.author && <p className="text-xs text-gray-400 truncate max-w-[160px]">{borrow.books.author}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{fmt(borrow.borrowed_at)}</td>
                      <td className={`px-4 py-3 whitespace-nowrap font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {fmt(borrow.due_date)}
                        {isOverdue && <span className="ml-1">⚠️</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {borrow.returned_at ? fmt(borrow.returned_at) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${sc.color}`}>{sc.label}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {borrow.proof_signed_url ? (
                          <button
                            type="button"
                            onClick={() => setProofModal(borrow)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-900 dark:text-white hover:underline"
                          >
                            <ImageIcon size={13} />
                            ดูรูป
                          </button>
                        ) : <span className="text-neutral-400 dark:text-neutral-600">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (visible only on mobile) */}
          <div className="md:hidden space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 text-center text-neutral-400 text-sm">
                ไม่พบรายการ
              </div>
            ) : (
              filtered.map(borrow => {
                const sc = statusConfig[borrow.status as keyof typeof statusConfig] || statusConfig.returned
                const isOverdue = borrow.status === 'active' && new Date(borrow.due_date) < new Date()
                return (
                  <div
                    key={borrow.id}
                    className={`p-4 rounded-2xl border bg-white dark:bg-neutral-900 transition-all ${
                      isOverdue
                        ? 'border-rose-300 dark:border-rose-900/60 shadow-xs'
                        : 'border-neutral-200 dark:border-neutral-800 shadow-xs'
                    }`}
                  >
                    {/* Header: User Info & Status Badge */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0">
                          {borrow.profiles?.avatar_url ? (
                            <img src={borrow.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Users size={14} className="text-neutral-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-neutral-900 dark:text-white truncate">
                            {borrow.profiles?.full_name || 'ไม่ระบุชื่อ'}
                          </p>
                          <p className="text-xs text-neutral-400 truncate">
                            {borrow.profiles?.email}
                          </p>
                        </div>
                      </div>

                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${sc.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          borrow.status === 'active' ? (isOverdue ? 'bg-rose-500' : 'bg-emerald-500') : 'bg-neutral-400'
                        }`} />
                        {isOverdue ? 'เกินกำหนด' : sc.label}
                      </span>
                    </div>

                    {/* Book Details */}
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 mb-3">
                      <div className="w-10 h-13 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-700 shrink-0 border border-neutral-200 dark:border-neutral-700">
                        {borrow.books?.cover_url ? (
                          <img src={borrow.books.cover_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen size={14} className="text-neutral-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs sm:text-sm text-neutral-900 dark:text-white line-clamp-1">
                          {borrow.books?.title}
                        </p>
                        <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                          {borrow.books?.author || 'ไม่ระบุผู้แต่ง'}
                        </p>
                      </div>
                    </div>

                    {/* Dates Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-neutral-100 dark:border-neutral-800/80 pt-2.5">
                      <div>
                        <span className="text-[10px] text-neutral-400 block font-medium">วันที่ยืม</span>
                        <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                          {fmt(borrow.borrowed_at)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block font-medium">ครบกำหนด</span>
                        <span className={`font-semibold flex items-center gap-1 ${
                          isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-700 dark:text-neutral-300'
                        }`}>
                          {fmt(borrow.due_date)}
                          {isOverdue && <span>⚠️</span>}
                        </span>
                      </div>
                      {borrow.returned_at && (
                        <div className="col-span-2 pt-1 border-t border-dashed border-neutral-100 dark:border-neutral-800">
                          <span className="text-[10px] text-neutral-400 block font-medium">วันที่คืนจริง</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {fmt(borrow.returned_at)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Proof Button */}
                    {borrow.proof_signed_url && (
                      <button
                        type="button"
                        onClick={() => setProofModal(borrow)}
                        className="w-full mt-3 py-2 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold text-neutral-900 dark:text-white flex items-center justify-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition-colors shadow-2xs"
                      >
                        <ImageIcon size={14} />
                        <span>ดูรูปหลักฐานการคืน</span>
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {/* ── TAB: จองคิว ── */}
      {tab === 'queues' && (
        <>
          <div className="flex justify-end mb-4">
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                value={queueSearch}
                onChange={e => setQueueSearch(e.target.value)}
                placeholder="ค้นหาชื่อผู้ใช้ / หนังสือ..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors shadow-2xs"
              />
            </div>
          </div>

          {/* Desktop Queue Table (hidden on mobile) */}
          <div className="hidden md:block bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-x-auto shadow-xs">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40">
                  <th className="text-center px-4 py-3 font-semibold text-neutral-700 dark:text-neutral-300 w-16">ลำดับ</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-700 dark:text-neutral-300">ผู้จอง</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-700 dark:text-neutral-300">หนังสือ</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-700 dark:text-neutral-300">วันที่จอง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredQueues.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-neutral-400">ไม่มีการจองคิว</td></tr>
                ) : filteredQueues.map(q => (
                  <tr key={q.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-bold shadow-xs">
                        #{q.position}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                          {q.profiles?.avatar_url ? (
                            <img src={q.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Users size={12} className="text-gray-400" /></div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
                            {q.profiles?.full_name || 'ไม่ระบุ'}
                          </p>
                          <p className="text-xs text-gray-400 truncate max-w-[150px]">{q.profiles?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {q.books?.cover_url && (
                          <img src={q.books.cover_url} alt="" className="w-8 h-10 object-cover rounded shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]">{q.books?.title}</p>
                          {q.books?.author && <p className="text-xs text-gray-400 truncate max-w-[180px]">{q.books.author}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {fmt(q.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Queue Card View (visible only on mobile) */}
          <div className="md:hidden space-y-3">
            {filteredQueues.length === 0 ? (
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 text-center text-neutral-400 text-sm">
                ไม่มีการจองคิว
              </div>
            ) : (
              filteredQueues.map(q => (
                <div
                  key={q.id}
                  className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-bold shadow-xs">
                        #{q.position}
                      </span>
                      <span className="text-xs font-bold text-neutral-900 dark:text-white">
                        ลำดับคิวที่ {q.position}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-400">
                      {fmt(q.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0 border border-neutral-200 dark:border-neutral-700">
                      {q.profiles?.avatar_url ? (
                        <img src={q.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Users size={12} className="text-neutral-400" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-neutral-900 dark:text-white truncate">
                        {q.profiles?.full_name || 'ไม่ระบุชื่อ'}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate">
                        {q.profiles?.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/40">
                    {q.books?.cover_url && (
                      <img src={q.books.cover_url} alt="" className="w-8 h-10 object-cover rounded-lg shrink-0 border border-neutral-200 dark:border-neutral-700" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs text-neutral-900 dark:text-white truncate">
                        {q.books?.title}
                      </p>
                      {q.books?.author && (
                        <p className="text-[11px] text-neutral-400 truncate">
                          {q.books.author}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Proof modal (PORTAL) */}
      {mounted && proofModal && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Full-screen Backdrop blur */}
          <div
            onClick={() => setProofModal(null)}
            className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Centered Modal Container */}
          <div
            className="relative w-full max-w-xl bg-white dark:bg-[#111113] rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl z-10 animate-scale-in flex flex-col max-h-[calc(100dvh-32px)] sm:max-h-[90vh] overflow-hidden text-left"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-50/50 dark:bg-neutral-900/30">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base sm:text-lg text-neutral-900 dark:text-white leading-tight">
                    หลักฐานการคืนหนังสือ
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                    ผู้ยืม: {proofModal.profiles?.full_name || proofModal.profiles?.email || 'สมาชิก'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {proofModal.proof_signed_url && (
                  <a
                    href={proofModal.proof_signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1 text-xs font-semibold"
                    title="เปิดรูปขนาดเต็ม"
                  >
                    <ExternalLink size={16} />
                    <span className="hidden sm:inline">เปิดรูปเต็ม</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setProofModal(null)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="ปิด"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              {/* Book Metadata Mini Header */}
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-neutral-50 dark:bg-[#18181b] border border-neutral-200 dark:border-neutral-800">
                <div className="w-12 h-16 bg-neutral-200 dark:bg-neutral-800 rounded-xl overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700 shadow-xs">
                  {proofModal.books?.cover_url ? (
                    <img
                      src={proofModal.books.cover_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={18} className="text-neutral-400" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold border border-neutral-300 dark:border-neutral-700">
                      คืนเรียบร้อยแล้ว
                    </span>
                    {proofModal.books?.category && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium">
                        {proofModal.books.category}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                    {proofModal.books?.title}
                  </h4>
                  {proofModal.books?.author && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                      {proofModal.books.author}
                    </p>
                  )}
                </div>
              </div>

              {/* Main Proof Image Container (Flexible height, no awkward cropping) */}
              <div className="relative rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-950 flex flex-col items-center justify-center shadow-xs">
                {proofModal.proof_signed_url ? (
                  <>
                    <div className="w-full flex items-center justify-center p-3 sm:p-4 min-h-[260px] max-h-[420px]">
                      <img
                        src={proofModal.proof_signed_url}
                        alt="Proof"
                        className="max-h-[380px] w-auto max-w-full object-contain rounded-xl select-none"
                      />
                    </div>
                    <div className="w-full p-2.5 bg-neutral-900/90 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-300 px-4">
                      <span className="text-[11px] text-neutral-400">รูปภาพหลักฐานการคืนหนังสือ</span>
                      <a
                        href={proofModal.proof_signed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-white hover:underline flex items-center gap-1"
                      >
                        <ExternalLink size={12} />
                        <span>เปิดดูภาพขนาดเต็ม</span>
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-14 px-4 text-neutral-400">
                    <ImageIcon size={38} className="mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-medium">ไม่มีรูปภาพหลักฐาน หรือลิงก์รูปภาพหมดอายุ</p>
                  </div>
                )}
              </div>

              {/* Verification Metadata Details Card */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#18181b] border border-neutral-200 dark:border-neutral-800 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-neutral-400 block text-[11px] mb-0.5">ผู้ยืม</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 block truncate">
                      {proofModal.profiles?.full_name || proofModal.profiles?.email || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px] mb-0.5">วันที่ยืม</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {fmt(proofModal.borrowed_at)}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px] mb-0.5">กำหนดส่งคืน</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {proofModal.due_date ? fmt(proofModal.due_date) : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px] mb-0.5">วันที่ส่งคืนจริง</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {proofModal.returned_at ? fmt(proofModal.returned_at) : '-'}
                    </span>
                  </div>
                </div>

                {proofModal.notes && (
                  <div className="pt-2.5 border-t border-neutral-200 dark:border-neutral-700/60 text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400 block text-[11px] mb-1 font-semibold">
                      หมายเหตุจากผู้ยืม:
                    </span>
                    <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium leading-relaxed whitespace-pre-line text-xs">
                      "{proofModal.notes}"
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-[#141416] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setProofModal(null)}
                className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold text-xs hover:opacity-90 transition-opacity shadow-sm"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}