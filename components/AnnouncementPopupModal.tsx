'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '@/lib/app-context'
import { format } from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import {
  X,
  BookOpen,
  Clock,
  Camera,
  ShieldAlert,
  ListOrdered,
  AlertTriangle,
  Megaphone,
  CheckCircle2,
  Calendar,
  Sparkles,
  Info,
  ShieldCheck,
  Check
} from 'lucide-react'
import { AnnouncementItem, cleanAnnouncementBody, extractAnnouncementImage } from './AnnouncementCarousel'

interface Props {
  announcements?: AnnouncementItem[]
  isOpen: boolean
  onClose: () => void
}

const STORAGE_KEY = 'mfu_lib_announcement_popup_dismissed_date'

export default function AnnouncementPopupModal({
  announcements = [],
  isOpen,
  onClose,
}: Props) {
  const { locale, t } = useApp()
  const dateLocale = locale === 'th' ? th : enUS

  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'rules' | 'announcements'>('rules')
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
      if (e.key === 'Escape') handleDismiss()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, dontShowToday])

  function handleDismiss() {
    if (dontShowToday) {
      const today = new Date().toISOString().slice(0, 10)
      try {
        localStorage.setItem(STORAGE_KEY, today)
      } catch (_) {}
    }
    onClose()
  }

  if (!mounted || !isOpen || typeof document === 'undefined') return null

  const rulesList = [
    {
      icon: BookOpen,
      iconColor: 'text-neutral-900 dark:text-white',
      bgColor: 'bg-neutral-100 dark:bg-neutral-800',
      title: t('rule1Title'),
      desc: t('rule1Desc'),
      highlight: locale === 'th' ? '1 เล่ม / คน' : '1 Book / Person',
    },
    {
      icon: Clock,
      iconColor: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
      title: t('rule2Title'),
      desc: t('rule2Desc'),
      highlight: locale === 'th' ? 'สูงสุด 14 วัน' : '14 Days Max',
    },
    {
      icon: Camera,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      title: t('rule3Title'),
      desc: t('rule3Desc'),
      highlight: locale === 'th' ? 'รูปหลักฐานการวางคืน' : 'Photo Proof Required',
    },
    {
      icon: ShieldAlert,
      iconColor: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40',
      title: t('rule4Title'),
      desc: t('rule4Desc'),
      highlight: locale === 'th' ? 'ห้ามชำรุด / สูญหาย' : 'Care & Anti-Damage',
    },
    {
      icon: ListOrdered,
      iconColor: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/40',
      title: t('rule5Title'),
      desc: t('rule5Desc'),
      highlight: locale === 'th' ? 'จองคิวออนไลน์ได้' : 'Online Queue',
    },
    {
      icon: AlertTriangle,
      iconColor: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/40',
      title: t('rule6Title'),
      desc: t('rule6Desc'),
      highlight: locale === 'th' ? 'ระงับการยืมชั่วคราว' : 'Overdue Restriction',
    },
  ]

  return createPortal(
    <div
      className="fixed inset-0 w-screen h-[100dvh] z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss()
      }}
    >
      <div className="w-[calc(100vw-20px)] sm:w-[min(680px,calc(100vw-32px))] max-h-[calc(100dvh-28px)] sm:max-h-[calc(100dvh-40px)] bg-white dark:bg-[#161619] rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden animate-scale-in">
        
        {/* ── Fixed Header ── */}
        <div className="p-5 sm:p-6 pb-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0 bg-white dark:bg-[#161619]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 flex items-center justify-center shrink-0 shadow-sm">
                <Megaphone size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                    <ShieldCheck size={11} className="text-emerald-500" />
                    MFU Muslim Club
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {format(new Date(), 'dd MMMM yyyy', { locale: dateLocale })}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-neutral-900 dark:text-white truncate mt-1">
                  {t('announcementPopupTitle')}
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                  {t('announcementPopupSubtitle')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-2 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab Switcher Pills */}
          <div className="flex items-center gap-1.5 p-1 mt-4 bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 w-full sm:w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'rules'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <BookOpen size={13} />
              <span>{t('tabLibraryRules')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('announcements')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'announcements'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Sparkles size={13} />
              <span>{t('tabAnnouncementsList')}</span>
              {announcements.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
                  {announcements.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-6 space-y-4">
          {activeTab === 'rules' ? (
            <div className="space-y-3.5">
              {/* Important Banner */}
              <div className="p-3.5 rounded-2xl bg-neutral-900 text-white dark:bg-neutral-800 dark:text-white flex items-start gap-3 shadow-xs">
                <Info size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-bold text-amber-300">
                    {locale === 'th' ? 'ข้อปฏิบัติสำคัญ: ' : 'Key Requirement: '}
                  </span>
                  {locale === 'th'
                    ? 'สมาชิกสามารถยืมหนังสือได้คนละ 1 เล่ม นาน 14 วัน และต้องถ่ายภาพคู่กับหนังสือเมื่อวางคืนที่ชั้นวาง เพื่อยืนยันความเรียบร้อยและรักษาบันทึกในระบบ'
                    : 'Members may borrow 1 book at a time for up to 14 days, and must provide photo proof when returning it to the club shelf.'}
                </div>
              </div>

              {/* 6 Grid Rules */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rulesList.map((rule, idx) => {
                  const Icon = rule.icon
                  return (
                    <div
                      key={idx}
                      className="p-3.5 sm:p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-2 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-xl ${rule.bgColor} flex items-center justify-center shrink-0`}>
                            <Icon size={16} className={rule.iconColor} />
                          </div>
                          <span className="text-xs font-bold text-neutral-900 dark:text-white">
                            {rule.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 shrink-0">
                          {rule.highlight}
                        </span>
                      </div>

                      <p className="text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {rule.desc}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Tab 2: Announcements List */
            <div className="space-y-3.5">
              {announcements.length === 0 ? (
                <div className="py-12 text-center text-neutral-400 space-y-2">
                  <Megaphone size={36} className="mx-auto opacity-25" />
                  <p className="text-sm font-medium">
                    {locale === 'th' ? 'ไม่มีประกาศเพิ่มเติมในขณะนี้' : 'No announcements at this time'}
                  </p>
                </div>
              ) : (
                announcements.map((ann, idx) => {
                  const image = extractAnnouncementImage(ann, idx)
                  const displayTitle = locale === 'th' ? ann.title : (ann.title_en || ann.title)
                  const displayBody = cleanAnnouncementBody(locale === 'th' ? ann.body : (ann.body_en || ann.body))

                  return (
                    <div
                      key={ann.id || idx}
                      className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-2.5"
                    >
                      {image && (
                        <div className="w-full h-36 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-700">
                          <img src={image} alt={displayTitle} className="w-full h-full object-cover" />
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-400">
                        <span className="inline-flex items-center gap-1 font-semibold text-neutral-700 dark:text-neutral-300">
                          <Calendar size={12} />
                          {ann.created_at ? format(new Date(ann.created_at), 'dd MMM yyyy', { locale: dateLocale }) : '—'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-neutral-200/70 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                          {ann.type || 'info'}
                        </span>
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white leading-snug">
                        {displayTitle}
                      </h4>

                      <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                        {displayBody}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* ── Fixed Footer ── */}
        <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-50/70 dark:bg-neutral-900/70">
          <label className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowToday}
              onChange={(e) => setDontShowToday(e.target.checked)}
              className="w-4 h-4 rounded-md accent-neutral-900 dark:accent-white cursor-pointer"
            />
            <span>{t('dontShowAgainToday')}</span>
          </label>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Check size={14} className="stroke-[3]" />
            <span>{t('acceptAndClose')}</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  )
}
