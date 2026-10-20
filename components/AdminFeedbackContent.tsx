'use client'

import { useState, useMemo } from 'react'
import { useApp } from '@/lib/app-context'
import { format } from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import {
  Star,
  MessageSquare,
  Users,
  BarChart3,
  PieChart,
  ThumbsUp,
  Sparkles,
  Filter,
  CheckCircle2,
  BookOpen,
  Laptop,
  HeartHandshake,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'

interface FeedbackItem {
  id: string
  rating: number
  message: string
  category: 'general' | 'book_request' | 'system' | 'service' | string
  is_read?: boolean
  created_at: string
  profiles?: any
}

interface Props {
  feedback: FeedbackItem[]
}

export default function AdminFeedbackContent({ feedback: initialFeedback }: Props) {
  const [feedbacks] = useState<FeedbackItem[]>(initialFeedback || [])
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all')
  const { locale, t } = useApp()
  const dateLocale = locale === 'th' ? th : enUS

  const catMeta: Record<
    string,
    { label: string; icon: any; color: string; ringColor: string; bgSoft: string; textColor: string; stroke: string }
  > = {
    general: {
      label: t('feedbackGeneral'),
      icon: MessageSquare,
      color: '#3b82f6', // blue-500
      ringColor: 'ring-blue-500',
      bgSoft: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60',
      textColor: 'text-blue-700 dark:text-blue-300',
      stroke: 'stroke-blue-500',
    },
    book_request: {
      label: t('feedbackBookRequest'),
      icon: BookOpen,
      color: '#8b5cf6', // purple-500
      ringColor: 'ring-purple-500',
      bgSoft: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/60',
      textColor: 'text-purple-700 dark:text-purple-300',
      stroke: 'stroke-purple-500',
    },
    system: {
      label: t('feedbackSystem'),
      icon: Laptop,
      color: '#10b981', // emerald-500
      ringColor: 'ring-emerald-500',
      bgSoft: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60',
      textColor: 'text-emerald-700 dark:text-emerald-300',
      stroke: 'stroke-emerald-500',
    },
    service: {
      label: t('feedbackService'),
      icon: HeartHandshake,
      color: '#f59e0b', // amber-500
      ringColor: 'ring-amber-500',
      bgSoft: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60',
      textColor: 'text-amber-700 dark:text-amber-300',
      stroke: 'stroke-amber-500',
    },
  }

  // 1. Overall Average Rating
  const avgRatingNum = feedbacks.length
    ? feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length
    : 0
  const avgRating = feedbacks.length ? avgRatingNum.toFixed(1) : '0.0'

  // Rating qualitative sentiment
  const getSentimentText = (score: number) => {
    if (score >= 4.5) return locale === 'th' ? 'ยอดเยี่ยมมาก' : 'Exceptional'
    if (score >= 4.0) return locale === 'th' ? 'ดีมาก' : 'Very Good'
    if (score >= 3.0) return locale === 'th' ? 'ปานกลาง' : 'Moderate'
    if (score > 0) return locale === 'th' ? 'ต้องปรับปรุง' : 'Needs Work'
    return '—'
  }

  // 2. Rating Breakdown (5 to 1 Stars)
  const ratingCounts = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    for (const f of feedbacks) {
      if (f.rating >= 1 && f.rating <= 5) {
        counts[f.rating] = (counts[f.rating] || 0) + 1
      }
    }
    return counts
  }, [feedbacks])

  // 3. Category Breakdown
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      general: 0,
      book_request: 0,
      system: 0,
      service: 0,
    }
    for (const f of feedbacks) {
      const cat = f.category || 'general'
      counts[cat] = (counts[cat] || 0) + 1
    }
    return counts
  }, [feedbacks])

  // 4. Positive Satisfaction Rate (>= 4 stars)
  const positiveRate = useMemo(() => {
    if (!feedbacks.length) return 0
    const count = feedbacks.filter((f) => f.rating >= 4).length
    return Math.round((count / feedbacks.length) * 100)
  }, [feedbacks])

  // 5. Top Category
  const topCategory = useMemo(() => {
    let top = 'general'
    let max = -1
    for (const [cat, count] of Object.entries(categoryCounts)) {
      if (count > max) {
        max = count
        top = cat
      }
    }
    return {
      category: top,
      count: max > 0 ? max : 0,
      label: catMeta[top]?.label || top,
    }
  }, [categoryCounts, catMeta])

  // 6. Filtered Feedback List
  const filtered = useMemo(() => {
    return feedbacks.filter((f) => {
      const matchCat = categoryFilter === 'all' || f.category === categoryFilter
      const matchRating = ratingFilter === 'all' || f.rating === ratingFilter
      return matchCat && matchRating
    })
  }, [feedbacks, categoryFilter, ratingFilter])

  // Donut Chart Segment Calculations
  const totalCount = feedbacks.length
  const donutSegments = useMemo(() => {
    if (totalCount === 0) return []
    const circumference = 2 * Math.PI * 46 // radius = 46 -> 289.026
    let accumulated = 0

    return Object.entries(categoryCounts).map(([catKey, count]) => {
      const percent = count / totalCount
      const dashLength = percent * circumference
      const offset = -accumulated
      accumulated += dashLength

      return {
        key: catKey,
        count,
        percent: Math.round(percent * 100),
        dasharray: `${dashLength} ${circumference}`,
        dashoffset: offset,
        color: catMeta[catKey]?.color || '#a3a3a3',
        label: catMeta[catKey]?.label || catKey,
      }
    })
  }, [categoryCounts, totalCount, catMeta])

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* ────────────────── TOP PAGE HEADER ────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {t('adminFeedbackHeading')}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
              <ShieldCheck size={12} className="text-emerald-500" />
              <span>{locale === 'th' ? 'เก็บบันทึกถาวร' : 'Audit Log'}</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {locale === 'th'
              ? 'สรุปภาพรวมความคิดเห็นและการประเมินความพึงพอใจเพื่อพัฒนาคุณภาพห้องสมุด'
              : 'User satisfaction analytics and feedback summary for continuous improvement'}
          </p>
        </div>

        {/* Audit Note */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400">
          <ShieldCheck size={14} className="text-neutral-400" />
          <span className="text-[11px]">
            {locale === 'th' ? 'ข้อเสนอแนะถูกบันทึกถาวร ไม่สามารถลบได้' : 'Feedback cannot be deleted'}
          </span>
        </div>
      </div>

      {/* ────────────────── KPI METRIC SUMMARY CARDS (4 COLUMNS) ────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Average Rating */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              {t('avgRatingScore')}
            </span>
            <span className="p-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 border border-amber-200/60 dark:border-amber-900/40">
              <Star size={16} className="fill-amber-400 text-amber-400" />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">
                {avgRating}
              </span>
              <span className="text-xs text-neutral-400 font-semibold">/ 5.0</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={11}
                    className={
                      s <= Math.round(avgRatingNum)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-neutral-200 dark:text-neutral-700'
                    }
                  />
                ))}
              </div>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                {getSentimentText(avgRatingNum)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Feedback */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              {locale === 'th' ? 'ความคิดเห็นทั้งหมด' : 'Total Feedback'}
            </span>
            <span className="p-2 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 border border-blue-200/60 dark:border-blue-900/40">
              <MessageSquare size={16} />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">
              {totalCount}
            </span>
            <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1">
              <Users size={12} />
              <span>{locale === 'th' ? 'จากสมาชิกและผู้ใช้บริการ' : 'From library patrons'}</span>
            </p>
          </div>
        </div>

        {/* Card 3: Positive Sentiment */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              {locale === 'th' ? 'ความพึงพอใจเชิงบวก' : 'Positive Sentiment'}
            </span>
            <span className="p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 border border-emerald-200/60 dark:border-emerald-900/40">
              <ThumbsUp size={16} />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {positiveRate}%
              </span>
              <span className="text-xs text-neutral-400 font-medium">
                ({ratingCounts[5] + ratingCounts[4]}/{totalCount || 0})
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1">
              <TrendingUp size={12} className="text-emerald-500" />
              <span>{locale === 'th' ? 'ได้คะแนน 4-5 ดาว' : 'Rated 4 to 5 stars'}</span>
            </p>
          </div>
        </div>

        {/* Card 4: Top Category */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              {locale === 'th' ? 'หมวดที่มีข้อคิดเห็นสูงสุด' : 'Top Category'}
            </span>
            <span className="p-2 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-500 border border-purple-200/60 dark:border-purple-900/40">
              <Sparkles size={16} />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-lg sm:text-xl font-extrabold text-neutral-900 dark:text-white truncate block">
              {topCategory.label}
            </span>
            <p className="text-[11px] text-neutral-400 mt-1">
              {topCategory.count} {t('commentsCount')} (
              {totalCount > 0 ? Math.round((topCategory.count / totalCount) * 100) : 0}%)
            </p>
          </div>
        </div>
      </div>

      {/* ────────────────── INTERACTIVE CHART SUMMARY GRID ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CHART 1: Star Rating Distribution (7 Cols) */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                <BarChart3 size={17} />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white">
                  {locale === 'th' ? 'การกระจายคะแนนดาว (Rating Breakdown)' : 'Rating Distribution'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {locale === 'th'
                    ? 'คลิกที่แท่งคะแนนเพื่อกรองดูเฉพาะคะแนนนั้น'
                    : 'Click any star row to filter comments'}
                </p>
              </div>
            </div>

            {ratingFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setRatingFilter('all')}
                className="text-xs font-semibold text-neutral-500 hover:text-black dark:hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>{locale === 'th' ? 'ล้างตัวกรอง' : 'Reset'}</span>
              </button>
            )}
          </div>

          {/* Star Distribution Bars */}
          <div className="space-y-2.5 pt-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingCounts[star] || 0
              const percent = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
              const isSelected = ratingFilter === star

              // Gradient by star
              const barColors: Record<number, string> = {
                5: 'bg-emerald-500',
                4: 'bg-teal-500',
                3: 'bg-amber-500',
                2: 'bg-orange-500',
                1: 'bg-rose-500',
              }

              return (
                <div
                  key={star}
                  onClick={() => setRatingFilter(ratingFilter === star ? 'all' : star)}
                  className={`group flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-100 dark:bg-neutral-800/80 ring-2 ring-neutral-900 dark:ring-white'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                  }`}
                  title={locale === 'th' ? `กรองดู ${star} ดาว` : `Filter ${star} stars`}
                >
                  {/* Star Label */}
                  <div className="flex items-center gap-1 w-14 shrink-0 font-bold text-xs text-neutral-700 dark:text-neutral-300">
                    <span>{star}</span>
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                  </div>

                  {/* Horizontal Bar Track */}
                  <div className="flex-1 h-3 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${barColors[star]}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {/* Value & Percentage */}
                  <div className="w-16 text-right shrink-0">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      {count}
                    </span>
                    <span className="text-[11px] text-neutral-400 ml-1">({percent}%)</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CHART 2: Category Breakdown Donut & Badges (5 Cols) */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                <PieChart size={17} />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white">
                  {locale === 'th' ? 'สัดส่วนตามหมวดหมู่' : 'Category Share'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {locale === 'th' ? 'จำแนกตามประเภทความคิดเห็น' : 'Distribution by category'}
                </p>
              </div>
            </div>

            {categoryFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className="text-xs font-semibold text-neutral-500 hover:text-black dark:hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>{locale === 'th' ? 'ล้าง' : 'Clear'}</span>
              </button>
            )}
          </div>

          {/* Donut Chart Visual & Interactive Legend */}
          <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
            {/* SVG Donut */}
            <div className="relative w-32 h-32 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                {/* Background track circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="currentColor"
                  className="text-neutral-100 dark:text-neutral-800"
                  strokeWidth="16"
                />

                {/* Slices */}
                {donutSegments.map((seg) => (
                  <circle
                    key={seg.key}
                    cx="60"
                    cy="60"
                    r="46"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="16"
                    strokeDasharray={seg.dasharray}
                    strokeDashoffset={seg.dashoffset}
                    className="transition-all duration-700 ease-out"
                  />
                ))}
              </svg>

              {/* Center Counter */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-extrabold text-neutral-900 dark:text-white">
                  {totalCount}
                </span>
                <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
                  {locale === 'th' ? 'รายการ' : 'Total'}
                </span>
              </div>
            </div>

            {/* Interactive Category Legend Grid */}
            <div className="grid grid-cols-2 gap-2 w-full">
              {Object.entries(categoryCounts).map(([catKey, count]) => {
                const meta = catMeta[catKey] || catMeta.general
                const percent = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
                const isSelected = categoryFilter === catKey

                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setCategoryFilter(categoryFilter === catKey ? 'all' : catKey)}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? `${meta.bgSoft} ring-2 ${meta.ringColor} shadow-xs`
                        : 'bg-neutral-50/60 dark:bg-neutral-850 border-neutral-200/70 dark:border-neutral-800 hover:border-neutral-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                      <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between mt-1.5">
                      <span className="text-sm font-extrabold text-neutral-900 dark:text-white">
                        {count}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-semibold">{percent}%</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────── FILTER BAR & FEEDBACK COUNT ────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-neutral-500 flex items-center gap-1 mr-1">
            <Filter size={13} />
            <span>{locale === 'th' ? 'หมวดหมู่:' : 'Category:'}</span>
          </span>

          {['all', 'general', 'book_request', 'system', 'service'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
              }`}
            >
              {cat === 'all' ? t('filterAll') : catMeta[cat]?.label || cat}
            </button>
          ))}
        </div>

        {/* Active Filters / Reset */}
        {(categoryFilter !== 'all' || ratingFilter !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('all')
              setRatingFilter('all')
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw size={12} />
            <span>{locale === 'th' ? 'ล้างตัวกรองทั้งหมด' : 'Reset all filters'}</span>
          </button>
        )}
      </div>

      {/* ────────────────── FEEDBACK COMMENTS STREAM (NO DELETE) ────────────────── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-neutral-50/50 dark:bg-neutral-900/30 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800 text-neutral-400 space-y-2">
            <MessageSquare size={38} className="mx-auto opacity-30" />
            <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
              {t('noFeedbackFound')}
            </p>
            <p className="text-xs text-neutral-400">
              {locale === 'th'
                ? 'ลองปรับตัวกรองหมวดหมู่หรือระดับคะแนนดาว'
                : 'Try adjusting your category or star rating filters'}
            </p>
          </div>
        ) : (
          filtered.map((fb) => {
            const meta = catMeta[fb.category] || catMeta.general
            const userProfile = Array.isArray(fb.profiles) ? fb.profiles[0] : fb.profiles

            return (
              <div
                key={fb.id}
                className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/90 dark:border-neutral-800 p-5 sm:p-6 shadow-xs transition-all hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                <div className="flex items-start gap-4">
                  {/* User Avatar */}
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0 flex items-center justify-center">
                    {userProfile?.avatar_url ? (
                      <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users size={18} className="text-neutral-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Top Row: User + Category Badge + Date (NO DELETE BUTTON) */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-neutral-900 dark:text-white text-sm">
                          {userProfile?.full_name || (locale === 'th' ? 'สมาชิกผู้ใช้บริการ' : 'Library Member')}
                        </p>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${meta.bgSoft} ${meta.textColor}`}
                        >
                          {meta.label}
                        </span>
                      </div>

                      <span className="text-xs text-neutral-400 font-medium">
                        {format(new Date(fb.created_at), 'dd MMM yyyy, HH:mm', { locale: dateLocale })}
                      </span>
                    </div>

                    {/* Star Rating Display */}
                    <div className="flex items-center gap-1.5 mt-1.5 mb-2.5">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            className={
                              s <= fb.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-neutral-200 dark:text-neutral-700'
                            }
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        {fb.rating}.0 / 5.0
                      </span>
                    </div>

                    {/* Feedback Message */}
                    <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line break-words font-normal">
                      {fb.message}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
