'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen,
  RotateCcw,
  Bell,
  BellOff,
  ShieldCheck,
  ShieldAlert,
  LogIn,
  AlertCircle,
  ArrowRight,
  Clock,
  Sparkles,
  Lock,
  Ban
} from 'lucide-react'
import { useApp } from '@/lib/app-context'

interface Props {
  book: { id: string; available_copies: number; total_copies?: number; is_active?: boolean; title: string }
  userId: string | null
  currentBorrow: { id: string; due_date: string } | null
  otherActiveBorrow?: { id: string; bookTitle: string } | null
  queueEntry: { id: string; position: number } | null
  queueCount: number
}

export default function BorrowButton({
  book,
  userId,
  currentBorrow,
  otherActiveBorrow,
  queueEntry,
  queueCount,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [quotaBlockedMsg, setQuotaBlockedMsg] = useState<string | null>(null)
  const { t, locale, profile, showAlert, showConfirm } = useApp()
  const router = useRouter()

  function triggerShake(reason?: string) {
    setIsShaking(true)
    if (reason) setQuotaBlockedMsg(reason)
    setTimeout(() => setIsShaking(false), 400)
  }

  function handleBorrow() {
    if (!userId) {
      triggerShake()
      return
    }

    showConfirm({
      type: 'info',
      title: 'ยืนยันการยืมหนังสือ',
      message: `คุณต้องการยืมหนังสือ "${book.title}" ใช่หรือไม่?`,
      confirmText: 'ยืนยันยืม',
      cancelText: 'ยกเลิก',
      onConfirm: async () => {
        setLoading(true)
        setQuotaBlockedMsg(null)
        try {
          const res = await fetch('/api/borrow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId: book.id }),
          })
          const data = await res.json()
          if (data.error) {
            triggerShake(data.error)
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
          triggerShake(err.message)
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
    if (!userId) {
      triggerShake()
      return
    }

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
            triggerShake()
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
            triggerShake()
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

  // 1. Not Logged In State (Guest)
  if (!userId) {
    return (
      <Link
        href="/login"
        className="flex items-center justify-center gap-2 w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 rounded-2xl font-semibold text-sm transition-all shadow-sm active:scale-98"
      >
        <LogIn size={17} />
        <span>{locale === 'th' ? 'เข้าสู่ระบบเพื่อยืมหนังสือ' : 'Log in to borrow'}</span>
      </Link>
    )
  }

  // 2. Book is Deactivated / Closed by Admin
  if (book.is_active === false) {
    return (
      <div className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 font-medium text-xs sm:text-sm border border-neutral-200 dark:border-neutral-700/80 select-none">
        <Lock size={16} className="opacity-70" />
        <span>{locale === 'th' ? 'หนังสือเล่มนี้ปิดการใช้งานชั่วคราว (ไม่เปิดให้ยืม)' : 'This book is currently disabled'}</span>
      </div>
    )
  }

  // 3. Admin Account (Cannot borrow)
  if (profile?.role === 'admin') {
    return (
      <div className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 font-medium text-xs sm:text-sm border border-neutral-200 dark:border-neutral-700/80 select-none">
        <ShieldCheck size={18} className="opacity-70" />
        <span>{locale === 'th' ? 'บัญชีผู้ดูแลระบบ (Admin) ไม่สามารถยืมหนังสือได้' : 'Admin accounts cannot borrow books'}</span>
      </div>
    )
  }

  // 4. Blacklisted Member
  if (profile?.is_blacklisted) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 w-full py-3.5 px-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 font-medium text-xs sm:text-sm text-center">
        <div className="flex items-center gap-1.5 font-semibold">
          <ShieldAlert size={17} />
          <span>{locale === 'th' ? 'คุณถูกระงับสิทธิ์การยืมชั่วคราว' : 'Borrowing privileges suspended'}</span>
        </div>
        <p className="text-[11px] opacity-80">
          {locale === 'th' ? 'โปรดติดต่อผู้ดูแลชมรมเพื่อสอบถามรายละเอียด' : 'Please contact the club librarian'}
        </p>
      </div>
    )
  }

  // 5. Currently Borrowing THIS book
  if (currentBorrow) {
    return (
      <div className="space-y-2 w-full">
        <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300">
          <span className="flex items-center gap-1 font-medium">
            <Clock size={13} />
            {locale === 'th' ? 'คุณกำลังยืมเล่มนี้อยู่' : 'You currently borrowed this book'}
          </span>
          <span className="font-semibold text-[11px]">
            {locale === 'th' ? 'กำหนดส่ง' : 'Due'}: {currentBorrow.due_date}
          </span>
        </div>
        <Link
          href={`/return/${currentBorrow.id}`}
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black rounded-2xl font-semibold transition-all shadow-sm active:scale-98"
        >
          <RotateCcw size={17} />
          <span>{t('returnBook') as string}</span>
        </Link>
      </div>
    )
  }

  // 6. User has reached borrow quota (Already borrowing another book - Limit 1 book per person)
  if (otherActiveBorrow) {
    return (
      <div className="space-y-2.5 w-full">
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs">
          <Lock size={14} className="text-amber-600 shrink-0" />
          <span>
            {locale === 'th'
              ? `จำกัดสิทธิ์ 1 เล่มต่อคน (คุณกำลังยืม "${otherActiveBorrow.bookTitle}")`
              : `Limit 1 book per person (You borrowed "${otherActiveBorrow.bookTitle}")`}
          </span>
        </div>
        <Link
          href="/my-borrows"
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-2xl font-semibold text-xs sm:text-sm border border-neutral-200 dark:border-neutral-700 transition-all shadow-xs"
        >
          <span>{locale === 'th' ? 'ไปที่หน้าการยืมเพื่อส่งคืนก่อน' : 'Go to My Borrows to return'}</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    )
  }

  // 5. Book is Available (> 0 copies)
  if (book.available_copies > 0) {
    return (
      <div className="space-y-2.5 w-full">
        {/* Dynamic Quota Blocked Alert with Quick Action */}
        {quotaBlockedMsg && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs animate-scale-in">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{quotaBlockedMsg}</span>
            </div>
            <Link
              href="/my-borrows"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-200/80 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 text-[11px] font-semibold hover:opacity-90 shrink-0"
            >
              <span>{locale === 'th' ? 'ดูรายการยืม' : 'My Borrows'}</span>
              <ArrowRight size={11} />
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={handleBorrow}
          disabled={loading}
          className={`flex items-center justify-center gap-2 w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 disabled:opacity-50 text-white dark:text-black rounded-2xl font-semibold text-sm transition-all shadow-sm active:scale-98 cursor-pointer ${
            isShaking ? 'animate-shake' : ''
          }`}
        >
          <BookOpen size={18} />
          <span>{loading ? (t('loading') as string) : (t('borrow') as string)}</span>
        </button>
      </div>
    )
  }

  // 6. Book is Out of Stock (0 Available Copies) -> Smart Queue / Waitlist Interaction
  return (
    <div className={`space-y-2.5 w-full ${isShaking ? 'animate-shake' : ''}`}>
      {/* Out of stock minimal notice banner */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 text-xs text-neutral-600 dark:text-neutral-400">
        <span className="flex items-center gap-1.5 font-medium">
          <Lock size={13} className="text-neutral-400" />
          <span>{locale === 'th' ? 'หนังสือถูกยืมครบแล้ว' : 'All copies are currently borrowed'}</span>
        </span>
        {queueCount > 0 && (
          <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
            {queueCount} {t('waitingCount') as string}
          </span>
        )}
      </div>

      {/* Smart Action: Join or Leave Queue */}
      <button
        type="button"
        onClick={() => handleQueue(queueEntry ? 'leave' : 'join')}
        disabled={loading}
        className={
          'flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-semibold text-sm transition-all disabled:opacity-50 active:scale-98 ' +
          (queueEntry
            ? 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700'
            : 'bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 shadow-sm')
        }
      >
        {queueEntry ? <BellOff size={17} /> : <Bell size={17} />}
        <span>
          {loading
            ? (t('loading') as string)
            : queueEntry
            ? (t('cancelQueue') as string)
            : (t('joinQueue') as string)}
        </span>
      </button>

      {/* Queue Position Pill */}
      {queueEntry && (
        <div className="flex items-center justify-center gap-1.5 py-1 px-3 text-xs text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/80 dark:border-emerald-900/50">
          <Sparkles size={13} />
          <span>
            {t('queuePosition') as string} {queueEntry.position} ({locale === 'th' ? 'ระบบจะส่งอีเมลแจ้งเตือนเมื่อพร้อม' : 'Will notify via email'})
          </span>
        </div>
      )}
    </div>
  )
}