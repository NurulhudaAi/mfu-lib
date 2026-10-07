'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/lib/app-context'
import {
  BookOpen,
  Sparkles,
  ArrowRight,
  Layers,
  EyeOff,
  ScrollText,
} from 'lucide-react'
import BookCard from './BookCard'
import AnnouncementCarousel, {
  AnnouncementItem,
  extractAnnouncementPopup,
  cleanAnnouncementBody,
  extractAnnouncementImage,
  extractAnnouncementExpiry,
} from './AnnouncementCarousel'
import AnnouncementPopupModal from './AnnouncementPopupModal'

interface Book {
  id: string
  title: string
  author: string | null
  cover_url: string | null
  category: string | null
  available_copies: number
  total_copies: number
  is_featured: boolean
  is_active?: boolean
  created_at: string
  description?: string | null
  isbn?: string | null
  publisher?: string | null
  published_year?: number | null
}

interface Props {
  books: Book[]
  announcements: AnnouncementItem[]
  categories: string[]
  userId: string | null
}

export default function HomeContent({
  books,
  announcements,
  categories,
  userId,
}: Props) {
  const { locale, t, profile, showAlert, showConfirm } = useApp()
  const router = useRouter()
  const isAdmin = profile?.role === 'admin'

  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [hideInactive, setHideInactive] = useState<boolean>(false)
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false)

  // Announcement Popup Modal state
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [activePopupAnnouncement, setActivePopupAnnouncement] = useState<AnnouncementItem | null>(null)
  const [externalEditingAnnouncement, setExternalEditingAnnouncement] = useState<AnnouncementItem | null>(null)

  // Default preset borrowing rules announcement
  const defaultBorrowingRulesAnnouncement: AnnouncementItem = useMemo(() => ({
    id: 'default-2',
    title: 'กฎระเบียบและแนวทางปฏิบัติในการยืม-คืนหนังสือ',
    title_en: 'Library Borrowing & Returning Rules',
    body: '1. สมาชิกสามารถยืมหนังสือได้ครั้งละ 1 เล่ม นานสูงสุด 14 วัน\n2. กรุณาส่งคืนหนังสือให้ตรงตามเวลาที่กำหนด เพื่อเปิดโอกาสให้เพื่อนสมาชิกท่านอื่น\n3. ต้องแนบภาพถ่ายหน้าปกหนังสือ ณ จุดคืนเพื่อเป็นหลักฐานความถูกต้อง\n4. โปรดดูแลรักษาหนังสือให้อยู่ในสภาพสมบูรณ์ ไม่ฉีกขาด ขีดเขียน หรือทำเปรอะเปื้อน\n5. หากทำหนังสือชำรุดหรือสูญหาย กรุณาติดต่อแจ้งผู้ดูแลระบบทันที\n\n[popup: true]',
    body_en: '1. Members can borrow 1 book at a time for up to 14 days.\n2. Please return books on time to allow other members access.\n3. Photo proof at the return shelf is required upon return.\n4. Treat books with respect—do not mark, highlight, or damage pages.\n5. Contact admin immediately if a book is lost or damaged.\n\n[popup: true]',
    type: 'warning',
    is_popup: true,
    created_at: new Date().toISOString(),
  }), [])

  // Find explicit popup announcement from carousel or fallback to default borrowing rules
  const primaryPopupAnnouncement = useMemo(() => {
    if (announcements && announcements.length > 0) {
      const explicit = announcements.find((a) => extractAnnouncementPopup(a) && a.is_active !== false)
      if (explicit) return explicit

      const default2 = announcements.find((a) => a.id === 'default-2')
      if (default2) return default2

      return announcements[0]
    }
    return defaultBorrowingRulesAnnouncement
  }, [announcements, defaultBorrowingRulesAnnouncement])

  // Auto-display announcement popup modal when user arrives on home page for the first time
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if dismissed for today
    const dismissedUntil = localStorage.getItem('mfu_lib_rules_popup_dismissed_until')
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      return
    }

    // Check if seen in current session
    const sessionSeen = sessionStorage.getItem('mfu_lib_rules_popup_seen')
    if (sessionSeen) {
      return
    }

    // Soft delay for silky smooth initial rendering
    const timer = setTimeout(() => {
      setActivePopupAnnouncement(primaryPopupAnnouncement)
      setIsPopupOpen(true)
    }, 600)

    return () => clearTimeout(timer)
  }, [primaryPopupAnnouncement])

  // Featured / Recommended list (strictly is_featured books only)
  const recommendedBooks = useMemo(() => {
    return books.filter((b) => b.is_featured && b.is_active !== false)
  }, [books])

  // Filtered books for Category section
  const filteredCategoryBooks = useMemo(() => {
    return books.filter((b) => {
      const matchCat =
        selectedCategory === 'all' || b.category === selectedCategory
      const matchActive = !hideInactive || b.is_active !== false
      const matchAvailable = !onlyAvailable || b.available_copies > 0
      return matchCat && matchActive && matchAvailable
    })
  }, [books, selectedCategory, hideInactive, onlyAvailable])

  // Admin action: Toggle popup status for an announcement
  async function handleTogglePopup(ann: AnnouncementItem, currentIsPopup: boolean) {
    if (ann.id.startsWith('default-')) {
      showAlert({
        type: 'info',
        title: locale === 'th' ? 'ตัวอย่างของระบบ' : 'Preset System Item',
        message: locale === 'th'
          ? 'ประกาศตัวอย่างนี้เปิดเป็น Popup อยู่แล้ว หากต้องการกำหนดเอง สามารถเพิ่มประกาศใหม่และเปิดสถานะ Popup ได้'
          : 'This preset announcement is enabled as popup. You can create a new announcement and set it as popup.',
      })
      return
    }

    try {
      let cleaned = cleanAnnouncementBody(ann.body || '')
      if (!currentIsPopup) {
        cleaned += '\n\n[popup: true]'
      }
      const img = extractAnnouncementImage(ann, 0)
      if (img && !ann.image_url) cleaned += `\n\n[image: ${img}]`
      const exp = extractAnnouncementExpiry(ann)
      if (exp && !ann.expires_at) cleaned += `\n\n[expires: ${exp}]`

      const res = await fetch(`/api/admin/announcements/${ann.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: cleaned }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      showAlert({
        type: 'success',
        title: locale === 'th' ? 'สำเร็จ' : 'Success',
        message: !currentIsPopup ? t('popupEnabled') : t('popupDisabled'),
      })
      router.refresh()
    } catch (err: any) {
      showAlert({
        type: 'error',
        title: locale === 'th' ? 'เกิดข้อผิดพลาด' : 'Error',
        message: err.message || 'Error updating popup state',
      })
    }
  }

  // Admin action: Delete announcement from popup modal
  function handleDeleteFromPopup(ann: AnnouncementItem) {
    if (ann.id.startsWith('default-')) {
      showAlert({
        type: 'info',
        title: locale === 'th' ? 'ตัวอย่างของระบบ' : 'Preset System Item',
        message: locale === 'th'
          ? 'ประกาศเริ่มต้นนี้เป็นตัวอย่างของระบบ ไม่สามารถลบได้'
          : 'This preset announcement cannot be deleted.',
      })
      return
    }

    showConfirm({
      type: 'warning',
      title: locale === 'th' ? 'ยืนยันการลบประกาศ' : 'Confirm Delete Announcement',
      message: `${locale === 'th' ? 'คุณต้องการลบประกาศ' : 'Are you sure you want to delete'} "${ann.title}"?`,
      confirmText: locale === 'th' ? 'ยืนยันลบ' : 'Delete',
      cancelText: locale === 'th' ? 'ยกเลิก' : 'Cancel',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/announcements/${ann.id}`, { method: 'DELETE' })
          const data = await res.json()
          if (data.error) throw new Error(data.error)

          setIsPopupOpen(false)
          showAlert({
            type: 'success',
            title: locale === 'th' ? 'ลบสำเร็จ' : 'Deleted',
            message: locale === 'th' ? 'ลบประกาศออกจากระบบเรียบร้อยแล้ว' : 'Announcement deleted successfully',
          })
          router.refresh()
        } catch (err: any) {
          showAlert({
            type: 'error',
            title: locale === 'th' ? 'ไม่สามารถลบได้' : 'Error',
            message: err.message || 'Error deleting announcement',
          })
        }
      },
    })
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 sm:p-8 lg:p-10 space-y-12 animate-fade-in">
      
      {/* ======================================================== */}
      {/* 1. TOP HERO / ANNOUNCEMENT SLIDER (Above Recommended)    */}
      {/* ======================================================== */}
      <AnnouncementCarousel
        announcements={announcements}
        onOpenPopupModal={(ann) => {
          setActivePopupAnnouncement(ann)
          setIsPopupOpen(true)
        }}
        externalEditingItem={externalEditingAnnouncement}
        onCloseExternalEditor={() => setExternalEditingAnnouncement(null)}
      />

      {/* ======================================================== */}
      {/* 2. RECOMMENDED BOOKS SHELF                               */}
      {/* ======================================================== */}
      {recommendedBooks.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
                <Sparkles size={20} className="stroke-[2.5]" />
                <span>{locale === 'th' ? 'หนังสือแนะนำ' : 'Recommended Books'}</span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {locale === 'th'
                  ? 'หนังสือยอดนิยมและคัดสรรพิเศษสำหรับสมาชิก'
                  : 'Curated and popular books for members'}
              </p>
            </div>
            <Link
              href="/books"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors"
            >
              <span>{locale === 'th' ? 'ดูทั้งหมด' : 'See All'}</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* 4-Card Showcase Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-7 lg:gap-8">
            {recommendedBooks.map((book, idx) => (
              <BookCard key={book.id} book={book} animDelay={idx} />
            ))}
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 3. CATEGORIES & CATALOG EXPLORER                         */}
      {/* ======================================================== */}
      <section className="space-y-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
              <Layers size={20} className="stroke-[2.5]" />
              <span>{locale === 'th' ? 'หมวดหมู่หนังสือ' : 'Categories'}</span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {filteredCategoryBooks.length} {locale === 'th' ? 'เล่มในหมวดนี้' : 'books in this category'}
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {books.some((b) => b.is_active === false) && (
              <button
                type="button"
                onClick={() => setHideInactive(!hideInactive)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  hideInactive
                    ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                }`}
                title={locale === 'th' ? 'ซ่อนหนังสือที่ปิดใช้งาน' : 'Hide inactive books'}
              >
                <EyeOff size={13} />
                <span>{locale === 'th' ? 'ซ่อนที่ปิดใช้งาน' : 'Hide Inactive'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setOnlyAvailable(!onlyAvailable)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                onlyAvailable
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${onlyAvailable ? 'bg-white' : 'bg-emerald-500'}`} />
              <span>{locale === 'th' ? 'พร้อมให้ยืม' : 'Available'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`}
            >
              {locale === 'th' ? 'ทั้งหมด' : 'All'}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Books Grid */}
        {filteredCategoryBooks.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800 text-neutral-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              {locale === 'th'
                ? 'ไม่พบหนังสือในหมวดหมู่นี้'
                : 'No books found in this category'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-7 lg:gap-8">
            {filteredCategoryBooks.map((book, idx) => (
              <BookCard key={book.id} book={book} animDelay={idx} />
            ))}
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 4. ANNOUNCEMENT & BORROWING RULES POPUP MODAL            */}
      {/* ======================================================== */}
      <AnnouncementPopupModal
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        announcement={activePopupAnnouncement || primaryPopupAnnouncement}
        isAdmin={isAdmin}
        onEdit={(ann) => {
          setIsPopupOpen(false)
          setExternalEditingAnnouncement(ann)
        }}
        onTogglePopup={handleTogglePopup}
        onDelete={handleDeleteFromPopup}
      />

      {/* Floating Borrowing Rules Quick Access Button */}
      <aside aria-label={locale === 'th' ? 'กฎการยืม-คืนหนังสือ' : 'Borrowing Rules'}>
        <button
          type="button"
          onClick={() => {
            setActivePopupAnnouncement(primaryPopupAnnouncement)
            setIsPopupOpen(true)
          }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-neutral-900/90 hover:bg-black dark:bg-white/90 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-xl backdrop-blur-md border border-white/20 dark:border-black/20 hover:scale-105 active:scale-95 transition-all group cursor-pointer"
          title={locale === 'th' ? 'ดูกฎระเบียบการยืม-คืนหนังสือ' : 'View Borrowing Rules'}
        >
          <ScrollText size={15} className="group-hover:rotate-6 transition-transform text-amber-400 dark:text-amber-600" />
          <span>{locale === 'th' ? 'กฎการยืม-คืน' : 'Borrowing Rules'}</span>
        </button>
      </aside>

    </div>
  )
}