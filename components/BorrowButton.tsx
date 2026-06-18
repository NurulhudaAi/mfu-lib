'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, RotateCcw, Bell, BellOff, ShieldCheck } from 'lucide-react'
import { useApp } from '@/lib/app-context'

interface Props {
  book: { id: string; available_copies: number; title: string }
  userId: string | null
  currentBorrow: { id: string; due_date: string } | null
  queueEntry: { id: string; position: number } | null
  queueCount: number
}

export default function BorrowButton({
  book,
  userId,
  currentBorrow,
  queueEntry,
  queueCount,
}: Props) {
  const [loading, setLoading] = useState(false)
  const { t, profile } = useApp()
  const router = useRouter()

  async function handleBorrow() {
    if (!userId) return
    setLoading(true)
    const res = await fetch('/api/borrow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId: book.id }),
    })
    const data = await res.json()
    if (data.error) {
      alert(data.error)
      setLoading(false)
      return
    }
    router.refresh()
    setLoading(false)
  }

  async function handleQueue(action: 'join' | 'leave') {
    if (!userId) return
    setLoading(true)
    const res = await fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId: book.id, action }),
    })
    const data = await res.json()
    if (data.error) {
      alert(data.error)
      setLoading(false)
      return
    }
    router.refresh()
    setLoading(false)
  }

  if (!userId) {
    return (
      <a href="/login" className="block w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-center transition-colors">
        เข้าสู่ระบบเพื่อยืมหนังสือ
      </a>
    )
  }

  if (profile?.role === 'admin') {
    return (
      <div className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium text-sm">
        <ShieldCheck size={18} />
        <span>Admin ไม่สามารถยืมหนังสือได้</span>
      </div>
    )
  }

  if (currentBorrow) {
    return (
      <a href={`/return/${currentBorrow.id}`} className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors">
        <RotateCcw size={18} />
        <span>{t('returnBook') as string}</span>
      </a>
    )
  }

  if (book.available_copies > 0) {
    return (
      <button
        onClick={handleBorrow}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
      >
        <BookOpen size={18} />
        <span>{loading ? (t('loading') as string) : (t('borrow') as string)}</span>
      </button>
    )
  }

  return (
    <div className="space-y-2">
      {queueCount > 0 && (
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          {queueCount} {t('waitingCount') as string}
        </p>
      )}
      <button
        onClick={() => handleQueue(queueEntry ? 'leave' : 'join')}
        disabled={loading}
        className={
          'flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 ' +
          (queueEntry
            ? 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            : 'bg-blue-600 hover:bg-blue-700 text-white')
        }
      >
        {queueEntry ? <BellOff size={18} /> : <Bell size={18} />}
        <span>
          {loading
            ? (t('loading') as string)
            : queueEntry
            ? (t('cancelQueue') as string)
            : (t('joinQueue') as string)}
        </span>
      </button>
      {queueEntry && (
        <p className="text-center text-xs text-blue-600 dark:text-blue-400 font-medium">
          {t('queuePosition') as string} {queueEntry.position}
        </p>
      )}
    </div>
  )
}