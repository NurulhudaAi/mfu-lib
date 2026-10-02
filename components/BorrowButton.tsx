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
  const { t, profile, showAlert, showConfirm } = useApp()
  const router = useRouter()

  function handleBorrow() {
    if (!userId) return
    showConfirm({
      type: 'info',
      title: 'ยืนยันการยืมหนังสือ',
      message: `คุณต้องการยืมหนังสือ "${book.title}" ใช่หรือไม่?`,
      confirmText: 'ยืนยันยืม',
      cancelText: 'ยกเลิก',
      onConfirm: async () => {
        setLoading(true)
        try {
          const res = await fetch('/api/borrow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId: book.id }),
          })
          const data = await res.json()
          if (data.error) {
            showAlert({
              type: 'error',
              title: 'ไม่สามารถยืมหนังสือได้',
              message: data.error,
            })
            setLoading(false)
            return
          }
          showAlert({
            type: 'success',
            title: 'ยืมหนังสือสำเร็จ!',
            message: `บันทึกการยืมหนังสือ "${book.title}" เรียบร้อยแล้ว สามารถดูรายละเอียดกำหนดส่งคืนได้ที่หน้า การยืมของฉัน`,
          })
          router.refresh()
        } catch (err: any) {
          showAlert({
            type: 'error',
            title: 'เกิดข้อผิดพลาด',
            message: err.message || 'กรุณาลองใหม่อีกครั้ง',
          })
        } finally {
          setLoading(false)
        }
      },
    })
  }

  function handleQueue(action: 'join' | 'leave') {
    if (!userId) return
    if (action === 'leave') {
      showConfirm({
        type: 'warning',
        title: 'ยืนยันการยกเลิกคิว',
        message: `คุณต้องการยกเลิกการต่อคิวหนังสือ "${book.title}" ใช่หรือไม่?`,
        confirmText: 'ยืนยันยกเลิก',
        cancelText: 'ย้อนกลับ',
        onConfirm: async () => {
          setLoading(true)
          const res = await fetch('/api/queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId: book.id, action }),
          })
          const data = await res.json()
          if (data.error) {
            showAlert({ type: 'error', title: 'ไม่สามารถยกเลิกคิวได้', message: data.error })
          } else {
            showAlert({ type: 'info', title: 'ยกเลิกคิวแล้ว', message: 'คุณได้ออกจากคิวหนังสือเล่มนี้เรียบร้อยแล้ว' })
          }
          router.refresh()
          setLoading(false)
        },
      })
    } else {
      showConfirm({
        type: 'info',
        title: 'ยืนยันการจองคิว',
        message: `คุณต้องการเข้าคิวหนังสือ "${book.title}" ใช่หรือไม่? ระบบจะส่งอีเมลแจ้งเตือนเมื่อถึงคิวของคุณ`,
        confirmText: 'ยืนยันจองคิว',
        cancelText: 'ยกเลิก',
        onConfirm: async () => {
          setLoading(true)
          const res = await fetch('/api/queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId: book.id, action }),
          })
          const data = await res.json()
          if (data.error) {
            showAlert({ type: 'error', title: 'ไม่สามารถเข้าคิวได้', message: data.error })
          } else {
            showAlert({ type: 'success', title: 'เข้าคิวสำเร็จ!', message: 'ระบบจะส่งอีเมลแจ้งเตือนเมื่อหนังสือพร้อมให้ยืม' })
          }
          router.refresh()
          setLoading(false)
        },
      })
    }
  }

  if (!userId) {
    return (
      <a href="/login" className="block w-full py-3 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl font-semibold text-center transition-colors shadow-sm">
        เข้าสู่ระบบเพื่อยืมหนังสือ
      </a>
    )
  }

  if (profile?.role === 'admin') {
    return (
      <div className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium text-sm border border-neutral-200 dark:border-neutral-700">
        <ShieldCheck size={18} />
        <span>Admin ไม่สามารถยืมหนังสือได้</span>
      </div>
    )
  }

  if (profile?.is_blacklisted) {
    return (
      <div className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 font-medium text-sm px-2 text-center">
        <ShieldCheck size={18} />
        <span>คุณถูกระงับสิทธิ์การยืมหนังสือชั่วคราว</span>
      </div>
    )
  }

  if (currentBorrow) {
    return (
      <a href="/my-borrows" className="flex items-center justify-center gap-2 w-full py-3 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl font-semibold transition-colors shadow-sm">
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
        className="flex items-center justify-center gap-2 w-full py-3 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 disabled:opacity-50 text-white dark:text-black rounded-xl font-semibold transition-colors shadow-sm"
      >
        <BookOpen size={18} />
        <span>{loading ? (t('loading') as string) : (t('borrow') as string)}</span>
      </button>
    )
  }

  return (
    <div className="space-y-2">
      {queueCount > 0 && (
        <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
          {queueCount} {t('waitingCount') as string}
        </p>
      )}
      <button
        onClick={() => handleQueue(queueEntry ? 'leave' : 'join')}
        disabled={loading}
        className={
          'flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 ' +
          (queueEntry
            ? 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700'
            : 'bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 shadow-sm')
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
        <p className="text-center text-xs text-neutral-700 dark:text-neutral-300 font-medium">
          {t('queuePosition') as string} {queueEntry.position}
        </p>
      )}
    </div>
  )
}