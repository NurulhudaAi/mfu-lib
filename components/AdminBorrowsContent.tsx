'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/lib/app-context'
import { format } from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import { ArrowLeft, BookOpen, Users, Image, AlertTriangle, X, BookMarked } from 'lucide-react'

interface Props {
  borrows: any[]
  queues: any[]
}

const statusConfig = {
  active: { label: 'กำลังยืม', color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30' },
  returned: { label: 'คืนแล้ว', color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30' },
  overdue: { label: 'เกินกำหนด', color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30' },
}

type Tab = 'borrows' | 'queues'

export default function AdminBorrowsContent({ borrows, queues }: Props) {
  const [tab, setTab] = useState<Tab>('borrows')
  const [filter, setFilter] = useState<'all' | 'active' | 'returned' | 'overdue'>('all')
  const [search, setSearch] = useState('')
  const [queueSearch, setQueueSearch] = useState('')
  const [proofModal, setProofModal] = useState<string | null>(null)
  const { locale } = useApp()
  const dateLocale = locale === 'th' ? th : enUS

  function fmt(d: string) {
    return format(new Date(d), 'dd MMM yy HH:mm', { locale: dateLocale })
  }

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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/dashboard" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">จัดการการยืม</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{borrows.length} รายการทั้งหมด</p>
        </div>
      </div>

      {/* Main tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setTab('borrows')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'borrows'
            ? 'border-green-600 text-green-600 dark:text-green-400'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
        >
          <BookOpen size={15} />
          การยืม
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {borrows.length}
          </span>
        </button>
        <button
          onClick={() => setTab('queues')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'queues'
            ? 'border-green-600 text-green-600 dark:text-green-400'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
          <div className="flex gap-2 mb-4 flex-wrap">
            {(['all', 'active', 'returned', 'overdue'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === s
                  ? 'bg-green-600 text-white'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
              >
                {s === 'all' ? 'ทั้งหมด' : statusConfig[s]?.label} ({counts[s]})
              </button>
            ))}
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อผู้ใช้ / หนังสือ..."
              className="ml-auto px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:border-green-500 w-56"
            />
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">ผู้ใช้</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">หนังสือ</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">วันยืม</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">ครบกำหนด</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">วันที่คืน</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">สถานะ</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">หลักฐาน</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">ไม่พบรายการ</td></tr>
                ) : filtered.map(borrow => {
                  const sc = statusConfig[borrow.status as keyof typeof statusConfig] || statusConfig.returned
                  const isOverdue = borrow.status === 'active' && new Date(borrow.due_date) < new Date()
                  return (
                    <tr key={borrow.id} className={`border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${isOverdue ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}>
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
                            onClick={() => setProofModal(borrow.proof_signed_url)}
                            className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:underline"
                          >
                            <Image size={13} />
                            ดูรูป
                          </button>
                        ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── TAB: จองคิว ── */}
      {tab === 'queues' && (
        <>
          <div className="flex justify-end mb-4">
            <input
              value={queueSearch}
              onChange={e => setQueueSearch(e.target.value)}
              placeholder="ค้นหาชื่อผู้ใช้ / หนังสือ..."
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:border-green-500 w-56"
            />
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 w-16">ลำดับ</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">ผู้จอง</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">หนังสือ</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">วันที่จอง</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueues.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-gray-400">ไม่มีการจองคิว</td></tr>
                ) : filteredQueues.map(q => (
                  <tr key={q.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 text-xs font-bold">
                        {q.position}
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
        </>
      )}

      {/* Proof modal */}
      {proofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 modal-overlay" onClick={() => setProofModal(null)}>
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setProofModal(null)} className="absolute -top-10 right-0 text-white/80 hover:text-white">
              <X size={24} />
            </button>
            <img src={proofModal} alt="Return proof" className="w-full rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}
    </main>
  )
}