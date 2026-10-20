'use client'

import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Megaphone,
  X,
  Sparkles,
  Check,
  Calendar,
  Clock,
  Image as ImageIcon,
  Users,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Monitor,
  Copy,
  Search,
  Filter,
  Layers,
  Bell,
  ArrowUpRight,
  SlidersHorizontal,
  Upload,
  Loader2,
  Link2,
  Globe,
  BookOpen,
  Bookmark,
  MessageSquare,
  Home,
  RotateCcw,
  Tag,
} from 'lucide-react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

const CTA_PRESETS = [
  {
    id: 'books',
    labelTh: 'ค้นหาหนังสือ',
    labelEn: 'Browse Books',
    defaultTextTh: 'ดูรายการหนังสือ',
    defaultTextEn: 'View Books',
    url: '/books',
  },
  {
    id: 'my-borrows',
    labelTh: 'ประวัติยืม-คืน',
    labelEn: 'My Borrows',
    defaultTextTh: 'ตรวจสถานะการยืม',
    defaultTextEn: 'Check Borrow Status',
    url: '/my-borrows',
  },
  {
    id: 'feedback',
    labelTh: 'ข้อเสนอแนะ',
    labelEn: 'Feedback',
    defaultTextTh: 'ส่งข้อเสนอแนะ',
    defaultTextEn: 'Send Feedback',
    url: '/feedback',
  },
  {
    id: 'home',
    labelTh: 'หน้าหลัก',
    labelEn: 'Home',
    defaultTextTh: 'เข้าสู่หน้าหลัก',
    defaultTextEn: 'Go to Home',
    url: '/',
  },
  {
    id: 'external',
    labelTh: 'เว็บภายนอก',
    labelEn: 'External URL',
    defaultTextTh: 'ไปยังเว็บไซต์',
    defaultTextEn: 'Visit Website',
    url: 'https://',
  },
]
import { useApp } from '@/lib/app-context'
import {
  cleanAnnouncementBody,
  extractAnnouncementImage,
  extractAnnouncementExpiry,
  extractAnnouncementPopup,
  extractAnnouncementTarget,
  extractAnnouncementCta,
  type AnnouncementTarget,
} from './AnnouncementCarousel'

export interface Announcement {
  id: string
  title: string
  title_en?: string | null
  body: string
  body_en?: string | null
  type: 'info' | 'warning' | 'success'
  is_active?: boolean
  created_at: string
}

const PRESET_IMAGES = [
  {
    labelTh: 'หอสมุด มฟล.',
    labelEn: 'MFU Library',
    url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80',
  },
  {
    labelTh: 'ชั้นหนังสือคลาสสิก',
    labelEn: 'Classic Bookshelf',
    url: 'https://images.unsplash.com/photo-1507842229446-51f78713d334?auto=format&fit=crop&w=1200&q=80',
  },
  {
    labelTh: 'โมเดิร์น คลีน',
    labelEn: 'Modern Clean',
    url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80',
  },
  {
    labelTh: 'บรรยากาศการอ่าน',
    labelEn: 'Reading Ambience',
    url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1200&q=80',
  },
]

const TARGET_OPTIONS: { id: AnnouncementTarget; labelTh: string; labelEn: string; icon: string; descTh: string; descEn: string }[] = [
  {
    id: 'all',
    labelTh: 'สมาชิกทุกคน',
    labelEn: 'All Students',
    icon: '',
    descTh: 'แสดงให้ทุกคนที่เข้าสู่ระบบและผู้เยี่ยมชม',
    descEn: 'Display to all visitors and logged-in users',
  },
  {
    id: 'overdue',
    labelTh: 'ผู้มีหนังสือค้างส่ง',
    labelEn: 'Overdue Borrowers',
    icon: '',
    descTh: 'เจาะจงเฉพาะผู้ที่เกินกำหนดส่งหนังสือ',
    descEn: 'Targeted to users with overdue books',
  },
  {
    id: 'active_borrowers',
    labelTh: 'ผู้กำลังยืมหนังสือ',
    labelEn: 'Active Borrowers',
    icon: '',
    descTh: 'สมาชิกที่มียอดหนังสือค้างอยู่ในมือปัจจุบัน',
    descEn: 'Members who currently hold borrowed books',
  },
  {
    id: 'new_members',
    labelTh: 'สมาชิกใหม่',
    labelEn: 'New Members',
    icon: '',
    descTh: 'ผู้ใช้งานใหม่หรือยังไม่เคยมีประวัติการยืม',
    descEn: 'New users or those with no borrow history',
  },
]

