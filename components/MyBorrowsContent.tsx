'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/app-context'
import { format } from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import { BookOpen, Clock, CheckCircle, AlertCircle, Image, X, RotateCcw, Bell } from 'lucide-react'

interface Props {
  borrows: any[]
  queues: any[]
  userId: string
}

const statusConfig = {
  active: { label: 'กำลังยืม', en: 'Active', icon: Clock, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30' },
  returned: { label: 'คืนแล้ว', en: 'Returned', icon: CheckCircle, color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30' },
  overdue: { label: 'เกินกำหนด', en: 'Overdue', icon: AlertCircle, color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30' },
}

export default function MyBorrowsContent({ borrows, queues, userId }: Props) {
  const [tab, setTab] = useState<'active' | 'history' | 'queue'>('active')
  const [proofModal, setProofModal] = useState<string | null>(null)
  const { t, locale } = useApp()
  const router = useRouter()

  const activeBorrows = borrows.filter(b => b.status === 'active')
  const historyBorrows = borrows.filter(b => b.status !== 'active')
  const dateLocale = locale === 'th' ? th : enUS

  function formatDate(date: string) {
    return format(new Date(date), 'dd MMM yyyy', { locale: dateLocale })
  }

  // ✅ BUG FIX #7: ส่ง queueId ไปใน body ด้วย (เดิมรับมาแต่ไม่ใช้เลย)
  async function handleCancelQueue(queueId: string, bookId: string) {
    const res = await fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId, queueId, action: 'leave' }),
    })
    const data = await res.json()
    if (!data.error) router.refresh()
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('myBorrows')}</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6">
        {[
          { key: 'active', label: `${t('activeBorrow')} (${activeBorrows.length})` },
          { key: 'history', label: `${t('history')} (${historyBorrows.length})` },
          { key: 'queue', label: `จองคิว (${queues.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === key
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Active borrows */}
      {tab === 'active' && (
        <div className="space-y-4">
          {activeBorrows.length === 0 ? (
            <EmptyState icon={BookOpen} text="ไม่มีการยืมที่ใช้งานอยู่" />
          ) : activeBorrows.map((borrow) => (
            <BorrowCard
              key={borrow.id}
              borrow={borrow}
              formatDate={formatDate}
              onViewProof={setProofModal}
              showActions={true}
            />
          ))}
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div className="space-y-4">
          {historyBorrows.length === 0 ? (
            <EmptyState icon={Clock} text={t('noBorrows')} />
          ) : historyBorrows.map((borrow) => (
            <BorrowCard
              key={borrow.id}
              borrow={borrow}
              formatDate={formatDate}
              onViewProof={setProofModal}
              showActions={false}
            />
          ))}
        </div>
      )}

      {/* Queue */}
      {tab === 'queue' && (
        <div className="space-y-4">
          {queues.length === 0 ? (
            <EmptyState icon={Bell} text="ไม่มีการจองคิว" />
          ) : queues.map((queue) => (
            <div key={queue.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-4">
              <div className="w-12 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shrink-0">
                {queue.books?.cover_url ? (
                  <img src={queue.books.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={18} className="text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/books/${queue.books?.id}`} className="font-semibold text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 truncate block">
                  {queue.books?.title}
                </Link>
                {queue.books?.author && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{queue.books.author}</p>
                )}
                <span className="inline-flex items-center gap-1 mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  <Bell size={11} />
                  {t('queuePosition')} {queue.position}
                </span>
              </div>
              <button
                onClick={() => handleCancelQueue(queue.id, queue.books?.id)}
                className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 transition-colors"
                title="ยกเลิกการจอง"
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Proof image modal */}
      {proofModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 modal-overlay"
          onClick={() => setProofModal(null)}
        >
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setProofModal(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white"
            >
              <X size={24} />
            </button>
            <img src={proofModal} alt="Return proof" className="w-full rounded-2xl shadow-2xl" />
            <p className="text-center text-white/60 text-sm mt-3">รูปหลักฐานการคืนหนังสือ</p>
          </div>
        </div>
      )}
    </main>
  )
}

function BorrowCard({ borrow, formatDate, onViewProof, showActions }: any) {
  const { t } = useApp()
  const status = statusConfig[borrow.status as keyof typeof statusConfig] || statusConfig.returned
  const StatusIcon = status.icon

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-slide-up">
      <div className="flex gap-4 p-4">
        {/* Book cover */}
        <div className="w-14 h-20 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden shrink-0">
          {borrow.books?.cover_url ? (
            <img src={borrow.books.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen size={20} className="text-gray-400" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <Link
            href={`/books/${borrow.books?.id}`}
            className="font-semibold text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 line-clamp-1 block"
          >
            {borrow.books?.title}
          </Link>
          {borrow.books?.author && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{borrow.books.author}</p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{t('borrowedAt')}: {formatDate(borrow.borrowed_at)}</span>
            {borrow.status === 'active' && (
              <span className={`font-medium ${
                new Date(borrow.due_date) < new Date() ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
              }`}>
                {t('dueDate')}: {formatDate(borrow.due_date)}
              </span>
            )}
            {borrow.returned_at && (
              <span>{t('returnedAt')}: {formatDate(borrow.returned_at)}</span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
              <StatusIcon size={11} />
              {status.label}
            </span>
            {borrow.proof_signed_url && (
              <button
                onClick={() => onViewProof(borrow.proof_signed_url)}
                className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:underline"
              >
                <Image size={11} />
                {t('viewProof')}
              </button>
            )}
          </div>
        </div>

        {/* Action */}
        {showActions && borrow.status === 'active' && (
          <div className="shrink-0">
            <Link
              href={`/return/${borrow.id}`}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-medium transition-colors"
            >
              <RotateCcw size={13} />
              {t('returnBook')}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="text-center py-16 text-gray-400 dark:text-gray-600">
      <Icon size={48} className="mx-auto mb-3 opacity-20" />
      <p>{text}</p>
    </div>
  )
}