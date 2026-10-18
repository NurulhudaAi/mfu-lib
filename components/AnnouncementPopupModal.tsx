'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  X,
  BookOpen,
  CheckCircle2,
  ShieldAlert,
  Info,
  Sparkles,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Check,
  Megaphone,
  AlertCircle,
  Loader2,
  RotateCcw,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react'
import { useApp } from '@/lib/app-context'
import {
  AnnouncementItem,
  extractAnnouncementImage,
  cleanAnnouncementBody,
  extractAnnouncementPopup,
  extractAnnouncementCta,
} from './AnnouncementCarousel'

interface AnnouncementPopupModalProps {
  isOpen: boolean
  onClose: () => void
  announcement: AnnouncementItem | null
  isAdmin?: boolean
  onEdit?: (ann: AnnouncementItem) => void
  onDelete?: (ann: AnnouncementItem) => void
  onTogglePopup?: (ann: AnnouncementItem, current: boolean) => void
  onSaved?: (updated: AnnouncementItem) => void
}

export default function AnnouncementPopupModal({
  isOpen,
  onClose,
  announcement,
  isAdmin = false,
  onEdit,
  onDelete,
  onTogglePopup,
  onSaved
}: AnnouncementPopupModalProps) {
  const router = useRouter()
  const { locale, t, showAlert } = useApp()
  const [mounted, setMounted] = useState(false)
  const [dontShowToday, setDontShowToday] = useState(false)

  // Local state for current announcement to allow immediate in-place updates
  const [currentAnn, setCurrentAnn] = useState<AnnouncementItem | null>(announcement)

  // In-place edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editTitleEn, setEditTitleEn] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editBodyEn, setEditBodyEn] = useState('')
  const [editType, setEditType] = useState<'info' | 'warning' | 'success'>('warning')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setCurrentAnn(announcement)
    if (announcement) {
      setEditTitle(announcement.title || '')
      setEditTitleEn(announcement.title_en || '')
      setEditBody(cleanAnnouncementBody(announcement.body || ''))
      setEditBodyEn(cleanAnnouncementBody(announcement.body_en || ''))
      setEditType((announcement.type as any) || 'warning')
    }
  }, [announcement])

  // Lock background scroll when open
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false)
      return
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          setIsEditing(false)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isEditing, onClose])

  if (!mounted || !isOpen || !currentAnn) return null

  const isThai = locale === 'th'
  const title = isThai ? currentAnn.title : (currentAnn.title_en || currentAnn.title)
  const rawBody = isThai ? currentAnn.body : (currentAnn.body_en || currentAnn.body)
  const bodyText = cleanAnnouncementBody(rawBody)
  const imageUrl = extractAnnouncementImage(currentAnn, 0)
  const isPopup = extractAnnouncementPopup(currentAnn)
  const cta = extractAnnouncementCta(currentAnn)

  // Parse lines to detect numbered rules or bullet points
  const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean)
  const hasNumberedRules = lines.some(l => /^\d+[\.\)]\s+/.test(l))

  function handleAccept() {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mfu_lib_rules_popup_seen', 'true')
      if (dontShowToday) {
        const expiry = Date.now() + 24 * 60 * 60 * 1000
        localStorage.setItem('mfu_lib_rules_popup_dismissed_until', String(expiry))
      }
    }
    onClose()
  }

  function startEditing() {
    setEditTitle(currentAnn?.title || '')
    setEditTitleEn(currentAnn?.title_en || '')
    setEditBody(cleanAnnouncementBody(currentAnn?.body || ''))
    setEditBodyEn(cleanAnnouncementBody(currentAnn?.body_en || ''))
    setEditType((currentAnn?.type as any) || 'warning')
    setIsEditing(true)
  }

  async function handleSaveRules(e: React.FormEvent) {
    e.preventDefault()
    if (!editTitle.trim() || !editBody.trim()) {
      showAlert({
        type: 'warning',
        title: isThai ? 'ข้อมูลไม่ครบถ้วน' : 'Missing Information',
        message: isThai ? 'กรุณาระบุหัวข้อและเนื้อหากฎระเบียบ' : 'Please provide both title and rules body'
      })
      return
    }

    setIsSaving(true)
    const finalBody = editBody.trim() + '\n\n[popup: true]'
    const finalBodyEn = editBodyEn.trim() ? editBodyEn.trim() + '\n\n[popup: true]' : null

    const payload = {
      title: editTitle.trim(),
      title_en: editTitleEn.trim() || null,
      body: finalBody,
      body_en: finalBodyEn,
      type: editType,
      is_active: true,
    }

    try {
      let savedData: AnnouncementItem | null = null

      if (currentAnn && currentAnn.id && !currentAnn.id.startsWith('default-')) {
        // Update existing record in Supabase
        const res = await fetch(`/api/admin/announcements/${currentAnn.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to update')
        savedData = data.data
      } else {
        // Create new record for default fallback
        const res = await fetch('/api/admin/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to save')
        savedData = data.data
      }

      if (savedData) {
        setCurrentAnn(savedData)
        if (onSaved) onSaved(savedData)
      } else {
        setCurrentAnn({
          ...currentAnn!,
          ...payload,
        })
      }

      setIsEditing(false)
      showAlert({
        type: 'success',
        title: isThai ? 'บันทึกสำเร็จ' : 'Saved Successfully',
        message: isThai ? 'อัปเดตกฎการยืม-คืนหนังสือเรียบร้อยแล้ว' : 'Borrowing rules have been updated'
      })
      router.refresh()
    } catch (err: any) {
      showAlert({
        type: 'error',
        title: isThai ? 'เกิดข้อผิดพลาด' : 'Error',
        message: err.message || (isThai ? 'บันทึกไม่สำเร็จ' : 'Failed to save changes')
      })
    } finally {
      setIsSaving(false)
    }
  }

  const typeStyles = {
    info: {
      badgeBg: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700',
      icon: <Info size={14} className="text-neutral-600 dark:text-neutral-400" />
    },
    warning: {
      badgeBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      icon: <AlertCircle size={14} className="text-amber-500" />
    },
    success: {
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      icon: <CheckCircle2 size={14} className="text-emerald-500" />
    }
  }

  const currentType = currentAnn.type || 'info'
  const style = typeStyles[currentType] || typeStyles.info

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/60 dark:bg-black/75 flex items-center justify-center p-3 sm:p-5 animate-modal-fade overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (!isEditing) onClose()
        }
      }}
    >
      <div 
        className="w-[calc(100vw-24px)] sm:w-[min(580px,calc(100vw-32px))] md:w-[min(640px,calc(100vw-48px))] max-h-[calc(100dvh-32px)] bg-white dark:bg-[#161619] rounded-3xl shadow-2xl border border-neutral-200/90 dark:border-neutral-800 flex flex-col overflow-hidden animate-modal-pop relative [isolation:isolate]"
        style={{ transform: 'translate3d(0, 0, 0)' }}
      >
        
        {/* Top Header Bar with Close Button */}
        <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5">
          {isAdmin && !isEditing && (
            <button
              type="button"
              onClick={startEditing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-neutral-800/90 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 shadow-sm backdrop-blur-md transition-all active:scale-95 cursor-pointer"
              title={isThai ? 'แก้ไขกฎระเบียบ' : 'Edit Rules'}
            >
              <Pencil size={12} />
              <span>{isThai ? 'แก้ไขกฎ' : 'Edit'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-neutral-800 dark:text-neutral-200 flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
            title={isThai ? 'ปิด' : 'Close'}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── EDIT MODE VIEW ── */}
        {isEditing ? (
          <form onSubmit={handleSaveRules} className="flex flex-col max-h-[calc(100dvh-32px)]">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80 shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                <Pencil size={13} />
                <span>{isThai ? 'โหมดแก้ไขกฎระเบียบ (Admin Mode)' : 'Edit Rules (Admin Mode)'}</span>
              </div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isThai ? 'แก้ไขกฎระเบียบการยืม-คืนหนังสือ' : 'Edit Library Borrowing Rules'}
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isThai ? 'เมื่อบันทึกแล้ว กฎระเบียบนี้จะอัปเดตให้สมาชิกทุกคนทันที' : 'Updated rules will be published immediately'}
              </p>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  {isThai ? 'หัวข้อกฎระเบียบ (ภาษาไทย)' : 'Title (Thai)'} *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  {isThai ? 'หัวข้อกฎระเบียบ (English - ไม่บังคับ)' : 'Title (English - Optional)'}
                </label>
                <input
                  type="text"
                  value={editTitleEn}
                  onChange={(e) => setEditTitleEn(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    {isThai ? 'รายการกฎระเบียบ (ภาษาไทย)' : 'Rules Breakdown (Thai)'} *
                  </label>
                  <span className="text-[11px] text-neutral-400">
                    {isThai ? 'ใส่ 1. 2. 3. ขึ้นบรรทัดใหม่' : 'Prefix lines with 1. 2. 3.'}
                  </span>
                </div>
                <textarea
                  rows={6}
                  required
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  placeholder="1. สมาชิกสามารถยืมหนังสือได้ครั้งละ 1 เล่ม นานสูงสุด 14 วัน&#10;2. กรุณาส่งคืนหนังสือให้ตรงตามเวลาที่กำหนด..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors font-mono leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  {isThai ? 'รายการกฎระเบียบ (English - ไม่บังคับ)' : 'Rules Breakdown (English - Optional)'}
                </label>
                <textarea
                  rows={4}
                  value={editBodyEn}
                  onChange={(e) => setEditBodyEn(e.target.value)}
                  placeholder="1. Members can borrow 1 book at a time for up to 14 days.&#10;2. Please return books on time..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors font-mono leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  {isThai ? 'รูปแบบการเตือน (Badge Style)' : 'Display Style'}
                </label>
                <div className="flex gap-2">
                  {(['warning', 'info', 'success'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditType(t)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all capitalize ${
                        editType === t
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-transparent shadow-xs'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/60 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsEditing(false)}
                className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                {isThai ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-bold transition-all shadow-md disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                <span>{isThai ? 'บันทึกกฎระเบียบ' : 'Save Rules'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* ── VIEW MODE ── */
          <>
            {/* Banner Image (if available) */}
            {imageUrl ? (
              <div className="relative w-full h-44 sm:h-52 overflow-hidden bg-neutral-900 shrink-0 rounded-t-3xl">
                <img
                  src={imageUrl}
                  alt=""
                  className="w-full h-full object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent dark:from-[#161619] dark:via-[#161619]/20 dark:to-transparent" />

                {/* Floating Badge */}
                <div className="absolute top-3.5 left-3.5 z-20 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md bg-white/90 dark:bg-black/80 ${style.badgeBg}`}>
                    {style.icon}
                    <span>{t('popupBadge')}</span>
                  </span>
                  {isPopup && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-900/90 text-white dark:bg-white/90 dark:text-black shadow-xs">
                      <Sparkles size={11} />
                      <span>Popup</span>
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-5 sm:p-6 pb-0 flex items-start justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${style.badgeBg}`}>
                    {style.icon}
                    <span>{t('popupBadge')}</span>
                  </span>
                  {isPopup && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-900 text-white dark:bg-white dark:text-black">
                      <Sparkles size={11} />
                      <span>Popup</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Scrollable Content Body */}
            <div className="p-5 sm:p-7 overflow-y-auto min-h-0 flex-1 space-y-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-snug">
                  {title}
                </h2>
                <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5">
                  <span>MFU Muslim Club Library</span>
                  <span>•</span>
                  <span>{isThai ? 'ระเบียบการใช้งานห้องสมุด' : 'Library Guidelines'}</span>
                </p>
              </div>

              {/* Formatted Content / Rules Breakdown */}
              {hasNumberedRules ? (
                <div className="space-y-2.5 pt-1">
                  {lines.map((line, idx) => {
                    const matchNumber = line.match(/^(\d+)[\.\)]\s+(.*)/)
                    if (matchNumber) {
                      const num = matchNumber[1]
                      const content = matchNumber[2]
                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800/70 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                        >
                          <div className="w-6 h-6 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                            {num}
                          </div>
                          <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 font-medium leading-relaxed">
                            {content}
                          </p>
                        </div>
                      )
                    }
                    return (
                      <p key={idx} className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
                        {line}
                      </p>
                    )
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800/70 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line font-medium">
                  {bodyText}
                </div>
              )}

              {/* Useful Library Tip Callout */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 flex items-start gap-3 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">
                  {isThai
                    ? 'ยืมได้สูงสุด 1 เล่ม นาน 14 วัน กรุณาถ่ายภาพหน้าปกหนังสือ ณ จุดคืนเพื่อเป็นหลักฐานการส่งคืนที่สมบูรณ์'
                    : 'Borrow up to 1 book for 14 days. Please take a photo of the book at the return shelf as proof.'}
                </p>
              </div>

              {/* Admin In-Place Operations Toolbar */}
              {isAdmin && (
                <div className="pt-2">
                  <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      <span className="flex items-center gap-1.5">
                        <Megaphone size={14} className="text-neutral-900 dark:text-white" />
                        <span>{isThai ? 'เครื่องมือสำหรับผู้ดูแล (Admin Controls)' : 'Admin Controls'}</span>
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        ID: {currentAnn.id?.slice(0, 8)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={startEditing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-bold hover:opacity-90 transition-all shadow-xs cursor-pointer"
                      >
                        <Pencil size={13} />
                        <span>{isThai ? 'แก้ไขกฎการยืม' : 'Edit Rules'}</span>
                      </button>

                      {onTogglePopup && (
                        <button
                          type="button"
                          onClick={() => onTogglePopup(currentAnn, isPopup)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:border-black dark:hover:border-white transition-all shadow-xs cursor-pointer"
                        >
                          {isPopup ? <EyeOff size={13} /> : <Eye size={13} />}
                          <span>{isPopup ? t('togglePopupOff') : t('togglePopupOn')}</span>
                        </button>
                      )}

                      {onDelete && !currentAnn.id?.startsWith('default-') && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose()
                            onDelete(currentAnn)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors ml-auto cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span>{t('deleteAnnouncement')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Dismiss Checkbox and Understood Button */}
            <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-neutral-600 dark:text-neutral-400 order-2 sm:order-1">
                <input
                  type="checkbox"
                  checked={dontShowToday}
                  onChange={(e) => setDontShowToday(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-0 cursor-pointer"
                />
                <span>{t('dontShowToday')}</span>
              </label>

              <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
                {cta && cta.text && (
                  <Link
                    href={cta.url || '#'}
                    target={cta.url?.startsWith('http') ? '_blank' : undefined}
                    rel={cta.url?.startsWith('http') ? 'noopener noreferrer' : undefined}
                    onClick={() => {
                      handleAccept()
                      onClose()
                    }}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <span>{cta.text}</span>
                    {cta.url?.startsWith('http') ? <ArrowUpRight size={14} /> : <ChevronRight size={14} />}
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleAccept}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Check size={16} />
                  <span>{t('acceptRules')}</span>
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>,
    document.body
  )
}

