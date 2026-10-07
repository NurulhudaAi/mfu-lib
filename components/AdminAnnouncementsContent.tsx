'use client'

import { useState, useMemo, useEffect } from 'react'
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
} from 'lucide-react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
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
    label: '🏛️ หอสมุด มฟล.',
    url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: '📚 ชั้นหนังสือคลาสสิก',
    url: 'https://images.unsplash.com/photo-1507842229446-51f78713d334?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: '✨ โมเดิร์น คลีน',
    url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: '📖 บรรยากาศการอ่าน',
    url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1200&q=80',
  },
]

const TARGET_OPTIONS: { id: AnnouncementTarget; labelTh: string; labelEn: string; icon: string; desc: string }[] = [
  {
    id: 'all',
    labelTh: 'สมาชิกทุกคน',
    labelEn: 'All Students',
    icon: '👥',
    desc: 'แสดงให้ทุกคนที่เข้าสู่ระบบและผู้เยี่ยมชม',
  },
  {
    id: 'overdue',
    labelTh: 'ผู้มีหนังสือค้างส่ง',
    labelEn: 'Overdue Borrowers',
    icon: '⚠️',
    desc: 'เจาะจงเฉพาะผู้ที่เกินกำหนดส่งหนังสือ',
  },
  {
    id: 'active_borrowers',
    labelTh: 'ผู้กำลังยืมหนังสือ',
    labelEn: 'Active Borrowers',
    icon: '📚',
    desc: 'สมาชิกที่มียอดหนังสือค้างอยู่ในมือปัจจุบัน',
  },
  {
    id: 'new_members',
    labelTh: 'สมาชิกใหม่',
    labelEn: 'New Members',
    icon: '🌟',
    desc: 'ผู้ใช้งานใหม่หรือยังไม่เคยมีประวัติการยืม',
  },
]