export default function AdminAnnouncementsContent({
  announcements: initialAnnouncements,
}: {
  announcements: Announcement[]
}) {
  const router = useRouter()
  const { locale, showAlert, showConfirm, t } = useApp()

  // Prevent SSR Hydration mismatches for dates/time
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Local state for instant optimistic updates
  const [items, setItems] = useState<Announcement[]>(initialAnnouncements)
  useEffect(() => {
    setItems(initialAnnouncements)
  }, [initialAnnouncements])

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [channelFilter, setChannelFilter] = useState<'all' | 'carousel' | 'popup'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [targetFilter, setTargetFilter] = useState<'all' | AnnouncementTarget>('all')

  // Split-Screen Modal State
  const [showModal, setShowModal] = useState(false)
  const [mobileEditorTab, setMobileEditorTab] = useState<'form' | 'preview'>('form')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    title_en: '',
    body: '',
    body_en: '',
    type: 'info' as 'info' | 'warning' | 'success',
    imageUrl: '',
    target: 'all' as AnnouncementTarget,
    isPopup: true,
    isCarousel: true,
    expiresAt: '',
    isActive: true,
    ctaText: 'รับทราบและเข้าใจ',
    ctaUrl: '',
  })

  // Live Preview Settings
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop')
  const [previewViewMode, setPreviewViewMode] = useState<'carousel' | 'popup'>('popup')
  const [dontShowTodayPreview, setDontShowTodayPreview] = useState(true)
  const [uploadingImage, setUploadingImage] = useState(false)

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showAlert({
        type: 'warning',
        title: locale === 'th' ? 'ไฟล์ไม่ถูกต้อง' : 'Invalid File',
        message: locale === 'th' ? 'กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WebP, GIF)' : 'Please select an image file (JPG, PNG, WebP, GIF)',
      })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      showAlert({
        type: 'warning',
        title: locale === 'th' ? 'ขนาดไฟล์เกิน' : 'File Too Large',
        message: locale === 'th' ? 'ขนาดรูปภาพต้องไม่เกิน 10 MB' : 'Image size must not exceed 10 MB',
      })
      return
    }

    // Set immediate preview
    const localPreview = URL.createObjectURL(file)
    setFormData((prev) => ({ ...prev, imageUrl: localPreview }))
    setUploadingImage(true)

    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'อัปโหลดไม่สำเร็จ')
      setFormData((prev) => ({ ...prev, imageUrl: data.url }))
    } catch (err: any) {
      console.warn('Upload API fallback to dataURL:', err)
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFormData((prev) => ({ ...prev, imageUrl: reader.result as string }))
        }
      }
      reader.readAsDataURL(file)
    } finally {
      setUploadingImage(false)
    }
  }

  // Lock body scroll when modal is active
  useEffect(() => {
    if (!showModal) return
    const origOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        setShowModal(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = origOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [showModal, saving])

  // KPIs
  const stats = useMemo(() => {
    const total = items.length
    const activeCarousels = items.filter(
      (a) => a.is_active !== false && !a.body?.includes('[carousel: false]')
    ).length
    const activePopups = items.filter(
      (a) => a.is_active !== false && extractAnnouncementPopup(a)
    ).length
    const overdueTargeted = items.filter(
      (a) => extractAnnouncementTarget(a) === 'overdue' && a.is_active !== false
    ).length

    return { total, activeCarousels, activePopups, overdueTargeted }
  }, [items])

  // Filtered List
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Channel
      const isPop = extractAnnouncementPopup(item)
      const isCar = !item.body?.includes('[carousel: false]')
      if (channelFilter === 'popup' && !isPop) return false
      if (channelFilter === 'carousel' && !isCar) return false

      // Status
      const isActive = item.is_active !== false
      if (statusFilter === 'active' && !isActive) return false
      if (statusFilter === 'inactive' && isActive) return false

      // Target
      const target = extractAnnouncementTarget(item)
      if (targetFilter !== 'all' && target !== targetFilter) return false

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = item.title?.toLowerCase().includes(q)
        const matchTitleEn = item.title_en?.toLowerCase().includes(q)
        const matchBody = item.body?.toLowerCase().includes(q)
        if (!matchTitle && !matchTitleEn && !matchBody) return false
      }

      return true
    })
  }, [items, channelFilter, statusFilter, targetFilter, searchQuery])

  // Open Create Modal
  function handleOpenCreate() {
    setEditingId(null)
    setFormData({
      title: '',
      title_en: '',
      body: '',
      body_en: '',
      type: 'info',
      imageUrl: PRESET_IMAGES[0].url,
      target: 'all',
      isPopup: true,
      isCarousel: true,
      expiresAt: '',
      isActive: true,
      ctaText: 'รับทราบและเข้าใจ',
      ctaUrl: '',
    })
    setPreviewViewMode('popup')
    setMobileEditorTab('form')
    setShowModal(true)
  }

  // Open Edit Modal
  function handleOpenEdit(ann: Announcement) {
    setEditingId(ann.id)
    const isPop = extractAnnouncementPopup(ann)
    const isCar = !ann.body?.includes('[carousel: false]')
    const target = extractAnnouncementTarget(ann)
    const cta = extractAnnouncementCta(ann)
    const img = extractAnnouncementImage(ann, 0) || ''
    const exp = extractAnnouncementExpiry(ann) || ''
    const cleanBodyTh = cleanAnnouncementBody(ann.body || '')
    const cleanBodyEn = cleanAnnouncementBody(ann.body_en || '')

    setFormData({
      title: ann.title || '',
      title_en: ann.title_en || '',
      body: cleanBodyTh,
      body_en: cleanBodyEn,
      type: ann.type || 'info',
      imageUrl: img,
      target,
      isPopup: isPop,
      isCarousel: isCar,
      expiresAt: exp,
      isActive: ann.is_active !== false,
      ctaText: cta?.text || (isPop ? 'รับทราบและเข้าใจ' : ''),
      ctaUrl: cta?.url || '',
    })
    setPreviewViewMode(isPop ? 'popup' : 'carousel')
    setMobileEditorTab('form')
    setShowModal(true)
  }

  // Duplicate Announcement Draft
  function handleDuplicate(ann: Announcement) {
    const isPop = extractAnnouncementPopup(ann)
    const isCar = !ann.body?.includes('[carousel: false]')
    const target = extractAnnouncementTarget(ann)
    const cta = extractAnnouncementCta(ann)
    const img = extractAnnouncementImage(ann, 0) || ''
    const exp = extractAnnouncementExpiry(ann) || ''

    setEditingId(null)
    setFormData({
      title: `${ann.title} (สำเนา)`,
      title_en: ann.title_en ? `${ann.title_en} (Copy)` : '',
      body: cleanAnnouncementBody(ann.body || ''),
      body_en: cleanAnnouncementBody(ann.body_en || ''),
      type: ann.type || 'info',
      imageUrl: img,
      target,
      isPopup: isPop,
      isCarousel: isCar,
      expiresAt: exp,
      isActive: true,
      ctaText: cta?.text || '',
      ctaUrl: cta?.url || '',
    })
    setShowModal(true)
  }

  // Optimistic Toggle Status
  async function handleToggleStatus(ann: Announcement) {
    const currentActive = ann.is_active !== false
    const nextActive = !currentActive

    // Optimistic UI update
    setItems((prev) =>
      prev.map((item) => (item.id === ann.id ? { ...item, is_active: nextActive } : item))
    )
    setTogglingId(ann.id)

    try {
      const res = await fetch(`/api/admin/announcements/${ann.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextActive }),
      })
      if (!res.ok) {
        throw new Error(locale === 'th' ? 'บันทึกสถานะไม่สำเร็จ' : 'Failed to save status')
      }
    } catch (err: any) {
      // Revert on failure
      setItems((prev) =>
        prev.map((item) => (item.id === ann.id ? { ...item, is_active: currentActive } : item))
      )
      showAlert({
        type: 'error',
        title: locale === 'th' ? 'เกิดข้อผิดพลาด' : 'Error Occurred',
        message: err.message || (locale === 'th' ? 'ไม่สามารถเปลี่ยนสถานะได้' : 'Failed to change status'),
      })
    } finally {
      setTogglingId(null)
    }
  }

  // Delete Announcement
  function handleDelete(ann: Announcement) {
    showConfirm({
      type: 'warning',
      title: locale === 'th' ? 'ยืนยันการลบประกาศ' : 'Confirm Delete Announcement',
      message: locale === 'th'
        ? `คุณต้องการลบ "${ann.title}" ออกจากระบบถาวรหรือไม่?`
        : `Are you sure you want to permanently delete "${ann.title_en || ann.title}"?`,
      confirmText: locale === 'th' ? 'ลบประกาศ' : 'Delete',
      cancelText: locale === 'th' ? 'ยกเลิก' : 'Cancel',
      onConfirm: async () => {
        setDeletingId(ann.id)
        try {
          const res = await fetch(`/api/admin/announcements/${ann.id}`, { method: 'DELETE' })
          if (!res.ok) throw new Error(locale === 'th' ? 'ลบไม่สำเร็จ' : 'Failed to delete')
          setItems((prev) => prev.filter((item) => item.id !== ann.id))
          router.refresh()
        } catch (err: any) {
          showAlert({
            type: 'error',
            title: locale === 'th' ? 'ผิดพลาด' : 'Error',
            message: err.message || (locale === 'th' ? 'ไม่สามารถลบประกาศได้' : 'Could not delete announcement'),
          })
        } finally {
          setDeletingId(null)
        }
      },
    })
  }

  // Submit Save
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.title.trim()) {
      showAlert({
        type: 'warning',
        title: locale === 'th' ? 'ข้อมูลไม่ครบถ้วน' : 'Missing Information',
        message: locale === 'th' ? 'กรุณาระบุหัวข้อประกาศ' : 'Please provide announcement title',
      })
      return
    }
    if (!formData.body.trim()) {
      showAlert({
        type: 'warning',
        title: locale === 'th' ? 'ข้อมูลไม่ครบถ้วน' : 'Missing Information',
        message: locale === 'th' ? 'กรุณาระบุเนื้อหาประกาศ' : 'Please provide announcement content',
      })
      return
    }

    setSaving(true)

    // Build Body with Metadata tags
    let finalBody = formData.body.trim()
    let finalBodyEn = formData.body_en.trim()

    if (formData.imageUrl.trim()) {
      finalBody += `\n\n[image: ${formData.imageUrl.trim()}]`
      if (finalBodyEn) finalBodyEn += `\n\n[image: ${formData.imageUrl.trim()}]`
    }
    if (formData.expiresAt.trim()) {
      finalBody += `\n\n[expires: ${formData.expiresAt.trim()}]`
      if (finalBodyEn) finalBodyEn += `\n\n[expires: ${formData.expiresAt.trim()}]`
    }
    if (formData.isPopup) {
      finalBody += `\n\n[popup: true]`
      if (finalBodyEn) finalBodyEn += `\n\n[popup: true]`
    }
    if (!formData.isCarousel) {
      finalBody += `\n\n[carousel: false]`
      if (finalBodyEn) finalBodyEn += `\n\n[carousel: false]`
    }
    if (formData.target && formData.target !== 'all') {
      finalBody += `\n\n[target: ${formData.target}]`
      if (finalBodyEn) finalBodyEn += `\n\n[target: ${formData.target}]`
    }
    if (formData.ctaText.trim()) {
      finalBody += `\n\n[cta: ${formData.ctaText.trim()}|${formData.ctaUrl.trim() || '#'}]`
      if (finalBodyEn) finalBodyEn += `\n\n[cta: ${formData.ctaText.trim()}|${formData.ctaUrl.trim() || '#'}]`
    }

    const payload = {
      title: formData.title.trim(),
      title_en: formData.title_en.trim() || null,
      body: finalBody,
      body_en: finalBodyEn || null,
      type: formData.type,
      is_active: formData.isActive,
    }

    try {
      if (editingId) {
        const res = await fetch(`/api/admin/announcements/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || (locale === 'th' ? 'บันทึกไม่สำเร็จ' : 'Failed to save'))

        setItems((prev) =>
          prev.map((item) =>
            item.id === editingId
              ? {
                  ...item,
                  ...payload,
                  body_en: payload.body_en ?? undefined,
                  title_en: payload.title_en ?? undefined,
                }
              : item
          )
        )
      } else {
        const res = await fetch('/api/admin/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || (locale === 'th' ? 'สร้างประกาศไม่สำเร็จ' : 'Failed to create announcement'))
      }

      setShowModal(false)
      router.refresh()
    } catch (err: any) {
      showAlert({
        type: 'error',
        title: locale === 'th' ? 'เกิดข้อผิดพลาด' : 'Error Occurred',
        message: err.message || (locale === 'th' ? 'ไม่สามารถบันทึกข้อมูลได้' : 'Failed to save announcement data'),
      })
    } finally {
      setSaving(false)
    }
  }

  // Quick Preset Date Helper
  function applyExpiryPreset(days: number | null) {
    if (days === null) {
      setFormData((prev) => ({ ...prev, expiresAt: '' }))
      return
    }
    const targetDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    const isoString = targetDate.toISOString().slice(0, 16)
    setFormData((prev) => ({ ...prev, expiresAt: isoString }))
  }

  // Safe Date Formatter with guaranteed SSR-client attribute match
  function renderExpiryBadge(exp: string | null) {
    if (!exp) return null

    let formattedDate = exp
    let isExpired = false
    try {
      const d = new Date(exp)
      if (!isNaN(d.getTime())) {
        formattedDate = format(d, 'dd MMM yy HH:mm', { locale: locale === 'th' ? th : undefined })
        if (mounted) {
          isExpired = d.getTime() < Date.now()
        }
      }
    } catch {
      // fallback
    }

    return (
      <span
        suppressHydrationWarning
        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold inline-flex items-center gap-1 border ${
          mounted && isExpired
            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900'
            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
        }`}
      >
        <Clock size={10} />
        <span suppressHydrationWarning>
          {mounted && isExpired
            ? (locale === 'th' ? 'หมดอายุแล้ว' : 'Expired')
            : (locale === 'th' ? `สิ้นสุด: ${formattedDate}` : `Expires: ${formattedDate}`)}
        </span>
      </span>
    )
  }

  // Active target details
  const activeTargetObj = TARGET_OPTIONS.find((t) => t.id === formData.target) || TARGET_OPTIONS[0]

  return (
    <div suppressHydrationWarning className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in text-neutral-900 dark:text-neutral-100">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP NAVIGATION & HEADER
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 dark:border-neutral-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                {locale === 'th' ? 'จัดการประกาศ & แบนเนอร์' : 'Announcements & Banners'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                Admin Panel
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {locale === 'th'
                ? 'ควบคุมการแสดงผล Carousel สไลด์หน้าแรก และ Pop-up หน้าต่างแจ้งเตือนผู้ใช้งานระบบยืมหนังสือ'
                : 'Manage home screen carousel slides and pop-up notifications for library members.'}
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer"
        >
          <Plus size={16} className="stroke-[2.5]" />
          <span>{locale === 'th' ? 'สร้างประกาศใหม่' : 'New Announcement'}</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. METRIC SUMMARY COUNTERS (KPI CARDS)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">{locale === 'th' ? 'ประกาศทั้งหมด' : 'Total Announcements'}</span>
            <Megaphone size={16} />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            {stats.total}
          </p>
          <p className="text-[11px] text-neutral-400">{locale === 'th' ? 'รายการในฐานข้อมูล' : 'Items in database'}</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">{locale === 'th' ? 'Carousel กำลังแสดงผล' : 'Active Carousels'}</span>
            <Layers size={16} />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">
            {stats.activeCarousels}
          </p>
          <p className="text-[11px] text-neutral-400">{locale === 'th' ? 'สไลด์บนหน้าแรก' : 'Slides on home page'}</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">{locale === 'th' ? 'Pop-up เปิดใช้งาน' : 'Active Pop-ups'}</span>
            <Bell size={16} />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
            {stats.activePopups}
          </p>
          <p className="text-[11px] text-neutral-400">{locale === 'th' ? 'แจ้งเตือนผู้ใช้เมื่อเข้าเว็บ' : 'Prompts shown on entry'}</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">{locale === 'th' ? 'เจาะจงกลุ่มค้างส่ง' : 'Targeted Overdue'}</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400">
            {stats.overdueTargeted}
          </p>
          <p className="text-[11px] text-neutral-400">{locale === 'th' ? 'กลุ่ม Overdue Borrowers' : 'Overdue borrowers'}</p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. SEARCH & ADVANCED FILTER BAR
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 bg-neutral-50/80 dark:bg-neutral-900/60 rounded-2xl border border-neutral-200/80 dark:border-neutral-800">
        <div className="flex-1 relative min-w-[220px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder={locale === 'th' ? 'ค้นหาตามหัวข้อ หรือเนื้อหาประกาศ...' : 'Search by title or content...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-neutral-900 dark:focus:border-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Channel Filter */}
          <div className="flex items-center p-1 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
            <button
              onClick={() => setChannelFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                channelFilter === 'all'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              {locale === 'th' ? 'ทุกช่องทาง' : 'All Channels'}
            </button>
            <button
              onClick={() => setChannelFilter('carousel')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                channelFilter === 'carousel'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              Carousel
            </button>
            <button
              onClick={() => setChannelFilter('popup')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                channelFilter === 'popup'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              Pop-up
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center p-1 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              {locale === 'th' ? 'สถานะทั้งหมด' : 'All Status'}
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'inactive'
                  ? 'bg-neutral-400 text-white dark:bg-neutral-700 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Inactive
            </button>
          </div>

          {/* Target Audience Dropdown */}
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 outline-none text-neutral-700 dark:text-neutral-300"
          >
            <option value="all">{locale === 'th' ? 'เป้าหมาย: ทั้งหมด' : 'Target: All'}</option>
            <option value="overdue">{locale === 'th' ? 'ผู้มีหนังสือค้างส่ง (Overdue)' : 'Overdue Borrowers'}</option>
            <option value="active_borrowers">{locale === 'th' ? 'ผู้กำลังยืม (Active)' : 'Active Borrowers'}</option>
            <option value="new_members">{locale === 'th' ? 'สมาชิกใหม่ (New Members)' : 'New Members'}</option>
          </select>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. INTERACTIVE CRUD LIST / CARDS
      ───────────────────────────────────────────────────────────── */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-neutral-900/50 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800">
          <Megaphone size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            {locale === 'th' ? 'ไม่พบรายการประกาศที่ตรงกับเงื่อนไข' : 'No announcements found matching criteria'}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            {locale === 'th' ? 'ลองเปลี่ยนคำค้นหาหรือตัวกรองด้านบน' : 'Try adjusting your search terms or filters above.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>{locale === 'th' ? 'สร้างประกาศแรกเลย' : 'Create First Announcement'}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredItems.map((ann) => {
            const isPop = extractAnnouncementPopup(ann)
            const isCar = !ann.body?.includes('[carousel: false]')
            const img = extractAnnouncementImage(ann, 0)
            const exp = extractAnnouncementExpiry(ann)
            const target = extractAnnouncementTarget(ann)
            const cta = extractAnnouncementCta(ann)
            const cleanBody = cleanAnnouncementBody(ann.body || '')
            const cleanBodyEn = cleanAnnouncementBody(ann.body_en || '')
            const isActive = ann.is_active !== false

            // Target definition
            const targetDef = TARGET_OPTIONS.find((t) => t.id === target) || TARGET_OPTIONS[0]

            return (
              <div
                key={ann.id}
                className={`group relative rounded-2xl sm:rounded-3xl border transition-all duration-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isActive
                    ? 'bg-white dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-xs hover:shadow-sm'
                    : 'bg-neutral-50/70 dark:bg-neutral-950/40 border-neutral-200/60 dark:border-neutral-800/60 opacity-75'
                }`}
              >
                {/* Left Info Column */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Thumbnail / Media icon */}
                  {img ? (
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 border border-neutral-200/80 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800">
                      <img src={img} alt={ann.title} className="w-full h-full object-cover" />
                      {isPop && (
                        <div className="absolute bottom-1 right-1 p-0.5 rounded-md bg-black/70 backdrop-blur-xs text-white">
                          <Bell size={10} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shrink-0 flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-400">
                      <Megaphone size={20} className="opacity-40" />
                      <span className="text-[10px] mt-1 font-semibold">{locale === 'th' ? 'ไม่มีรูป' : 'No image'}</span>
                    </div>
                  )}

                  {/* Text Meta */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    {/* Tags row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Active Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border border-neutral-200 dark:border-neutral-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isActive ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'
                          }`}
                        />
                        <span>{isActive ? 'Active' : 'Inactive'}</span>
                      </span>

                      {/* Channels */}
                      {isCar && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60 inline-flex items-center gap-1">
                          <Layers size={10} />
                          <span>Carousel</span>
                        </span>
                      )}

                      {isPop && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60 inline-flex items-center gap-1">
                          <Sparkles size={10} />
                          <span>Pop-up</span>
                        </span>
                      )}

                      {/* Target audience */}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                        {targetDef.icon} {locale === 'th' ? targetDef.labelTh : targetDef.labelEn}
                      </span>

                      {/* Expiration Tag */}
                      {renderExpiryBadge(exp)}
                    </div>

                    {/* Title */}
                    <div className="flex items-baseline gap-2">
                      <h3 className="font-bold text-neutral-900 dark:text-white text-base truncate">
                        {(locale === 'en' && ann.title_en) ? ann.title_en : ann.title}
                      </h3>
                      {((locale === 'en' && ann.title_en) ? ann.title : ann.title_en) && (
                        <span className="text-xs text-neutral-400 hidden sm:inline truncate">
                          ({(locale === 'en' && ann.title_en) ? ann.title : ann.title_en})
                        </span>
                      )}
                    </div>

                    {/* Body preview */}
                    <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                      {(locale === 'en' && cleanBodyEn) ? cleanBodyEn : cleanBody}
                    </p>

                    {/* CTA link indicator */}
                    {cta && (
                      <p className="text-[11px] text-neutral-500 font-medium inline-flex items-center gap-1 pt-0.5">
                        <ArrowUpRight size={11} className="text-neutral-400" />
                        <span>{locale === 'th' ? `ปุ่ม CTA: "${cta.text}"` : `CTA Button: "${cta.text}"`}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Interactive Actions Column */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-neutral-100 dark:border-neutral-800">
                  {/* Inline Active/Inactive Toggle Switch */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500 font-medium hidden sm:inline">
                      {isActive ? (locale === 'th' ? 'เปิดแสดง' : 'Active') : (locale === 'th' ? 'ปิดซ่อน' : 'Hidden')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(ann)}
                      disabled={togglingId === ann.id}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                        isActive ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'
                      }`}
                      title={
                        isActive
                          ? (locale === 'th' ? 'คลิกเพื่อปิดการแสดงผล' : 'Click to deactivate')
                          : (locale === 'th' ? 'คลิกเพื่อเปิดการแสดงผล' : 'Click to activate')
                      }
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                          isActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="h-4 w-px bg-neutral-200 dark:border-neutral-800 hidden sm:block" />

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    {/* Duplicate button */}
                    <button
                      onClick={() => handleDuplicate(ann)}
                      className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors cursor-pointer"
                      title={locale === 'th' ? 'คัดลอกร่างประกาศ' : 'Duplicate draft'}
                    >
                      <Copy size={15} />
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={() => handleOpenEdit(ann)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                    >
                      {locale === 'th' ? 'แก้ไข' : 'Edit'}
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(ann)}
                      disabled={deletingId === ann.id}
                      className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title={locale === 'th' ? 'ลบประกาศ' : 'Delete announcement'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. SPLIT-SCREEN CREATE / EDIT MODAL & LIVE PREVIEW
      ───────────────────────────────────────────────────────────── */}
      {mounted && showModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 p-2 sm:p-4 md:p-6 animate-fade-in overflow-hidden">
          <div className="bg-white dark:bg-[#121215] border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-7xl h-[94vh] shadow-2xl flex flex-col overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200/80 dark:border-neutral-800 shrink-0 bg-neutral-50/50 dark:bg-neutral-900/40">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-black">
                  <SlidersHorizontal size={18} />
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <span>{editingId ? (locale === 'th' ? 'แก้ไขประกาศ' : 'Edit Announcement') : (locale === 'th' ? 'สร้างประกาศใหม่' : 'New Announcement')}</span>
                    <span className="text-[11px] font-medium text-neutral-400 bg-neutral-200/60 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                      Split-Screen Live Editor
                    </span>
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:block">
                    {locale === 'th'
                      ? 'แก้ไขข้อมูลด้านซ้าย พร้อมดูตัวอย่างการแสดงผลจริงบนหน้าจอผู้ใช้แบบเรียลไทม์ด้านขวา'
                      : 'Edit content on the left with instant real-time user preview on the right.'}
                  </p>
                </div>
              </div>

              {/* Mobile Tab Switcher & Close button */}
              <div className="flex items-center gap-2">
                <div className="lg:hidden flex items-center gap-1 p-1 rounded-xl bg-neutral-200/70 dark:bg-neutral-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setMobileEditorTab('form')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      mobileEditorTab === 'form'
                        ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-xs'
                        : 'text-neutral-500 dark:text-neutral-400'
                    }`}
                  >
                    {locale === 'th' ? 'แบบฟอร์ม' : 'Form'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileEditorTab('preview')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      mobileEditorTab === 'preview'
                        ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-xs'
                        : 'text-neutral-500 dark:text-neutral-400'
                    }`}
                  >
                    {locale === 'th' ? 'ตัวอย่าง' : 'Preview'}
                  </button>
                </div>
              </div>
            </div>

            {/* Split Screen Container */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
              {/* ───────────── LEFT SIDE: CLEAN INPUT FORM (Col 6) ───────────── */}
              <form
                id="announcement-form"
                onSubmit={handleSave}
                className={`lg:col-span-6 overflow-y-auto p-5 sm:p-7 space-y-5 border-r border-neutral-200/80 dark:border-neutral-800 min-h-0 ${
                  mobileEditorTab === 'form' ? 'block' : 'hidden lg:block'
                }`}
              >
                {/* 1. Target Audience Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-900 dark:text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users size={14} />
                      <span>{locale === 'th' ? 'กลุ่มเป้าหมาย (Target Audience) *' : 'Target Audience *'}</span>
                    </span>
                    <span className="text-[11px] font-normal text-neutral-400">
                      {locale === 'th' ? 'แสดงเฉพาะผู้ที่มีเงื่อนไขตรงกัน' : 'Display only to matching users'}
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {TARGET_OPTIONS.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setFormData({ ...formData, target: item.id })}
                        className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                          formData.target === item.id
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-xs'
                            : 'bg-neutral-50 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <span>{item.icon}</span>
                          <span>{locale === 'th' ? item.labelTh : item.labelEn}</span>
                        </div>
                        <p
                          className={`text-[10px] mt-1 line-clamp-1 ${
                            formData.target === item.id
                              ? 'text-neutral-300 dark:text-neutral-600'
                              : 'text-neutral-400'
                          }`}
                        >
                          {locale === 'th' ? item.descTh : item.descEn}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Display Channel Selector (Carousel vs Pop-up) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-900 dark:text-white">
                    {locale === 'th' ? 'ช่องทางแสดงผล (Display Channels) *' : 'Display Channels *'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isCarousel: !formData.isCarousel })}
                      className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        formData.isCarousel
                          ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200'
                          : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-400'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                          formData.isCarousel
                            ? 'bg-indigo-600 text-white'
                            : 'border border-neutral-300 dark:border-neutral-700'
                        }`}
                      >
                        {formData.isCarousel && <Check size={12} className="stroke-[3]" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold">Carousel Slide</p>
                        <p className="text-[10px] opacity-75">
                          {locale === 'th' ? 'แบนเนอร์ภาพสไลด์บนหน้าแรก' : 'Hero banner on home page'}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isPopup: !formData.isPopup })}
                      className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        formData.isPopup
                          ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200'
                          : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-400'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                          formData.isPopup
                            ? 'bg-amber-600 text-white'
                            : 'border border-neutral-300 dark:border-neutral-700'
                        }`}
                      >
                        {formData.isPopup && <Check size={12} className="stroke-[3]" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold">Pop-up Modal</p>
                        <p className="text-[10px] opacity-75">
                          {locale === 'th' ? 'หน้าต่างเด้งแจ้งเตือน' : 'Modal popup notification'}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 3. Type / Severity Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-900 dark:text-white">
                    {locale === 'th' ? 'ระดับความสำคัญ (Category)' : 'Priority Category'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'info' })}
                      className={`p-2.5 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                        formData.type === 'info'
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white'
                          : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800'
                      }`}
                    >
                      {locale === 'th' ? 'ทั่วไป (Info)' : 'Info'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'warning' })}
                      className={`p-2.5 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                        formData.type === 'warning'
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800'
                      }`}
                    >
                      {locale === 'th' ? 'แจ้งเตือน (Warning)' : 'Warning'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'success' })}
                      className={`p-2.5 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                        formData.type === 'success'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800'
                      }`}
                    >
                      {locale === 'th' ? 'พิเศษ (Featured)' : 'Featured'}
                    </button>
                  </div>
                </div>

                {/* 4. Title (TH & EN) */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      {locale === 'th' ? 'หัวข้อประกาศ (ภาษาไทย) *' : 'Announcement Title (Thai) *'}
                    </label>
                    <input
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder={locale === 'th' ? 'เช่น ระเบียบการยืม-คืนหนังสือ ชมรมมุสลิม มฟล.' : 'e.g. MFU Muslim Club Library Guidelines'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-neutral-900 dark:focus:border-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      {locale === 'th' ? 'หัวข้อประกาศ (English - ไม่บังคับ)' : 'Title (English - Optional)'}
                    </label>
                    <input
                      value={formData.title_en}
                      onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                      placeholder="e.g. MFU Muslim Club Library Guidelines"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-neutral-900 dark:focus:border-white transition-colors"
                    />
                  </div>
                </div>

                {/* 5. Schedule & Expiry */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <Clock size={13} className="text-neutral-500" />
                      <span>{locale === 'th' ? 'กำหนดเวลาสิ้นสุดการแสดงผล (Schedule Expiry)' : 'Schedule Expiry (Optional)'}</span>
                    </label>
                    {formData.expiresAt && (
                      <button
                        type="button"
                        onClick={() => applyExpiryPreset(null)}
                        className="text-[10px] text-neutral-400 hover:text-neutral-700 underline cursor-pointer"
                      >
                        {locale === 'th' ? 'ล้างวันหมดอายุ' : 'Clear Expiry'}
                      </button>
                    )}
                  </div>
                  <input
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-neutral-900 dark:focus:border-white transition-colors"
                  />
                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[11px] text-neutral-400">{locale === 'th' ? 'ตั้งด่วน:' : 'Quick:'}</span>
                    <button
                      type="button"
                      onClick={() => applyExpiryPreset(3)}
                      className="text-[11px] px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 cursor-pointer"
                    >
                      {locale === 'th' ? '+3 วัน' : '+3 Days'}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyExpiryPreset(7)}
                      className="text-[11px] px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 cursor-pointer"
                    >
                      {locale === 'th' ? '+7 วัน' : '+7 Days'}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyExpiryPreset(14)}
                      className="text-[11px] px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 cursor-pointer"
                    >
                      {locale === 'th' ? '+14 วัน' : '+14 Days'}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyExpiryPreset(30)}
                      className="text-[11px] px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 cursor-pointer"
                    >
                      {locale === 'th' ? '+1 เดือน' : '+1 Month'}
                    </button>
                  </div>
                </div>

                {/* 6. Image Upload & Presets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <ImageIcon size={14} />
                      <span>{locale === 'th' ? 'รูปภาพแบนเนอร์ / ภาพประกอบ' : 'Banner / Cover Image'}</span>
                    </label>
                    {formData.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: '' })}
                        className="text-[11px] text-rose-500 hover:text-rose-600 font-medium underline cursor-pointer"
                      >
                        {locale === 'th' ? 'ลบภาพ' : 'Remove Image'}
                      </button>
                    )}
                  </div>

                  {/* Direct File Upload Dropzone / Preview */}
                  {formData.imageUrl ? (
                    <div className="relative h-28 sm:h-32 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 shadow-inner group">
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <label className="px-3 py-1.5 rounded-xl bg-white text-black text-xs font-bold cursor-pointer hover:bg-neutral-100 transition-colors shadow-sm inline-flex items-center gap-1.5">
                          <Upload size={13} />
                          <span>{locale === 'th' ? 'เปลี่ยนรูป' : 'Change Image'}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={handleImageFileChange}
                            className="sr-only"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, imageUrl: '' })}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-sm cursor-pointer"
                        >
                          {locale === 'th' ? 'ลบรูป' : 'Delete Image'}
                        </button>
                      </div>
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white gap-2">
                          <Loader2 size={18} className="animate-spin" />
                          <span className="text-xs font-medium">{locale === 'th' ? 'กำลังอัปโหลด...' : 'Uploading...'}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="relative flex flex-col items-center justify-center p-5 border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white rounded-2xl cursor-pointer bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-all group">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleImageFileChange}
                        className="sr-only"
                      />
                      <div className="w-10 h-10 rounded-full bg-white dark:bg-neutral-800 shadow-xs border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 group-hover:scale-110 transition-transform mb-1.5">
                        <Upload size={18} />
                      </div>
                      <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        {uploadingImage
                          ? (locale === 'th' ? 'กำลังอัปโหลดรูปภาพ...' : 'Uploading image...')
                          : (locale === 'th' ? 'คลิกเพื่อเลือกรูปภาพจากเครื่อง' : 'Click or drop image to upload')}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {locale === 'th' ? 'รองรับ JPG, PNG, WebP (สูงสุด 10 MB)' : 'Supports JPG, PNG, WebP (Max 10 MB)'}
                      </p>
                    </label>
                  )}

                  {/* Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[11px] text-neutral-400">
                      {locale === 'th' ? 'หรือเลือกภาพสำเร็จรูป:' : 'Or choose preset photo:'}
                    </span>
                    {PRESET_IMAGES.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: preset.url })}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          formData.imageUrl === preset.url
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200'
                        }`}
                      >
                        {locale === 'th' ? preset.labelTh : preset.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 7. Body text (TH & EN) */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        {locale === 'th' ? 'เนื้อหาประกาศ (ภาษาไทย) *' : 'Announcement Body (Thai) *'}
                      </label>
                      <span className="text-[10px] text-neutral-400">
                        {locale === 'th' ? 'ใส่ 1. 2. 3. เพื่อสร้างรายการกฎระเบียบ' : 'Use 1. 2. 3. to format list items'}
                      </span>
                    </div>
                    <textarea
                      required
                      rows={4}
                      value={formData.body}
                      onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                      placeholder={locale === 'th' ? '1. สมาชิกสามารถยืมหนังสือได้ครั้งละ 1 เล่ม\n2. กรุณาส่งคืนหนังสือตรงตามกำหนด\n3. แนบรูปถ่ายหน้าปก ณ จุดคืนหนังสือ' : '1. Members may borrow 1 book at a time\n2. Please return books on schedule\n3. Upload photo at the return station'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-neutral-900 dark:focus:border-white transition-colors resize-y leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      {locale === 'th' ? 'เนื้อหาประกาศ (English - ไม่บังคับ)' : 'Body Content (English - Optional)'}
                    </label>
                    <textarea
                      rows={3}
                      value={formData.body_en}
                      onChange={(e) => setFormData({ ...formData, body_en: e.target.value })}
                      placeholder="1. Members may borrow 1 book at a time..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-neutral-900 dark:focus:border-white transition-colors resize-y leading-relaxed"
                    />
                  </div>
                </div>

                {/* 8. Call To Action (CTA) Button */}
                <div className="space-y-3 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                        <Link2 size={14} className="text-neutral-600 dark:text-neutral-300" />
                        <span>{locale === 'th' ? 'ปุ่มดำเนินการ (Call To Action - ไม่บังคับ)' : 'Call To Action (Optional Button)'}</span>
                      </label>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {locale === 'th'
                          ? 'เพิ่มปุ่มกดนำทางให้ผู้ใช้คลิกไปหน้าหนังสือ ยืม-คืน หรือเว็บไซต์'
                          : 'Add an action button directing users to books, borrows, or external links.'}
                      </p>
                    </div>

                    {(formData.ctaText || formData.ctaUrl) && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, ctaText: '', ctaUrl: '' })}
                        className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 hover:underline cursor-pointer"
                        title={locale === 'th' ? 'ลบปุ่มดำเนินการออก' : 'Clear Button'}
                      >
                        <RotateCcw size={11} />
                        <span>{locale === 'th' ? 'ล้างค่า (ไม่ใส่ปุ่ม)' : 'Clear Button'}</span>
                      </button>
                    )}
                  </div>

                  {/* Quick-Pick Destination Presets */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      {locale === 'th' ? 'ปุ่มลัดเลือกปลายทาง (คลิกเพื่อตั้งค่าอัตโนมัติ):' : 'Quick destination presets:'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {CTA_PRESETS.map((p) => {
                        const isSelected =
                          p.id === 'external'
                            ? formData.ctaUrl.startsWith('http')
                            : formData.ctaUrl === p.url

                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              const isDefaultOrEmpty =
                                !formData.ctaText.trim() ||
                                CTA_PRESETS.some(
                                  (prev) =>
                                    prev.defaultTextTh === formData.ctaText ||
                                    prev.defaultTextEn === formData.ctaText
                                )

                              const nextDefaultText = locale === 'th' ? p.defaultTextTh : p.defaultTextEn

                              setFormData({
                                ...formData,
                                ctaUrl: p.url,
                                ctaText: isDefaultOrEmpty ? nextDefaultText : formData.ctaText,
                              })
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                                : 'bg-white dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                            }`}
                          >
                            {p.id === 'books' && <BookOpen size={12} />}
                            {p.id === 'my-borrows' && <Bookmark size={12} />}
                            {p.id === 'feedback' && <MessageSquare size={12} />}
                            {p.id === 'home' && <Home size={12} />}
                            {p.id === 'external' && <Globe size={12} />}
                            <span>{locale === 'th' ? p.labelTh : p.labelEn}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Input Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                        <Tag size={11} />
                        <span>{locale === 'th' ? 'ข้อความบนปุ่ม (Button Label)' : 'Button Label'}</span>
                      </span>
                      <input
                        type="text"
                        placeholder={locale === 'th' ? 'เช่น ดูรายการหนังสือ, ยืมเลย' : 'e.g. View Books, Borrow Now'}
                        value={formData.ctaText}
                        onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Link2 size={11} />
                          <span>{locale === 'th' ? 'ลิงก์ปลายทาง (Target URL)' : 'Target URL'}</span>
                        </span>
                        {formData.ctaUrl ? (
                          formData.ctaUrl.startsWith('http') ? (
                            <span className="text-[10px] text-blue-500 font-bold">
                              {locale === 'th' ? 'เว็บภายนอก' : 'External URL'}
                            </span>
                          ) : formData.ctaUrl.startsWith('/') ? (
                            <span className="text-[10px] text-emerald-600 font-bold">
                              {locale === 'th' ? 'ในระบบ' : 'Internal'}
                            </span>
                          ) : null
                        ) : null}
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. /books or https://..."
                        value={formData.ctaUrl}
                        onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                        onBlur={() => {
                          const val = formData.ctaUrl.trim()
                          if (!val) return
                          if (val.startsWith('www.')) {
                            setFormData({ ...formData, ctaUrl: `https://${val}` })
                          } else if (!val.startsWith('/') && !val.startsWith('http://') && !val.startsWith('https://')) {
                            // If they typed just "books" or "my-borrows", prepend "/"
                            setFormData({ ...formData, ctaUrl: `/${val}` })
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors font-mono"
                      />
                    </div>
                  </div>

                  {/* Live Mini Preview Bar */}
                  {formData.ctaText.trim() && (
                    <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-neutral-400">
                        {formData.ctaUrl?.startsWith('http')
                          ? (locale === 'th' ? 'จะเปิดหน้าต่างใหม่ (New Tab)' : 'Opens in a new tab')
                          : (locale === 'th' ? `จะเปลี่ยนหน้าไปยัง: ${formData.ctaUrl || '/'}` : `Navigates to: ${formData.ctaUrl || '/'}`)}
                      </span>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black font-bold text-xs shadow-xs">
                        <span>{formData.ctaText}</span>
                        {formData.ctaUrl?.startsWith('http') ? (
                          <ArrowUpRight size={12} />
                        ) : (
                          <ChevronRight size={12} />
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* 9. Publish Status Switch */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
                  <div>
                    <p className="text-xs font-bold text-neutral-900 dark:text-white">
                      {locale === 'th' ? 'สถานะการแสดงผลทันที' : 'Publish Immediately'}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      {locale === 'th' ? 'เปิดให้แสดงผลทันทีเมื่อกดบันทึก' : 'Activate and display as soon as saved'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.isActive ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                        formData.isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </form>

              {/* ───────────── RIGHT SIDE: DYNAMIC LIVE PREVIEW FRAME (Col 6) ───────────── */}
              <div className={`lg:col-span-6 bg-neutral-100/70 dark:bg-neutral-950 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto min-h-0 border-t lg:border-t-0 border-neutral-200 dark:border-neutral-800 ${
                mobileEditorTab === 'preview' ? 'flex' : 'hidden lg:flex'
              }`}>
                {/* Preview Toolbar */}
                <div className="flex items-center justify-between gap-2 pb-4 shrink-0">
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-xs shadow-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewViewMode('popup')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        previewViewMode === 'popup'
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      <Bell size={13} />
                      <span>Pop-up Modal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewViewMode('carousel')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        previewViewMode === 'carousel'
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      <Layers size={13} />
                      <span>Carousel Hero</span>
                    </button>
                  </div>

                  {/* Device Viewport Selector */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-xs shadow-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewViewport('desktop')}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        previewViewport === 'desktop'
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                          : 'text-neutral-400 hover:text-neutral-700'
                      }`}
                      title="Desktop View"
                    >
                      <Monitor size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewViewport('mobile')}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        previewViewport === 'mobile'
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                          : 'text-neutral-400 hover:text-neutral-700'
                      }`}
                      title="Mobile View"
                    >
                      <Smartphone size={15} />
                    </button>
                  </div>
                </div>

                {/* Device Canvas Frame */}
                <div className="flex-1 flex items-center justify-center min-h-[340px] py-2">
                  <div
                    className={`transition-all duration-300 w-full ${
                      previewViewport === 'mobile' ? 'max-w-[360px]' : 'max-w-xl'
                    }`}
                  >
                    {/* Live Beacon */}
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 font-medium pb-2 px-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span className="font-semibold text-neutral-600 dark:text-neutral-300">
                          Live Interactive Preview
                        </span>
                      </div>
                      <span>
                        {locale === 'th' ? 'เป้าหมาย: ' : 'Target: '}
                        <strong className="text-neutral-700 dark:text-neutral-200">
                          {locale === 'th' ? activeTargetObj.labelTh : activeTargetObj.labelEn}
                        </strong>
                      </span>
                    </div>

                    {/* ─────────────────── PREVIEW: CAROUSEL HERO ─────────────────── */}
                    {previewViewMode === 'carousel' ? (
                      <div className="relative w-full rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-900 text-white shadow-xl min-h-[240px] flex flex-col justify-between p-6">
                        {/* Background Layer */}
                        {formData.imageUrl ? (
                          <>
                            <img
                              src={formData.imageUrl}
                              alt="Background"
                              className="absolute inset-0 w-full h-full object-cover brightness-[0.88]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30" />
                          </>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-[#0d0d10]" />
                        )}

                        {/* Top Meta row */}
                        <div className="relative z-10 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md border border-white/25">
                              {formData.type === 'warning'
                                ? (locale === 'th' ? 'แจ้งเตือน' : 'Warning')
                                : formData.type === 'success'
                                ? (locale === 'th' ? 'แนะนำ' : 'Featured')
                                : (locale === 'th' ? 'ประชาสัมพันธ์' : 'Info')}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/40 backdrop-blur-md border border-white/10 text-neutral-200">
                              {locale === 'th' ? activeTargetObj.labelTh : activeTargetObj.labelEn}
                            </span>
                            {formData.expiresAt && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-200 border border-amber-400/30">
                                {locale === 'th' ? 'สิ้นสุด' : 'Expires'} {formData.expiresAt.replace('T', ' ')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle Content */}
                        <div className="relative z-10 my-auto py-3 space-y-2">
                          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-snug drop-shadow-sm">
                            {((locale === 'en' && formData.title_en) ? formData.title_en : formData.title) ||
                              (locale === 'th' ? 'พิมพ์หัวข้อประกาศของคุณที่ช่องซ้าย' : 'Type your announcement title on the left')}
                          </h3>
                          {(!formData.body || (formData.body.length <= 70 && !formData.body.includes('\n'))) && (
                            <p className="text-xs sm:text-sm text-neutral-200/90 leading-relaxed">
                              {((locale === 'en' && formData.body_en) ? formData.body_en : formData.body) ||
                                (locale === 'th' ? 'เนื้อหาประกาศจะแสดงผลตรงนี้แบบเรียลไทม์...' : 'Announcement content will appear here in real-time...')}
                            </p>
                          )}

                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            {formData.ctaText && (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white text-neutral-950 text-xs font-bold shadow-md">
                                <span>{formData.ctaText}</span>
                                <ChevronRight size={13} />
                              </span>
                            )}

                            {formData.body && (formData.body.length > 70 || formData.body.includes('\n')) && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 text-white backdrop-blur-md border border-white/25 text-xs font-semibold shadow-xs">
                                <BookOpen size={13} className="text-white/80" />
                                <span>{locale === 'th' ? 'อ่านรายละเอียดเพิ่มเติม' : 'Read details'}</span>
                                <ChevronRight size={13} />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom Slide controls simulation */}
                        <div className="relative z-10 flex items-center justify-between pt-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-1.5 rounded-full bg-white" />
                            <div className="w-2 h-1.5 rounded-full bg-white/30" />
                            <div className="w-2 h-1.5 rounded-full bg-white/30" />
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-xs">
                              <ChevronLeft size={13} />
                            </div>
                            <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-xs">
                              <ChevronRight size={13} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ─────────────────── PREVIEW: POP-UP MODAL ─────────────────── */
                      <div className="relative w-full rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161619] shadow-2xl flex flex-col max-h-[460px]">
                        {/* Image Header if provided */}
                        {formData.imageUrl ? (
                          <div className="relative w-full h-32 sm:h-36 overflow-hidden bg-neutral-900 shrink-0">
                            <img
                              src={formData.imageUrl}
                              alt="Modal Banner"
                              className="w-full h-full object-cover brightness-90"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            <div className="absolute top-3 left-3 flex items-center gap-1.5">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-neutral-950 backdrop-blur-md">
                                {formData.type === 'warning'
                                  ? (locale === 'th' ? 'ข้อควรระวัง' : 'Warning')
                                  : formData.type === 'success'
                                  ? (locale === 'th' ? 'ข่าวพิเศษ' : 'Featured')
                                  : (locale === 'th' ? 'ประกาศสำคัญ' : 'Notice')}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-md border border-white/20">
                                {locale === 'th' ? activeTargetObj.labelTh : activeTargetObj.labelEn}
                              </span>
                            </div>
                            <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center">
                              <X size={14} />
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 pb-0 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                                {formData.type === 'warning' ? (locale === 'th' ? 'แจ้งเตือน' : 'Warning') : (locale === 'th' ? 'ประกาศ' : 'Notice')}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                                {locale === 'th' ? activeTargetObj.labelTh : activeTargetObj.labelEn}
                              </span>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
                              <X size={13} />
                            </div>
                          </div>
                        )}

                        {/* Modal Body */}
                        <div className="p-5 overflow-y-auto space-y-3 flex-1 min-h-0">
                          <div>
                            <h3 className="font-extrabold text-neutral-900 dark:text-white text-base leading-snug">
                              {((locale === 'en' && formData.title_en) ? formData.title_en : formData.title) ||
                                (locale === 'th' ? 'หัวข้อประกาศจำลอง' : 'Sample Announcement Title')}
                            </h3>
                            <p className="text-[11px] text-neutral-400 mt-0.5">
                              {locale === 'th' ? 'MFU Muslim Club Library • ระบบยืม-คืนหนังสือ' : 'MFU Muslim Club Library • Library System'}
                            </p>
                          </div>

                          {/* Render numbered items if format detected */}
                          {formData.body.split('\n').filter(Boolean).length > 0 ? (
                            <div className="space-y-1.5 text-xs text-neutral-700 dark:text-neutral-300">
                              {((locale === 'en' && formData.body_en) ? formData.body_en : formData.body)
                                .split('\n')
                                .map((line) => line.trim())
                                .filter(Boolean)
                                .map((line, idx) => {
                                  const match = line.match(/^(\d+)[\.\)]\s+(.*)/)
                                  if (match) {
                                    return (
                                      <div
                                        key={idx}
                                        className="flex items-start gap-2 p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 text-[11px]"
                                      >
                                        <div className="w-4 h-4 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black font-bold flex items-center justify-center shrink-0 mt-0.5 text-[9px]">
                                          {match[1]}
                                        </div>
                                        <p className="leading-relaxed font-medium">{match[2]}</p>
                                      </div>
                                    )
                                  }
                                  return (
                                    <p key={idx} className="text-xs leading-relaxed">
                                      {line}
                                    </p>
                                  )
                                })}
                            </div>
                          ) : (
                            <p className="text-xs text-neutral-400 italic">
                              {locale === 'th' ? 'ยังไม่ได้พิมพ์เนื้อหาประกาศ...' : 'No announcement content entered yet...'}
                            </p>
                          )}

                          {/* Simulated callout tip */}
                          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2 text-emerald-800 dark:text-emerald-300 text-[11px]">
                            <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                            <span>
                              {formData.target === 'overdue'
                                ? (locale === 'th'
                                    ? 'สำหรับผู้ที่มีหนังสือค้างส่ง โปรดนำหนังสือมาคืน ณ จุดคืนหนังสือโดยเร็ว'
                                    : 'Overdue borrowers please return books to the drop point promptly.')
                                : (locale === 'th'
                                    ? 'สมาชิกสามารถยืมหนังสือได้ครั้งละ 1 เล่ม นานสูงสุด 14 วัน'
                                    : 'Members may borrow 1 book at a time for up to 14 days.')}
                            </span>
                          </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-3.5 border-t border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/80 dark:bg-neutral-900/60 flex items-center justify-between shrink-0">
                          <label className="flex items-center gap-1.5 text-[11px] text-neutral-500 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={dontShowTodayPreview}
                              onChange={(e) => setDontShowTodayPreview(e.target.checked)}
                              className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 cursor-pointer"
                            />
                            <span>{locale === 'th' ? 'ไม่ต้องแสดงวันนี้อีก' : 'Do not show again today'}</span>
                          </label>

                          <button
                            type="button"
                            className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-bold shadow-sm cursor-pointer"
                          >
                            {formData.ctaText || (locale === 'th' ? 'รับทราบและเข้าใจ' : 'Acknowledge & Dismiss')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned Global Modal Footer (Always visible & accessible across all screen sizes) */}
            <div className="px-6 py-3.5 border-t border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#121215] flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-neutral-400 hidden sm:inline">
                {locale === 'th'
                  ? '* ข้อมูลจะถูกบันทึกและแสดงผลทันทีตามเงื่อนไขที่กำหนด'
                  : '* Settings will take effect immediately upon saving.'}
              </span>
              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  {locale === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  form="announcement-form"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 transition-all active:scale-95 disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {saving
                    ? (locale === 'th' ? 'กำลังบันทึก...' : 'Saving...')
                    : editingId
                    ? (locale === 'th' ? 'บันทึกการแก้ไข' : 'Save Changes')
                    : (locale === 'th' ? 'ยืนยันสร้างประกาศ' : 'Create Announcement')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}