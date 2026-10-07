'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  AlertCircle
} from 'lucide-react'
import { useApp } from '@/lib/app-context'
import {
  AnnouncementItem,
  extractAnnouncementImage,
  cleanAnnouncementBody,
  extractAnnouncementPopup
} from './AnnouncementCarousel'

interface AnnouncementPopupModalProps {
  isOpen: boolean
  onClose: () => void
  announcement: AnnouncementItem | null
  isAdmin?: boolean
  onEdit?: (ann: AnnouncementItem) => void
  onDelete?: (ann: AnnouncementItem) => void
  onTogglePopup?: (ann: AnnouncementItem, current: boolean) => void
}

export default function AnnouncementPopupModal({
  isOpen,
  onClose,
  announcement,
  isAdmin = false,
  onEdit,
  onDelete,
  onTogglePopup
}: AnnouncementPopupModalProps) {
  const { locale, t } = useApp()
  const [mounted, setMounted] = useState(false)
  const [dontShowToday, setDontShowToday] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock background scroll when open
  useEffect(() => {
    if (!isOpen) return

    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!mounted || !isOpen || !announcement) return null

  const isThai = locale === 'th'
  const title = isThai ? announcement.title : (announcement.title_en || announcement.title)
  const rawBody = isThai ? announcement.body : (announcement.body_en || announcement.body)
  const bodyText = cleanAnnouncementBody(rawBody)
  const imageUrl = extractAnnouncementImage(announcement, 0)
  const isPopup = extractAnnouncementPopup(announcement)

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

  const currentType = announcement.type || 'info'
  const style = typeStyles[currentType] || typeStyles.info

  return createPortal(
    <div
      className="fixed inset-0 w-screen h-[100dvh] z-[9999] bg-black/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-[calc(100vw-24px)] sm:w-[min(560px,calc(100vw-32px))] md:w-[min(620px,calc(100vw-48px))] max-h-[calc(100dvh-32px)] bg-white dark:bg-[#161619] rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden animate-scale-in">
        
        {/* Banner Image (if available) */}
        {imageUrl ? (
          <div className="relative w-full h-44 sm:h-52 overflow-hidden bg-neutral-900 shrink-0">
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-black/40 dark:from-[#161619] dark:via-[#161619]/30 dark:to-black/50" />
            
            {/* Top Close Button on Image */}
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-colors z-20 cursor-pointer"
              title={t('close')}
            >
              <X size={18} />
            </button>

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
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title={t('close')}
            >
              <X size={18} />
            </button>
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
                ? '💡 ยืมได้สูงสุด 1 เล่ม นาน 14 วัน กรุณาถ่ายภาพหน้าปกหนังสือ ณ จุดคืนเพื่อเป็นหลักฐานการส่งคืนที่สมบูรณ์'
                : '💡 Borrow up to 1 book for 14 days. Please take a photo of the book at the return shelf as proof.'}
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
                    ID: {announcement.id.slice(0, 8)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onEdit(announcement)
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:border-black dark:hover:border-white transition-all shadow-xs cursor-pointer"
                    >
                      <Pencil size={13} />
                      <span>{t('editAnnouncement')}</span>
                    </button>
                  )}

                  {onTogglePopup && (
                    <button
                      type="button"
                      onClick={() => onTogglePopup(announcement, isPopup)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:border-black dark:hover:border-white transition-all shadow-xs cursor-pointer"
                    >
                      {isPopup ? <EyeOff size={13} /> : <Eye size={13} />}
                      <span>{isPopup ? t('togglePopupOff') : t('togglePopupOn')}</span>
                    </button>
                  )}

                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onDelete(announcement)
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

          <button
            type="button"
            onClick={handleAccept}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 order-1 sm:order-2 cursor-pointer"
          >
            <Check size={16} />
            <span>{t('acceptRules')}</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  )
}
