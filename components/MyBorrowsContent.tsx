'use client'
import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/app-context'
import { format } from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import {
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  X,
  RotateCcw,
  Bell,
  Upload,
  Camera,
  ExternalLink,
  Calendar,
  AlertTriangle,
  FileText,
  Info,
} from 'lucide-react'

interface Props {
  borrows: any[]
  queues: any[]
  userId: string
}

const statusConfig = {
  active: {
    label: 'กำลังยืม',
    en: 'Active',
    icon: Clock,
    color: 'text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700',
  },
  returned: {
    label: 'คืนแล้ว',
    en: 'Returned',
    icon: CheckCircle,
    color: 'text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/60',
  },
  overdue: {
    label: 'เกินกำหนด',
    en: 'Overdue',
    icon: AlertCircle,
    color: 'text-white bg-black dark:bg-white dark:text-black font-bold',
  },
}

export default function MyBorrowsContent({ borrows, queues, userId }: Props) {
  const [tab, setTab] = useState<'active' | 'history' | 'queue'>('active')
  const [mounted, setMounted] = useState(false)

  // Detailed proof modal state
  const [proofBorrow, setProofBorrow] = useState<any | null>(null)

  // Return book interactive modal state (in-page modal, no date picker, notes included)
  const [returnBorrow, setReturnBorrow] = useState<any | null>(null)
  const [returnPhoto, setReturnPhoto] = useState<File | null>(null)
  const [returnPreview, setReturnPreview] = useState<string | null>(null)
  const [returnNotes, setReturnNotes] = useState<string>('')
  const [isSubmittingReturn, setIsSubmittingReturn] = useState<boolean>(false)
  const [isDragging, setIsDragging] = useState<boolean>(false)

  const {
    t,
    locale,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    showAlert,
    showConfirm,
    showToast,
  } = useApp()
  const router = useRouter()

  const dateLocale = locale === 'th' ? th : enUS

  function formatDate(date: string) {
    if (!date) return '-'
    return format(new Date(date), 'dd MMM yyyy', { locale: dateLocale })
  }

  // Ensure portal only mounts on client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent background scrolling and avoid layout shift
  useEffect(() => {
    const isModalOpen = Boolean(returnBorrow || proofBorrow)
    if (!isModalOpen) return

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
  }, [returnBorrow, proofBorrow])

  // ESC key to close modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (returnBorrow && !isSubmittingReturn) {
          closeReturnModal()
        } else if (proofBorrow) {
          setProofBorrow(null)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [returnBorrow, isSubmittingReturn, proofBorrow])

  // ✅ Contextual search and category filtering helper
  const isMatch = (itemBook: any) => {
    if (!itemBook) return true
    const q = searchQuery.toLowerCase().trim()
    const matchSearch =
      !q ||
      itemBook.title?.toLowerCase().includes(q) ||
      itemBook.author?.toLowerCase().includes(q) ||
      itemBook.category?.toLowerCase().includes(q)

    const matchCategory =
      selectedCategory === 'all' || itemBook.category === selectedCategory

    return matchSearch && matchCategory
  }

  const filteredActiveBorrows = useMemo(() => {
    return borrows.filter((b) => b.status === 'active' && isMatch(b.books))
  }, [borrows, searchQuery, selectedCategory])

  const filteredHistoryBorrows = useMemo(() => {
    return borrows.filter((b) => b.status !== 'active' && isMatch(b.books))
  }, [borrows, searchQuery, selectedCategory])

  const filteredQueues = useMemo(() => {
    return queues.filter((q) => isMatch(q.books))
  }, [queues, searchQuery, selectedCategory])

  const hasActiveFilters = Boolean(searchQuery.trim()) || selectedCategory !== 'all'

  function closeReturnModal() {
    if (returnPreview) {
      URL.revokeObjectURL(returnPreview)
    }
    setReturnBorrow(null)
    setReturnPhoto(null)
    setReturnPreview(null)
    setReturnNotes('')
    setIsDragging(false)
  }

  function handleSelectedFile(file: File) {
    if (!file.type.startsWith('image/')) {
      showAlert({
        type: 'warning',
        title: 'รูปแบบไฟล์ไม่ถูกต้อง',
        message: 'กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP)',
      })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      showAlert({
        type: 'warning',
        title: 'ไฟล์มีขนาดใหญ่เกินไป',
        message: 'ขนาดไฟล์รูปภาพหลักฐานต้องไม่เกิน 10MB กรุณาเลือกไฟล์ใหม่',
      })
      return
    }

    if (returnPreview) {
      URL.revokeObjectURL(returnPreview)
    }
    setReturnPhoto(file)
    setReturnPreview(URL.createObjectURL(file))
  }

  // Handle Return photo upload
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    handleSelectedFile(file)
    e.target.value = ''
  }

  // Handle return book submit
  async function handleSubmitReturn() {
    if (!returnBorrow) return
    if (!returnPhoto) {
      showAlert({
        type: 'warning',
        title: 'กรุณาแนบรูปหลักฐาน',
        message: 'กรุณาถ่ายรูปหรือแนบรูปถ่ายหนังสือที่นำไปคืนที่ชั้นวางหนังสือเพื่อเป็นหลักฐาน',
      })
      return
    }

    setIsSubmittingReturn(true)
    try {
      const formData = new FormData()
      formData.append('borrowId', returnBorrow.id)
      formData.append('photo', returnPhoto)
      if (returnNotes.trim()) {
        formData.append('notes', returnNotes.trim())
      }

      const res = await fetch('/api/return', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (data.error) {
        showAlert({
          type: 'error',
          title: 'ไม่สามารถคืนหนังสือได้',
          message: data.error,
        })
        setIsSubmittingReturn(false)
        return
      }

      const bookTitle = returnBorrow.books?.title || ''
      setReturnBorrow(null)
      setReturnPhoto(null)
      setReturnPreview(null)
      setReturnNotes('')
      setIsSubmittingReturn(false)

      showAlert({
        type: 'success',
        title: 'คืนหนังสือสำเร็จ!',
        message: `ระบบได้บันทึกการคืนหนังสือ "${bookTitle}" เรียบร้อยแล้ว ขอบคุณที่ดูแลหนังสือเป็นอย่างดี`,
      })

      router.refresh()
    } catch (err: any) {
      showAlert({
        type: 'error',
        title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
        message: err.message || 'กรุณาลองใหม่อีกครั้ง',
      })
      setIsSubmittingReturn(false)
    }
  }

  // ✅ Interactive Cancel Queue confirmation
  function confirmCancelQueue(queueId: string, bookTitle: string, bookId: string) {
    showConfirm({
      type: 'warning',
      title: 'ยืนยันการยกเลิกการจองคิว?',
      message: `คุณต้องการยกเลิกการจองคิวหนังสือ "${bookTitle}" หรือไม่? หากยกเลิกแล้วจะต้องต่อคิวใหม่หากต้องการจองอีกครั้ง`,
      confirmText: 'ยืนยันยกเลิก',
      cancelText: 'ย้อนกลับ',
      onConfirm: async () => {
        const res = await fetch('/api/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId, queueId, action: 'leave' }),
        })
        const data = await res.json()
        if (!data.error) {
          showToast('ยกเลิกการจองคิวเรียบร้อยแล้ว', 'info')
          router.refresh()
        } else {
          showAlert({
            type: 'error',
            title: 'ไม่สามารถยกเลิกได้',
            message: data.error || 'เกิดข้อผิดพลาด',
          })
        }
      },
    })
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-6 sm:p-8 lg:p-10 space-y-6 animate-fade-in">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white mb-1">
            {t('myBorrows')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">
            {locale === 'th'
              ? 'จัดการรายการยืม-คืน และประวัติการอ่านของคุณ'
              : 'Manage your active borrows and reading history'}
          </p>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory('all')
            }}
            className="text-xs font-semibold text-neutral-500 hover:text-black dark:hover:text-white underline self-start sm:self-auto transition-colors"
          >
            {locale === 'th' ? 'ล้างตัวกรองทั้งหมด' : 'Clear all filters'}
          </button>
        )}
      </div>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
          <span className="text-neutral-400 font-medium">
            {locale === 'th' ? 'ตัวกรองที่เลือก:' : 'Active filters:'}
          </span>

          {searchQuery.trim() && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-[#151518] text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 font-medium shadow-xs">
              <span className="text-neutral-400">{locale === 'th' ? 'ค้นหา:' : 'Query:'}</span>
              <span className="font-semibold">"{searchQuery}"</span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-0.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                title="ลบคำค้นหา"
              >
                <X size={12} />
              </button>
            </span>
          )}

          {selectedCategory !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-[#151518] text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 font-medium shadow-xs">
              <span className="text-neutral-400">{locale === 'th' ? 'หมวดหมู่:' : 'Category:'}</span>
              <span className="font-semibold">{selectedCategory}</span>
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="p-0.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                title="ลบหมวดหมู่"
              >
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-1.5 border border-neutral-200 dark:border-neutral-800">
        {[
          { key: 'active', label: `${t('activeBorrow')} (${filteredActiveBorrows.length})` },
          { key: 'history', label: `${t('history')} (${filteredHistoryBorrows.length})` },
          { key: 'queue', label: `จองคิว (${filteredQueues.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              tab === key
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Active borrows */}
      {tab === 'active' && (
        <div className="space-y-4">
          {filteredActiveBorrows.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              text={
                hasActiveFilters
                  ? locale === 'th'
                    ? 'ไม่พบรายการยืมที่กำลังใช้งานตามเงื่อนไขที่ค้นหา'
                    : 'No active borrows match your search criteria'
                  : 'ไม่มีการยืมที่ใช้งานอยู่'
              }
              hasActiveFilters={hasActiveFilters}
              onClear={() => {
                setSearchQuery('')
                setSelectedCategory('all')
              }}
            />
          ) : (
            filteredActiveBorrows.map((borrow) => (
              <BorrowCard
                key={borrow.id}
                borrow={borrow}
                formatDate={formatDate}
                onViewProof={() => setProofBorrow(borrow)}
                onReturnClick={() => setReturnBorrow(borrow)}
                showActions={true}
              />
            ))
          )}
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div className="space-y-4">
          {filteredHistoryBorrows.length === 0 ? (
            <EmptyState
              icon={Clock}
              text={
                hasActiveFilters
                  ? locale === 'th'
                    ? 'ไม่พบประวัติการยืมตามเงื่อนไขที่ค้นหา'
                    : 'No borrow history matches your search criteria'
                  : t('noBorrows')
              }
              hasActiveFilters={hasActiveFilters}
              onClear={() => {
                setSearchQuery('')
                setSelectedCategory('all')
              }}
            />
          ) : (
            filteredHistoryBorrows.map((borrow) => (
              <BorrowCard
                key={borrow.id}
                borrow={borrow}
                formatDate={formatDate}
                onViewProof={() => setProofBorrow(borrow)}
                onReturnClick={() => {}}
                showActions={false}
              />
            ))
          )}
        </div>
      )}

      {/* Queue */}
      {tab === 'queue' && (
        <div className="space-y-4">
          {filteredQueues.length === 0 ? (
            <EmptyState
              icon={Bell}
              text={
                hasActiveFilters
                  ? locale === 'th'
                    ? 'ไม่พบการจองคิวตามเงื่อนไขที่ค้นหา'
                    : 'No queued books match your search criteria'
                  : 'ไม่มีการจองคิว'
              }
              hasActiveFilters={hasActiveFilters}
              onClear={() => {
                setSearchQuery('')
                setSelectedCategory('all')
              }}
            />
          ) : (
            filteredQueues.map((queue) => (
              <div
                key={queue.id}
                className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-5 flex items-center gap-4 shadow-xs transition-all hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                <div className="w-14 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-xl overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700">
                  {queue.books?.cover_url ? (
                    <img
                      src={queue.books.cover_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={20} className="text-neutral-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/books/${queue.books?.id}`}
                    className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white hover:text-black dark:hover:text-neutral-200 truncate block transition-colors"
                  >
                    {queue.books?.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {queue.books?.author && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {queue.books.author}
                      </p>
                    )}
                    {queue.books?.category && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                        {queue.books.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-1 rounded-full">
                      <Bell size={12} />
                      {t('queuePosition')} {queue.position}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        confirmCancelQueue(
                          queue.id,
                          queue.books?.title || 'หนังสือ',
                          queue.books?.id
                        )
                      }
                      className="text-xs font-semibold text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:underline transition-colors"
                    >
                      {locale === 'th' ? 'ยกเลิกการจอง' : 'Leave queue'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. UPGRADED RETURN BOOK INTERACTIVE MODAL (PORTAL)       */}
      {/* ======================================================== */}
      {mounted && returnBorrow && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Full-screen Backdrop blur */}
          <div
            onClick={() => !isSubmittingReturn && closeReturnModal()}
            className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Centered Modal Container */}
          <div className="relative w-full max-w-lg bg-white dark:bg-[#111113] rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl z-10 animate-scale-in flex flex-col max-h-[calc(100dvh-32px)] sm:max-h-[90vh] overflow-hidden text-left">
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-50/50 dark:bg-neutral-900/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0 shadow-xs">
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-neutral-900 dark:text-white leading-tight">
                    {t('returnBook')}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    บันทึกการส่งคืนและแนบหลักฐานภาพถ่าย
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSubmittingReturn}
                onClick={closeReturnModal}
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                title="ปิด"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
              {/* Book Summary Card */}
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#18181b] border border-neutral-200 dark:border-neutral-800">
                <div className="w-13 h-18 sm:w-14 sm:h-20 bg-neutral-200 dark:bg-neutral-800 rounded-xl overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700 shadow-xs">
                  {returnBorrow.books?.cover_url ? (
                    <img
                      src={returnBorrow.books.cover_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={20} className="text-neutral-400" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white truncate">
                    {returnBorrow.books?.title}
                  </h4>
                  {returnBorrow.books?.author && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                      {returnBorrow.books.author}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                    {returnBorrow.books?.category && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium">
                        {returnBorrow.books.category}
                      </span>
                    )}
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      กำหนดคืน: <strong className="font-semibold text-neutral-800 dark:text-neutral-200">{formatDate(returnBorrow.due_date)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Upload Proof Area (Drag & Drop + Mobile Camera) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                    <span>รูปถ่ายหลักฐานการคืน</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span className="text-[11px] text-neutral-400 font-medium">JPG, PNG, WEBP (สูงสุด 10MB)</span>
                </div>

                {returnPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-950 flex flex-col items-center justify-center group shadow-xs">
                    <div className="w-full p-2 bg-neutral-900/80 backdrop-blur-sm border-b border-neutral-800 flex items-center justify-between text-xs text-neutral-300 px-3 z-10">
                      <div className="flex items-center gap-1.5 truncate">
                        <ImageIcon size={13} className="text-neutral-400 shrink-0" />
                        <span className="truncate text-[11px] font-medium">
                          {returnPhoto?.name || 'หลักฐานการคืน'}
                        </span>
                        {returnPhoto && (
                          <span className="text-[10px] text-neutral-400 shrink-0">
                            ({(returnPhoto.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <label className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors text-[11px] font-medium flex items-center gap-1">
                          <Camera size={11} />
                          <span>เปลี่ยนรูป</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (returnPreview) URL.revokeObjectURL(returnPreview)
                            setReturnPhoto(null)
                            setReturnPreview(null)
                          }}
                          className="p-1 rounded-lg bg-white/10 hover:bg-red-500/80 text-white transition-colors"
                          title="ลบรูปภาพ"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="w-full max-h-72 sm:max-h-80 flex items-center justify-center p-3">
                      <img
                        src={returnPreview}
                        alt="Proof preview"
                        className="max-h-64 sm:max-h-72 w-auto max-w-full object-contain rounded-lg shadow-md"
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsDragging(true)
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setIsDragging(false)
                      const file = e.dataTransfer.files?.[0]
                      if (file) handleSelectedFile(file)
                    }}
                    className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 transition-all flex flex-col items-center justify-center text-center group cursor-pointer ${
                      isDragging
                        ? 'border-black dark:border-white bg-neutral-100 dark:bg-neutral-800'
                        : 'border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white bg-neutral-50/70 dark:bg-[#161619]'
                    }`}
                  >
                    <label className="absolute inset-0 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>
                    <div className="w-13 h-13 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
                      <Camera size={22} className="text-neutral-800 dark:text-neutral-200" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
                      คลิกเพื่ออัปโหลด หรือถ่ายภาพหนังสือ
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs leading-relaxed">
                      ถ่ายภาพหนังสือขณะวางคืนบนชั้นหรือจุดคืนให้เห็นเล่มชัดเจน
                    </span>
                    <span className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-neutral-200/70 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-300/60 dark:border-neutral-700">
                      <Upload size={10} /> ลากไฟล์มาวางที่นี่ได้
                    </span>
                  </div>
                )}
              </div>

              {/* Notes Field (หมายเหตุเพิ่มเติม) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
                  <span>หมายเหตุเพิ่มเติม</span>
                  <span className="text-[11px] text-neutral-400 font-normal lowercase">(ถ้ามี / ไม่บังคับ)</span>
                </label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="เช่น หนังสือสภาพเรียบร้อย วางไว้ที่ชั้นหมวดหมู่วิทยาศาสตร์ แถวที่ 2 หรือฝากไว้ที่เคาน์เตอร์..."
                  rows={3}
                  className="w-full p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#18181b] border border-neutral-200 dark:border-neutral-800 text-xs sm:text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-black dark:focus:border-white transition-all resize-none shadow-xs"
                />
              </div>

              {/* Interactive Help Hint */}
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-900/60 text-neutral-600 dark:text-neutral-400 text-xs border border-neutral-200 dark:border-neutral-800">
                <Info size={16} className="shrink-0 mt-0.5 text-neutral-600 dark:text-neutral-300" />
                <p className="leading-relaxed">
                  ระบบจะบันทึกเวลาคืนในปัจจุบันโดยอัตโนมัติ และแจ้งเตือนสมาชิกในคิวถัดไปให้เข้ามารับหนังสือทันที
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-[#141416] flex items-center gap-3 shrink-0">
              <button
                type="button"
                disabled={isSubmittingReturn}
                onClick={closeReturnModal}
                className="flex-1 py-3 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!returnPhoto || isSubmittingReturn}
                onClick={handleSubmitReturn}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-40 transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                {isSubmittingReturn ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                    <span>กำลังบันทึกการคืน...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} />
                    <span>ยืนยันการคืนหนังสือ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* 2. UPGRADED VIEW PROOF DETAIL MODAL (PORTAL)             */}
      {/* ======================================================== */}
      {mounted && proofBorrow && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Full-screen Backdrop blur */}
          <div
            onClick={() => setProofBorrow(null)}
            className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Centered Modal Container */}
          <div className="relative w-full max-w-xl bg-white dark:bg-[#111113] rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl z-10 animate-scale-in flex flex-col max-h-[calc(100dvh-32px)] sm:max-h-[90vh] overflow-hidden text-left">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-50/50 dark:bg-neutral-900/30">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base sm:text-lg text-neutral-900 dark:text-white leading-tight">
                    {t('returnProof')}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                    {proofBorrow.books?.title}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {proofBorrow.proof_signed_url && (
                  <a
                    href={proofBorrow.proof_signed_url}
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
                  onClick={() => setProofBorrow(null)}
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
                  {proofBorrow.books?.cover_url ? (
                    <img
                      src={proofBorrow.books.cover_url}
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
                    {proofBorrow.books?.category && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium">
                        {proofBorrow.books.category}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                    {proofBorrow.books?.title}
                  </h4>
                  {proofBorrow.books?.author && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                      {proofBorrow.books.author}
                    </p>
                  )}
                </div>
              </div>

              {/* Main Proof Image Container (Flexible height, no awkward cropping) */}
              <div className="relative rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-950 flex flex-col items-center justify-center shadow-xs">
                {proofBorrow.proof_signed_url ? (
                  <>
                    <div className="w-full flex items-center justify-center p-3 sm:p-4 min-h-[260px] max-h-[420px]">
                      <img
                        src={proofBorrow.proof_signed_url}
                        alt="Proof"
                        className="max-h-[380px] w-auto max-w-full object-contain rounded-xl select-none"
                      />
                    </div>
                    <div className="w-full p-2.5 bg-neutral-900/90 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-300 px-4">
                      <span className="text-[11px] text-neutral-400">รูปภาพหลักฐานการคืนหนังสือ</span>
                      <a
                        href={proofBorrow.proof_signed_url}
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
                    <span className="text-neutral-400 block text-[11px] mb-0.5">วันที่ยืม</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {formatDate(proofBorrow.borrowed_at)}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px] mb-0.5">กำหนดส่งคืน</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {formatDate(proofBorrow.due_date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px] mb-0.5">วันที่ส่งคืนจริง</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {proofBorrow.returned_at ? formatDate(proofBorrow.returned_at) : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px] mb-0.5">รหัสรายการยืม</span>
                    <span className="font-mono text-[11px] text-neutral-700 dark:text-neutral-300">
                      #{proofBorrow.id ? proofBorrow.id.slice(0, 8).toUpperCase() : '-'}
                    </span>
                  </div>
                </div>

                {/* Return Notes Callout if available */}
                {proofBorrow.notes && (
                  <div className="pt-2.5 border-t border-neutral-200 dark:border-neutral-700/60 text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400 block text-[11px] mb-1 font-semibold">
                      หมายเหตุจากผู้ยืม:
                    </span>
                    <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium leading-relaxed whitespace-pre-line text-xs">
                      "{proofBorrow.notes}"
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-[#141416] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setProofBorrow(null)}
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

function BorrowCard({
  borrow,
  formatDate,
  onViewProof,
  onReturnClick,
  showActions,
}: {
  borrow: any
  formatDate: (d: string) => string
  onViewProof: () => void
  onReturnClick: () => void
  showActions: boolean
}) {
  const { t, locale } = useApp()
  const status = statusConfig[borrow.status as keyof typeof statusConfig] || statusConfig.active
  const StatusIcon = status.icon

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-5 shadow-xs transition-all hover:border-neutral-300 dark:hover:border-neutral-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Book cover & details */}
        <div className="flex gap-4 min-w-0 flex-1">
          <div className="w-14 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-xl overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700 shadow-xs">
            {borrow.books?.cover_url ? (
              <img src={borrow.books.cover_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen size={20} className="text-neutral-400" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <Link
              href={`/books/${borrow.books?.id}`}
              className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white hover:text-black dark:hover:text-neutral-200 truncate block transition-colors"
            >
              {borrow.books?.title}
            </Link>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {borrow.books?.author && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{borrow.books.author}</p>
              )}
              {borrow.books?.category && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 font-medium">
                  {borrow.books.category}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span>{t('borrowedAt')}: <strong className="text-neutral-700 dark:text-neutral-300 font-medium">{formatDate(borrow.borrowed_at)}</strong></span>
              {borrow.status === 'active' && (
                <span className={`font-semibold ${
                  new Date(borrow.due_date) < new Date() ? 'text-neutral-900 dark:text-white underline' : 'text-neutral-700 dark:text-neutral-300'
                }`}>
                  {t('dueDate')}: {formatDate(borrow.due_date)}
                </span>
              )}
              {borrow.returned_at && (
                <span>{t('returnedAt')}: <strong className="text-neutral-700 dark:text-neutral-300 font-medium">{formatDate(borrow.returned_at)}</strong></span>
              )}
            </div>

            {/* Notes display if available */}
            {borrow.notes && (
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 bg-neutral-50 dark:bg-neutral-800/40 p-2.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 line-clamp-2">
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{locale === 'th' ? 'หมายเหตุ:' : 'Notes:'}</span> {borrow.notes}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2.5">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.color}`}>
                <StatusIcon size={11} />
                {locale === 'th' ? status.label : status.en}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons Column */}
        <div className="shrink-0 flex items-center sm:flex-col sm:items-end justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800">
          {/* Active Tab: Return Button */}
          {showActions && borrow.status === 'active' && (
            <button
              type="button"
              onClick={onReturnClick}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl text-xs font-bold transition-all shadow-xs active:scale-[0.98]"
            >
              <RotateCcw size={13} />
              <span>{t('returnBook')}</span>
            </button>
          )}

          {/* History / Proof button */}
          {borrow.proof_signed_url ? (
            <button
              type="button"
              onClick={onViewProof}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 transition-all shadow-xs active:scale-[0.98]"
            >
              <Camera size={13} />
              <span>ดูรูปหลักฐาน</span>
            </button>
          ) : borrow.status === 'returned' && (
            <span className="text-[11px] text-neutral-400 font-medium px-2 py-1">
              ไม่มีรูปหลักฐาน
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  text,
  hasActiveFilters,
  onClear,
}: {
  icon: any
  text: string
  hasActiveFilters?: boolean
  onClear?: () => void
}) {
  return (
    <div className="text-center py-16 px-4 rounded-3xl bg-neutral-50 dark:bg-neutral-900/30 border border-dashed border-neutral-200 dark:border-neutral-800 text-neutral-400 dark:text-neutral-500">
      <Icon size={44} className="mx-auto mb-3 opacity-30" />
      <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{text}</p>
      {hasActiveFilters && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-3 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
        >
          ล้างตัวกรองการค้นหา
        </button>
      )}
    </div>
  )
}