'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Calendar,
  Pause,
  Play,
  Sparkles,
  Info,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  X,
  Plus,
  Edit3,
  Trash2,
  Clock,
  Image as ImageIcon,
  Check,
  Eye,
  EyeOff
} from 'lucide-react'
import { format } from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import { useApp } from '@/lib/app-context'

export interface AnnouncementItem {
  id: string
  title: string
  title_en?: string | null
  body: string
  body_en?: string | null
  type?: 'info' | 'warning' | 'success'
  image_url?: string | null
  bg_gradient?: string | null
  is_active?: boolean
  expires_at?: string | null
  created_at: string
}

interface Props {
  announcements: AnnouncementItem[]
  autoPlayInterval?: number
  onOpenRules?: () => void
}

// Fallback high-aesthetic library & book photography for sample slides
const DEFAULT_PRESET_IMAGES = [
  'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1600&q=80', // Aesthetic library hall
  'https://images.unsplash.com/photo-1507842229446-51f78713d334?auto=format&fit=crop&w=1600&q=80', // Warm bookshelves & wooden reading desk
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1600&q=80', // Minimal books stacked
]

// Helper to extract image URL from markdown or custom tag if embedded in body
export function extractAnnouncementImage(ann: AnnouncementItem, index: number): string | null {
  if (ann.image_url) return ann.image_url

  // Check markdown syntax: ![...](url) or [image: url]
  const mdMatch = ann.body.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/)
  if (mdMatch) return mdMatch[1]

  const customMatch = ann.body.match(/\[(?:image|bg|cover):\s*(https?:\/\/[^\s\]]+)\]/i)
  if (customMatch) return customMatch[1]

  // If it's a default/sample announcement without an image, use curated aesthetic photo
  if (ann.id.startsWith('default-')) {
    return DEFAULT_PRESET_IMAGES[index % DEFAULT_PRESET_IMAGES.length]
  }

  return null
}

// Helper to extract expiration / scheduled end date
export function extractAnnouncementExpiry(ann: AnnouncementItem): string | null {
  if (ann.expires_at) return ann.expires_at
  const match = ann.body.match(/\[(?:expires|until|end):\s*([^\]]+)\]/i)
  return match ? match[1].trim() : null
}

// Clean body text by stripping image and expiration tags
export function cleanAnnouncementBody(text: string): string {
  if (!text) return ''
  return text
    .replace(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/g, '')
    .replace(/\[(?:image|bg|cover):\s*(https?:\/\/[^\s\]]+)\]/gi, '')
    .replace(/\[(?:expires|until|end):\s*([^\]]+)\]/gi, '')
    .trim()
}