export default function AdminAnnouncementsContent({
  announcements: initialAnnouncements,
}: {
  announcements: Announcement[]
}) {
  const router = useRouter()
  const { showAlert, showConfirm } = useApp()

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
      showAlert({ type: 'warning', title: 'ไฟล์ไม่ถูกต้อง', message: 'กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WebP, GIF)' })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      showAlert({ type: 'warning', title: 'ขนาดไฟล์เกิน', message: 'ขนาดรูปภาพต้องไม่เกิน 10 MB' })
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
        throw new Error('บันทึกสถานะไม่สำเร็จ')
      }
    } catch (err: any) {
      // Revert on failure
      setItems((prev) =>
        prev.map((item) => (item.id === ann.id ? { ...item, is_active: currentActive } : item))
      )
      showAlert({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: err.message || 'ไม่สามารถเปลี่ยนสถานะได้',
      })
    } finally {
      setTogglingId(null)
    }
  }

  // Delete Announcement
  function handleDelete(ann: Announcement) {
    showConfirm({
      type: 'warning',
      title: 'ยืนยันการลบประกาศ',
      message: `คุณต้องการลบ "${ann.title}" ออกจากระบบถาวรหรือไม่?`,
      confirmText: 'ลบประกาศ',
      cancelText: 'ยกเลิก',
      onConfirm: async () => {
        setDeletingId(ann.id)
        try {
          const res = await fetch(`/api/admin/announcements/${ann.id}`, { method: 'DELETE' })
          if (!res.ok) throw new Error('ลบไม่สำเร็จ')
          setItems((prev) => prev.filter((item) => item.id !== ann.id))
          router.refresh()
        } catch (err: any) {
          showAlert({
            type: 'error',
            title: 'ผิดพลาด',
            message: err.message || 'ไม่สามารถลบประกาศได้',
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
      showAlert({ type: 'warning', title: 'ข้อมูลไม่ครบถ้วน', message: 'กรุณาระบุหัวข้อประกาศ' })
      return
    }
    if (!formData.body.trim()) {
      showAlert({ type: 'warning', title: 'ข้อมูลไม่ครบถ้วน', message: 'กรุณาระบุเนื้อหาประกาศ' })
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
        if (!res.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ')

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
        if (!res.ok) throw new Error(data.error || 'สร้างประกาศไม่สำเร็จ')
      }

      setShowModal(false)
      router.refresh()
    } catch (err: any) {
      showAlert({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: err.message || 'ไม่สามารถบันทึกข้อมูลได้',
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
        formattedDate = format(d, 'dd MMM yy HH:mm', { locale: th })
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
          {mounted && isExpired ? 'หมดอายุแล้ว' : `สิ้นสุด: ${formattedDate}`}
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
          <Link
            href="/admin/dashboard"
            className="p-2.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors shadow-xs"
            title="กลับสู่แดชบอร์ดหลัก"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                จัดการประกาศ & แบนเนอร์
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                Admin Panel
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              ควบคุมการแสดงผล Carousel สไลด์หน้าแรก และ Pop-up หน้าต่างแจ้งเตือนผู้ใช้งานระบบยืมหนังสือ
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer"
        >
          <Plus size={16} className="stroke-[2.5]" />
          <span>สร้างประกาศใหม่</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. METRIC SUMMARY COUNTERS (KPI CARDS)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">ประกาศทั้งหมด</span>
            <Megaphone size={16} />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            {stats.total}
          </p>
          <p className="text-[11px] text-neutral-400">รายการในฐานข้อมูล</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">Carousel กำลังแสดงผล</span>
            <Layers size={16} />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">
            {stats.activeCarousels}
          </p>
          <p className="text-[11px] text-neutral-400">สไลด์บนหน้าแรก</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">Pop-up เปิดใช้งาน</span>
            <Bell size={16} />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
            {stats.activePopups}
          </p>
          <p className="text-[11px] text-neutral-400">แจ้งเตือนผู้ใช้เมื่อเข้าเว็บ</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">เจาะจงกลุ่มค้างส่ง</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400">
            {stats.overdueTargeted}
          </p>
          <p className="text-[11px] text-neutral-400">กลุ่ม Overdue Borrowers</p>
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
            placeholder="ค้นหาตามหัวข้อ หรือเนื้อหาประกาศ..."
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
              ทุกช่องทาง
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
              สถานะทั้งหมด
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
            <option value="all">🎯 เป้าหมาย: ทั้งหมด</option>
            <option value="overdue">⚠️ ผู้มีหนังสือค้างส่ง (Overdue)</option>
            <option value="active_borrowers">📚 ผู้กำลังยืม (Active)</option>
            <option value="new_members">🌟 สมาชิกใหม่ (New Members)</option>
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
            ไม่พบรายการประกาศที่ตรงกับเงื่อนไข
          </p>
          <p className="text-xs text-neutral-400 mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรองด้านบน</p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>สร้างประกาศแรกเลย</span>
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
                      <span className="text-[10px] mt-1 font-semibold">ไม่มีรูป</span>
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
                        {targetDef.icon} {targetDef.labelTh}
                      </span>

                      {/* Expiration Tag */}
                      {renderExpiryBadge(exp)}
                    </div>

                    {/* Title */}
                    <div className="flex items-baseline gap-2">
                      <h3 className="font-bold text-neutral-900 dark:text-white text-base truncate">
                        {ann.title}
                      </h3>
                      {ann.title_en && (
                        <span className="text-xs text-neutral-400 hidden sm:inline truncate">
                          ({ann.title_en})
                        </span>
                      )}
                    </div>

                    {/* Body preview */}
                    <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                      {cleanBody}
                    </p>

                    {/* CTA link indicator */}
                    {cta && (
                      <p className="text-[11px] text-neutral-500 font-medium inline-flex items-center gap-1 pt-0.5">
                        <ArrowUpRight size={11} className="text-neutral-400" />
                        <span>ปุ่ม CTA: &quot;{cta.text}&quot;</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Interactive Actions Column */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-neutral-100 dark:border-neutral-800">
                  {/* Inline Active/Inactive Toggle Switch */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500 font-medium hidden sm:inline">
                      {isActive ? 'เปิดแสดง' : 'ปิดซ่อน'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(ann)}
                      disabled={togglingId === ann.id}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                        isActive ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'
                      }`}
                      title={isActive ? 'คลิกเพื่อปิดการแสดงผล' : 'คลิกเพื่อเปิดการแสดงผล'}
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
                      title="คัดลอกร่างประกาศ"
                    >
                      <Copy size={15} />
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={() => handleOpenEdit(ann)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                    >
                      แก้ไข
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(ann)}
                      disabled={deletingId === ann.id}
                      className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="ลบประกาศ"
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
      {mounted && showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-fade-in overflow-hidden">
          <div className="bg-white dark:bg-[#121215] border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-7xl h-[94vh] shadow-2xl flex flex-col overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200/80 dark:border-neutral-800 shrink-0 bg-neutral-50/50 dark:bg-neutral-900/40">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-black">
                  <SlidersHorizontal size={18} />
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <span>{editingId ? 'แก้ไขประกาศ' : 'สร้างประกาศใหม่'}</span>
                    <span className="text-[11px] font-medium text-neutral-400 bg-neutral-200/60 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                      Split-Screen Live Editor
                    </span>
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    แก้ไขข้อมูลด้านซ้าย พร้อมดูตัวอย่างการแสดงผลจริงบนหน้าจอผู้ใช้แบบเรียลไทม์ด้านขวา
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-full hover:bg-neutral-200/70 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                title="ปิด (Esc)"
              >
                <X size={20} />
              </button>
            </div>

            {/* Split Screen Container */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
              {/* ───────────── LEFT SIDE: CLEAN INPUT FORM (Col 6) ───────────── */}
              <form
                id="announcement-form"
                onSubmit={handleSave}
                className="lg:col-span-6 overflow-y-auto p-5 sm:p-7 space-y-5 border-r border-neutral-200/80 dark:border-neutral-800 min-h-0"
              >
                {/* 1. Target Audience Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-900 dark:text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users size={14} />
                      <span>กลุ่มเป้าหมาย (Target Audience) *</span>
                    </span>
                    <span className="text-[11px] font-normal text-neutral-400">
                      แสดงเฉพาะผู้ที่มีเงื่อนไขตรงกัน
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
                          <span>{item.labelTh}</span>
                        </div>
                        <p
                          className={`text-[10px] mt-1 line-clamp-1 ${
                            formData.target === item.id
                              ? 'text-neutral-300 dark:text-neutral-600'
                              : 'text-neutral-400'
                          }`}
                        >
                          {item.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Display Channel Selector (Carousel vs Pop-up) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-900 dark:text-white">
                    ช่องทางแสดงผล (Display Channels) *
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
                        <p className="text-[10px] opacity-75">แบนเนอร์ภาพสไลด์บนหน้าแรก</p>
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
                        <p className="text-[10px] opacity-75">หน้าต่างเด้งแจ้งเตือน</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 3. Type / Severity Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-900 dark:text-white">
                    ระดับความสำคัญ (Category)
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
                      📢 ทั่วไป (Info)
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
                      ⚠️ แจ้งเตือน (Warning)
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
                      ✨ พิเศษ (Featured)
                    </button>
                  </div>
                </div>

                {/* 4. Title (TH & EN) */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      หัวข้อประกาศ (ภาษาไทย) *
                    </label>
                    <input
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="เช่น ระเบียบการยืม-คืนหนังสือ ชมรมมุสลิม มฟล."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-neutral-900 dark:focus:border-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Title (English - Optional)
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
                      <span>กำหนดเวลาสิ้นสุดการแสดงผล (Schedule Expiry)</span>
                    </label>
                    {formData.expiresAt && (
                      <button
                        type="button"
                        onClick={() => applyExpiryPreset(null)}
                        className="text-[10px] text-neutral-400 hover:text-neutral-700 underline cursor-pointer"
                      >
                        ล้างวันหมดอายุ
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
                    <span className="text-[11px] text-neutral-400">ตั้งด่วน:</span>
                    <button
                      type="button"
                      onClick={() => applyExpiryPreset(3)}
                      className="text-[11px] px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 cursor-pointer"
                    >
                      +3 วัน
                    </button>
                    <button
                      type="button"
                      onClick={() => applyExpiryPreset(7)}
                      className="text-[11px] px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 cursor-pointer"
                    >
                      +7 วัน
                    </button>
                    <button
                      type="button"
                      onClick={() => applyExpiryPreset(14)}
                      className="text-[11px] px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 cursor-pointer"
                    >
                      +14 วัน
                    </button>
                    <button
                      type="button"
                      onClick={() => applyExpiryPreset(30)}
                      className="text-[11px] px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 cursor-pointer"
                    >
                      +1 เดือน
                    </button>
                  </div>
                </div>

                {/* 6. Image Upload & Presets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <ImageIcon size={14} />
                      <span>รูปภาพแบนเนอร์ / ภาพประกอบ</span>
                    </label>
                    {formData.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: '' })}
                        className="text-[11px] text-rose-500 hover:text-rose-600 font-medium underline cursor-pointer"
                      >
                        ลบภาพ
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
                          <span>เปลี่ยนรูป</span>
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
                          ลบรูป
                        </button>
                      </div>
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white gap-2">
                          <Loader2 size={18} className="animate-spin" />
                          <span className="text-xs font-medium">กำลังอัปโหลด...</span>
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
                        {uploadingImage ? 'กำลังอัปโหลดรูปภาพ...' : 'คลิกเพื่อเลือกรูปภาพจากเครื่อง'}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        รองรับ JPG, PNG, WebP (สูงสุด 10 MB)
                      </p>
                    </label>
                  )}

                  {/* Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[11px] text-neutral-400">หรือเลือกภาพสำเร็จรูป:</span>
                    {PRESET_IMAGES.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: preset.url })}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          formData.imageUrl === preset.url
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 7. Body text (TH & EN) */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        เนื้อหาประกาศ (ภาษาไทย) *
                      </label>
                      <span className="text-[10px] text-neutral-400">
                        ใส่ 1. 2. 3. เพื่อสร้างรายการกฎระเบียบ
                      </span>
                    </div>
                    <textarea
                      required
                      rows={4}
                      value={formData.body}
                      onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                      placeholder={'1. สมาชิกสามารถยืมหนังสือได้ครั้งละ 1 เล่ม\n2. กรุณาส่งคืนหนังสือตรงตามกำหนด\n3. แนบรูปถ่ายหน้าปก ณ จุดคืนหนังสือ'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-neutral-900 dark:focus:border-white transition-colors resize-y leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Body Content (English - Optional)
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
                <div className="space-y-2 p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
                    <span>ปุ่มดำเนินการ (Call To Action - Optional)</span>
                    <span className="text-[10px] font-normal text-neutral-400">แสดงบนการ์ดและป๊อปอัป</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="ข้อความปุ่ม เช่น ยืมหนังสือเลย"
                      value={formData.ctaText}
                      onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                      className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white outline-none"
                    />
                    <input
                      type="text"
                      placeholder="ลิงก์ปลายทาง เช่น /books หรือ /my-borrows"
                      value={formData.ctaUrl}
                      onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                      className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                {/* 9. Publish Status Switch */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
                  <div>
                    <p className="text-xs font-bold text-neutral-900 dark:text-white">สถานะการแสดงผลทันที</p>
                    <p className="text-[11px] text-neutral-400">เปิดให้แสดงผลทันทีเมื่อกดบันทึก</p>
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
              <div className="lg:col-span-6 bg-neutral-100/70 dark:bg-neutral-950 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto min-h-0 border-t lg:border-t-0 border-neutral-200 dark:border-neutral-800">
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
                        เป้าหมาย: <strong className="text-neutral-700 dark:text-neutral-200">{activeTargetObj.labelTh}</strong>
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
                                ? '⚠️ แจ้งเตือน'
                                : formData.type === 'success'
                                ? '✨ แนะนำ'
                                : '📢 ประชาสัมพันธ์'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/40 backdrop-blur-md border border-white/10 text-neutral-200">
                              {activeTargetObj.icon} {activeTargetObj.labelTh}
                            </span>
                            {formData.expiresAt && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-200 border border-amber-400/30">
                                สิ้นสุด {formData.expiresAt.replace('T', ' ')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle Content */}
                        <div className="relative z-10 my-auto py-3 space-y-1.5">
                          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-snug drop-shadow-sm">
                            {formData.title || 'พิมพ์หัวข้อประกาศของคุณที่ช่องซ้าย'}
                          </h3>
                          <p className="text-xs sm:text-sm text-neutral-200/90 leading-relaxed line-clamp-3">
                            {formData.body || 'เนื้อหาประกาศจะแสดงผลตรงนี้แบบเรียลไทม์...'}
                          </p>

                          {formData.ctaText && (
                            <div className="pt-2">
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white text-neutral-950 text-xs font-bold shadow-md">
                                <span>{formData.ctaText}</span>
                                <ChevronRight size={13} />
                              </span>
                            </div>
                          )}
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
                                  ? '⚠️ ข้อควรระวัง'
                                  : formData.type === 'success'
                                  ? '✨ ข่าวพิเศษ'
                                  : '📢 ประกาศสำคัญ'}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-md border border-white/20">
                                {activeTargetObj.icon} {activeTargetObj.labelTh}
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
                                {formData.type === 'warning' ? '⚠️ แจ้งเตือน' : '📢 ประกาศ'}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                                {activeTargetObj.icon} {activeTargetObj.labelTh}
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
                              {formData.title || 'หัวข้อประกาศจำลอง'}
                            </h3>
                            <p className="text-[11px] text-neutral-400 mt-0.5">
                              MFU Muslim Club Library • ระบบยืม-คืนหนังสือ
                            </p>
                          </div>

                          {/* Render numbered items if format detected */}
                          {formData.body.split('\n').filter(Boolean).length > 0 ? (
                            <div className="space-y-1.5 text-xs text-neutral-700 dark:text-neutral-300">
                              {formData.body
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
                              ยังไม่ได้พิมพ์เนื้อหาประกาศ...
                            </p>
                          )}

                          {/* Simulated callout tip */}
                          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2 text-emerald-800 dark:text-emerald-300 text-[11px]">
                            <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                            <span>
                              {formData.target === 'overdue'
                                ? '⚠️ สำหรับผู้ที่มีหนังสือค้างส่ง โปรดนำหนังสือมาคืน ณ จุดคืนหนังสือโดยเร็ว'
                                : '💡 สมาชิกสามารถยืมหนังสือได้ครั้งละ 1 เล่ม นานสูงสุด 14 วัน'}
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
                            <span>ไม่ต้องแสดงวันนี้อีก</span>
                          </label>

                          <button
                            type="button"
                            className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-bold shadow-sm cursor-pointer"
                          >
                            {formData.ctaText || 'รับทราบและเข้าใจ'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer Controls */}
                <div className="pt-4 border-t border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0">
                  <span className="text-[11px] text-neutral-400 hidden sm:inline">
                    * ข้อมูลจะถูกบันทึกและแสดงผลทันทีตามเงื่อนไขที่กำหนด
                  </span>
                  <div className="flex items-center gap-2.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      form="announcement-form"
                      disabled={saving}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 transition-all active:scale-95 disabled:opacity-50 shadow-sm cursor-pointer"
                    >
                      {saving ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'ยืนยันสร้างประกาศ'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}