export default function AnnouncementCarousel({
  announcements,
  autoPlayInterval = 6000,
  onOpenRules,
}: Props) {
  const { locale, t, profile, showAlert, showConfirm } = useApp()
  const router = useRouter()
  const isAdmin = profile?.role === 'admin'

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [modalItem, setModalItem] = useState<AnnouncementItem | null>(null)

  // Admin CRUD modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AnnouncementItem | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formTitleEn, setFormTitleEn] = useState('')
  const [formBody, setFormBody] = useState('')
  const [formBodyEn, setFormBodyEn] = useState('')
  const [formType, setFormType] = useState<'info' | 'warning' | 'success'>('info')
  const [formImageUrl, setFormImageUrl] = useState('')
  const [formExpiresAt, setFormExpiresAt] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock background body scroll when any announcement modal is open
  useEffect(() => {
    if (!isEditorOpen && !modalItem) return

    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEditorOpen(false)
        setModalItem(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isEditorOpen, modalItem])

  // Touch swipe support
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  // Filter slides (non-admins don't see expired slides)
  const rawSlides = announcements && announcements.length > 0 ? announcements : [
    {
      id: 'default-1',
      title: 'ยินดีต้อนรับสู่ห้องสมุดชมรมมุสลิม มหาวิทยาลัยแม่ฟ้าหลวง',
      title_en: 'Welcome to MFU Muslim Club Library',
      body: 'ระบบยืม-คืนหนังสือดิจิทัลสำหรับสมาชิกชมรมมุสลิม มฟล. ค้นหาหนังสือที่ต้องการและทำรายการได้ตลอด 24 ชั่วโมง',
      body_en: 'Digital book borrowing system for MFU Muslim Club members. Search and borrow your favorite books anytime.',
      type: 'info' as const,
      created_at: new Date().toISOString(),
    },
    {
      id: 'default-2',
      title: 'กติกาการยืมหนังสือและการส่งคืน',
      title_en: 'Borrowing Rules & Guidelines',
      body: 'สมาชิกสามารถยืมหนังสือได้ครั้งละ 1 เล่ม นาน 14 วัน และต้องแนบภาพถ่ายคู่กับหนังสือเมื่อทำการส่งคืนเพื่อความโปร่งใส',
      body_en: 'Members can borrow 1 book at a time for 14 days. Photo proof is required upon return.',
      type: 'success' as const,
      created_at: new Date().toISOString(),
    },
  ]

  const slides = rawSlides.filter((s) => {
    const exp = extractAnnouncementExpiry(s)
    if (!exp) return true
    if (isAdmin) return true
    try {
      return new Date(exp).getTime() > Date.now()
    } catch {
      return true
    }
  })

  const total = slides.length

  function openCreateModal() {
    setEditingItem(null)
    setFormTitle('')
    setFormTitleEn('')
    setFormBody('')
    setFormBodyEn('')
    setFormType('info')
    setFormImageUrl('')
    setFormExpiresAt('')
    setFormIsActive(true)
    setIsEditorOpen(true)
  }

  function openEditModal(ann: AnnouncementItem) {
    setEditingItem(ann)
    setFormTitle(ann.title || '')
    setFormTitleEn(ann.title_en || '')
    setFormBody(cleanAnnouncementBody(ann.body || ''))
    setFormBodyEn(cleanAnnouncementBody(ann.body_en || ''))
    setFormType(ann.type || 'info')
    setFormImageUrl(extractAnnouncementImage(ann, 0) || '')
    setFormExpiresAt(extractAnnouncementExpiry(ann) || '')
    setFormIsActive(ann.is_active !== false)
    setIsEditorOpen(true)
  }

  async function handleSaveAnnouncement(e: React.FormEvent) {
    e.preventDefault()
    if (!formTitle.trim() || !formBody.trim()) {
      showAlert({ type: 'warning', title: 'ข้อมูลไม่ครบ', message: 'กรุณาระบุหัวข้อและเนื้อหาประกาศ' })
      return
    }

    setSaving(true)
    let finalBody = formBody.trim()
    if (formImageUrl.trim()) {
      finalBody += `\n\n[image: ${formImageUrl.trim()}]`
    }
    if (formExpiresAt.trim()) {
      finalBody += `\n\n[expires: ${formExpiresAt.trim()}]`
    }

    const payload: any = {
      title: formTitle.trim(),
      title_en: formTitleEn.trim() || null,
      body: finalBody,
      body_en: formBodyEn.trim() || null,
      type: formType,
      is_active: formIsActive,
    }

    try {
      if (editingItem && !editingItem.id.startsWith('default-')) {
        const res = await fetch(`/api/admin/announcements/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
      } else {
        const res = await fetch('/api/admin/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
      }

      setIsEditorOpen(false)
      showAlert({ type: 'success', title: 'สำเร็จ', message: 'บันทึกประกาศเรียบร้อยแล้ว' })
      router.refresh()
    } catch (err: any) {
      showAlert({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message || 'บันทึกไม่สำเร็จ' })
    } finally {
      setSaving(false)
    }
  }

  function handleDeleteAnnouncement(ann: AnnouncementItem) {
    if (ann.id.startsWith('default-')) {
      showAlert({ type: 'info', title: 'ตัวอย่างระบบ', message: 'ประกาศนี้เป็นตัวอย่างของระบบเริ่มต้น ไม่สามารถลบได้' })
      return
    }

    showConfirm({
      type: 'warning',
      title: 'ยืนยันการลบประกาศ',
      message: `คุณต้องการลบประกาศ "${ann.title}" ใช่หรือไม่?`,
      confirmText: 'ยืนยันลบ',
      cancelText: 'ยกเลิก',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/announcements/${ann.id}`, { method: 'DELETE' })
          const data = await res.json()
          if (data.error) throw new Error(data.error)
          showAlert({ type: 'success', title: 'ลบประกาศแล้ว', message: 'ประกาศถูกลบออกจากระบบเรียบร้อย' })
          router.refresh()
        } catch (err: any) {
          showAlert({ type: 'error', title: 'ไม่สามารถลบได้', message: err.message || 'เกิดข้อผิดพลาด' })
        }
      },
    })
  }

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total)
    setProgress(0)
  }, [total])

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total)
    setProgress(0)
  }, [total])

  const goToSlide = (idx: number) => {
    setCurrentIndex(idx)
    setProgress(0)
  }

  // Progress Bar & Autoplay Loop
  useEffect(() => {
    if (total <= 1 || isPaused) return

    const stepMs = 50
    const progressStep = (stepMs / autoPlayInterval) * 100

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextSlide()
          return 0
        }
        return prev + progressStep
      })
    }, stepMs)

    return () => clearInterval(interval)
  }, [total, isPaused, autoPlayInterval, nextSlide])

  // Touch Handlers for Mobile Swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const distance = touchStartX.current - touchEndX.current
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) nextSlide()
    if (isRightSwipe) prevSlide()

    touchStartX.current = null
    touchEndX.current = null
  }

  if (total === 0) return null

  const current = slides[currentIndex]
  const currentImage = extractAnnouncementImage(current, currentIndex)
  const displayTitle = locale === 'th' ? current.title : (current.title_en || current.title)
  const rawBody = locale === 'th' ? current.body : (current.body_en || current.body)
  const displayBody = cleanAnnouncementBody(rawBody)

  // Badge icon by type
  const getTypeBadge = (type?: string) => {
    switch (type) {
      case 'warning':
        return {
          icon: <AlertTriangle size={11} className="stroke-[2.5]" />,
          text: locale === 'th' ? 'แจ้งเตือน' : 'Notice',
          color: 'from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-400/30'
        }
      case 'success':
        return {
          icon: <CheckCircle2 size={11} className="stroke-[2.5]" />,
          text: locale === 'th' ? 'แนะนำ' : 'Featured',
          color: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-400/30'
        }
      default:
        return {
          icon: <Megaphone size={11} className="stroke-[2.5]" />,
          text: locale === 'th' ? 'ข่าวสาร & ประกาศ' : 'News & Update',
          color: 'from-white/15 to-white/5 text-white border-white/20'
        }
    }
  }

  const badgeInfo = getTypeBadge(current.type)

  return (
    <>
      <section
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="group relative w-full overflow-hidden rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm transition-all duration-300 select-none min-h-[220px] sm:min-h-[260px] md:min-h-[290px] flex flex-col justify-between"
      >
        {/* Background Layer: High-res Photo or Curated Atmospheric Gradient */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-neutral-900">
          {currentImage ? (
            <>
              {/* Photo with Ken Burns subtle scale animation */}
              <img
                key={currentImage}
                src={currentImage}
                alt={displayTitle}
                className="w-full h-full object-cover object-center filter brightness-[0.92] transition-transform duration-1000 ease-out group-hover:scale-105"
              />
              {/* Multi-stop Ambient Gradient Overlay for 100% Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-transparent max-w-3xl" />
            </>
          ) : (
            /* Modern Minimalist Atmospheric Mesh Backdrop */
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-[#0d0d10]">
              <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            </div>
          )}
        </div>

        {/* Content Container (Layer 1) */}
        <div className="relative z-10 p-6 sm:p-8 md:p-10 flex flex-col justify-between flex-1">
          {/* Top Bar: Tag & Meta date & Pause Status */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase backdrop-blur-md bg-gradient-to-r border shadow-xs ${badgeInfo.color}`}
              >
                {badgeInfo.icon}
                <span>{badgeInfo.text}</span>
              </span>

              {current.created_at && (
                <span className="inline-flex items-center gap-1 text-[11px] text-white/70 font-medium tracking-tight">
                  <Calendar size={11} className="opacity-70" />
                  {format(new Date(current.created_at), 'dd MMM yyyy', {
                    locale: locale === 'th' ? th : enUS,
                  })}
                </span>
              )}

              {extractAnnouncementExpiry(current) && (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 font-medium tracking-tight bg-amber-500/20 backdrop-blur-md px-2 py-0.5 rounded-full border border-amber-400/30">
                  <Clock size={10} />
                  <span>ถึง {format(new Date(extractAnnouncementExpiry(current)!), 'dd MMM yy HH:mm', { locale: locale === 'th' ? th : enUS })}</span>
                </span>
              )}

              {onOpenRules && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenRules()
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium tracking-tight backdrop-blur-md bg-white/15 hover:bg-white/25 active:scale-95 text-white border border-white/20 shadow-xs transition-all cursor-pointer"
                  title={locale === 'th' ? 'ดูกฎการยืม-คืน & ประกาศ' : 'View Borrowing Rules & Announcements'}
                >
                  <Sparkles size={11} className="text-amber-300" />
                  <span>{locale === 'th' ? 'กฎการยืม-คืน & ประกาศ' : 'Rules & Announcements'}</span>
                </button>
              )}
            </div>

            {/* Admin In-Place Actions & Pause Micro-Indicator */}
            <div className="flex items-center gap-2">
              {isAdmin && (
                <div className="flex items-center gap-1.5 p-1 bg-black/55 backdrop-blur-md rounded-2xl border border-white/20 shadow-md">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      openCreateModal()
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white text-neutral-900 hover:bg-neutral-100 text-[11px] font-bold shadow-xs transition-all active:scale-95"
                    title="สร้างประกาศใหม่"
                  >
                    <Plus size={12} className="stroke-[3]" />
                    <span className="hidden sm:inline">เพิ่มประกาศ</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditModal(current)
                    }}
                    className="p-1.5 rounded-xl hover:bg-white/20 text-white/90 hover:text-white text-xs transition-colors"
                    title="แก้ไขประกาศนี้"
                  >
                    <Edit3 size={13} />
                  </button>

                  {!current.id.startsWith('default-') && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteAnnouncement(current)
                      }}
                      className="p-1.5 rounded-xl hover:bg-red-500/30 text-white/80 hover:text-red-300 text-xs transition-colors"
                      title="ลบประกาศนี้"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )}

              {/* Hover Pause Micro-Indicator */}
              {isPaused && total > 1 && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-white/60 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 animate-fade-in">
                  <Pause size={9} />
                  <span>{locale === 'th' ? 'พักอัตโนมัติ' : 'Paused'}</span>
                </span>
              )}
            </div>
          </div>

          {/* Center Main Text */}
          <div className="my-auto py-4 max-w-2xl space-y-2.5">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white leading-snug drop-shadow-sm line-clamp-2">
              {displayTitle}
            </h2>

            <p className="text-xs sm:text-sm text-neutral-200/90 leading-relaxed line-clamp-2 sm:line-clamp-3 font-normal drop-shadow-xs">
              {displayBody}
            </p>

            {/* Read full body trigger or rules trigger */}
            <div className="flex items-center gap-3 pt-1 flex-wrap">
              {displayBody.length > 90 && (
                <button
                  type="button"
                  onClick={() => setModalItem(current)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-white/90 hover:text-white underline underline-offset-4 decoration-white/40 hover:decoration-white transition-all"
                >
                  <span>{locale === 'th' ? 'อ่านรายละเอียดทั้งหมด' : 'Read full announcement'}</span>
                  <ChevronRight size={13} />
                </button>
              )}

              {onOpenRules && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenRules()
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white/95 bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-xs"
                >
                  <span>📋 {locale === 'th' ? 'กฎระเบียบการยืม-คืน' : 'Library Rules'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Bar: Interactive Controls & Progress Indicators */}
          <div className="flex items-center justify-between gap-4 pt-2">
            {/* Slide Pill Navigation with Progress */}
            {total > 1 ? (
              <div className="flex items-center gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goToSlide(i)}
                    className="relative group/pill py-2 cursor-pointer focus:outline-none"
                    aria-label={`Go to slide ${i + 1}`}
                  >
                    <div
                      className={`h-1.5 rounded-full overflow-hidden transition-all duration-300 ${
                        i === currentIndex
                          ? 'w-8 sm:w-10 bg-white/30'
                          : 'w-2 sm:w-3 bg-white/20 group-hover/pill:bg-white/40'
                      }`}
                    >
                      {/* Active countdown fill bar */}
                      {i === currentIndex && (
                        <div
                          className="h-full bg-white rounded-full transition-all ease-linear"
                          style={{
                            width: `${progress}%`,
                            transitionDuration: isPaused ? '0ms' : '50ms',
                          }}
                        />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : <div />}

            {/* Previous / Next Arrow Controls */}
            {total > 1 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={prevSlide}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center border border-white/15 transition-all shadow-xs"
                  aria-label="Previous slide"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={nextSlide}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center border border-white/15 transition-all shadow-xs"
                  aria-label="Next slide"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Full Detail Modal Dialog (Portal to document.body) */}
      {mounted && modalItem && createPortal(
        <div
          className="fixed inset-0 w-screen h-[100dvh] z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalItem(null)
          }}
        >
          <div className="w-[calc(100vw-24px)] sm:w-[min(560px,calc(100vw-32px))] max-h-[calc(100dvh-24px)] sm:max-h-[calc(100dvh-32px)] bg-white dark:bg-[#161619] rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden animate-scale-in">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0 pr-3">
                <span className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 shrink-0">
                  <Megaphone size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-neutral-400">
                    {modalItem.created_at
                      ? format(new Date(modalItem.created_at), 'dd MMMM yyyy', {
                          locale: locale === 'th' ? th : enUS,
                        })
                      : ''}
                  </p>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                    {modalItem.type || 'Announcement'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalItem(null)}
                className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-6 space-y-4">
              <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white leading-snug">
                {locale === 'th' ? modalItem.title : (modalItem.title_en || modalItem.title)}
              </h3>

              <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                {cleanAnnouncementBody(
                  locale === 'th' ? modalItem.body : (modalItem.body_en || modalItem.body)
                )}
              </p>
            </div>

            {/* Fixed Footer */}
            <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 shrink-0 flex justify-end bg-neutral-50/70 dark:bg-neutral-900/70">
              <button
                type="button"
                onClick={() => setModalItem(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 hover:opacity-90 transition-opacity"
              >
                {locale === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Admin Create / Edit Modal Dialog */}
      {mounted && isEditorOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 w-screen h-[100dvh] z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditorOpen(false)
          }}
        >
          <div className="relative w-[calc(100vw-24px)] sm:w-[min(600px,calc(100vw-32px))] max-h-[calc(100dvh-24px)] sm:max-h-[calc(100dvh-32px)] bg-white dark:bg-[#161619] rounded-2xl sm:rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden animate-scale-in">
            <form onSubmit={handleSaveAnnouncement} className="flex flex-col h-full max-h-[inherit] overflow-hidden">
              {/* Fixed Header */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0 pr-3">
                  <span className="p-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white shrink-0">
                    {editingItem ? <Edit3 size={18} /> : <Plus size={18} />}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white truncate">
                      {editingItem ? 'แก้ไขประกาศ Carousel' : 'เพิ่มประกาศใหม่บน Carousel'}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      อัปเดตข้อมูลข่าวสาร สื่อ และการตั้งเวลาแสดงผลได้ทันที
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-6 space-y-4">
                {/* Title TH */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    หัวข้อประกาศ (ภาษาไทย) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="เช่น ยินดีต้อนรับสู่ห้องสมุดชมรมมุสลิม..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                  />
                </div>

                {/* Title EN */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    หัวข้อประกาศ (English - ไม่บังคับ)
                  </label>
                  <input
                    type="text"
                    value={formTitleEn}
                    onChange={(e) => setFormTitleEn(e.target.value)}
                    placeholder="e.g. Welcome to MFU Muslim Library..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                  />
                </div>

                {/* Grid: Type & Expiration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Type */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      ประเภทประกาศ
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                    >
                      <option value="info">📢 ข่าวสารทั่วไป (Info)</option>
                      <option value="warning">⚠️ แจ้งเตือนสำคัญ (Notice / Warning)</option>
                      <option value="success">✨ แนะนำ / กิจกรรมพิเศษ (Featured)</option>
                    </select>
                  </div>

                  {/* Scheduled Expiry Date/Time */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                      <Clock size={12} className="text-amber-500" />
                      <span>โพสต์ถึงวันเวลาไหน (ตั้งเวลาสิ้นสุด)</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formExpiresAt}
                      onChange={(e) => setFormExpiresAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                    />
                  </div>
                </div>

                {/* Background Image URL & Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon size={13} />
                      <span>ภาพพื้นหลัง Carousel (URL รูปภาพ)</span>
                    </span>
                    {formImageUrl && (
                      <button
                        type="button"
                        onClick={() => setFormImageUrl('')}
                        className="text-[10px] text-neutral-400 hover:text-red-500 underline"
                      >
                        ลบรูป
                      </button>
                    )}
                  </label>

                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                    />
                  </div>

                  {/* Preset Image Options */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-neutral-400 mr-1">รูปตัวอย่าง:</span>
                    <button
                      type="button"
                      onClick={() => setFormImageUrl(DEFAULT_PRESET_IMAGES[0])}
                      className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    >
                      🏛️ หอสมุด
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormImageUrl(DEFAULT_PRESET_IMAGES[1])}
                      className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    >
                      📚 ชั้นหนังสือ
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormImageUrl(DEFAULT_PRESET_IMAGES[2])}
                      className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    >
                      ✨ มินิมอล
                    </button>
                  </div>

                  {/* Live Preview Thumbnail */}
                  {formImageUrl && (
                    <div className="relative h-24 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 shadow-inner mt-2">
                      <img src={formImageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-2.5">
                        <span className="text-[10px] text-white/90 font-medium truncate">ตัวอย่างภาพพื้นหลัง</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Body TH */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    เนื้อหาประกาศ (ภาษาไทย) *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    placeholder="เขียนข้อความประชาสัมพันธ์ที่ต้องการ..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                  />
                </div>

                {/* Active Toggle Switch */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-xs font-semibold text-neutral-900 dark:text-white">สถานะการแสดงผล</p>
                    <p className="text-[11px] text-neutral-400">เปิดให้สมาชิกทุกคนมองเห็นบนหน้าแรก</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black dark:peer-checked:bg-white dark:peer-checked:after:bg-black"></div>
                  </label>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 shrink-0 flex items-center justify-end gap-2.5 bg-neutral-50/70 dark:bg-neutral-900/70">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-black text-white dark:bg-white dark:text-black hover:opacity-90 active:scale-98 transition-all disabled:opacity-50 shadow-sm"
                >
                  {saving ? 'กำลังบันทึก...' : editingItem ? 'บันทึกการแก้ไข' : 'สร้างประกาศ'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
