'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/lib/app-context'
import { format } from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import { ArrowLeft, Star, MessageSquare, Users } from 'lucide-react'

interface Props { feedback: any[] }

export default function AdminFeedbackContent({ feedback }: Props) {
  const [filter, setFilter] = useState('all')
  const { locale, t } = useApp()
  const dateLocale = locale === 'th' ? th : enUS

  const catLabels: Record<string, string> = {
    general: t('feedbackGeneral'),
    book_request: t('feedbackBookRequest'),
    system: t('feedbackSystem'),
    service: t('feedbackService')
  }

  const filtered = feedback.filter(f => filter === 'all' || f.category === filter)
  const avgRating = feedback.length
    ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1)
    : '—'

  return (
    <div className="w-full p-6 sm:p-8 lg:p-10 space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
          {t('adminFeedbackHeading')}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          {feedback.length} {t('commentsCount')} · {t('avgRatingScore')} {avgRating} / 5.0
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'general', 'book_request', 'system', 'service'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === cat
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-sm'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            {cat === 'all' ? t('filterAll') : catLabels[cat]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-neutral-50/50 dark:bg-neutral-900/30 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 text-neutral-400">
            <MessageSquare size={40} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm font-medium">{t('noFeedbackFound')}</p>
          </div>
        ) : filtered.map(fb => (
          <div key={fb.id} className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0 flex items-center justify-center">
                {fb.profiles?.avatar_url ? (
                  <img src={fb.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users size={16} className="text-neutral-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-neutral-900 dark:text-white text-sm">
                    {fb.profiles?.full_name || 'ไม่ระบุชื่อ'}
                  </p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                    {catLabels[fb.category] || fb.category}
                  </span>
                  <span className="ml-auto text-xs text-neutral-400">
                    {format(new Date(fb.created_at), 'dd MMM yy', { locale: dateLocale })}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1 mb-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star
                      key={s}
                      size={13}
                      className={s <= fb.rating ? 'fill-neutral-900 text-neutral-900 dark:fill-white dark:text-white' : 'text-neutral-200 dark:text-neutral-700'}
                    />
                  ))}
                  <span className="text-xs font-semibold text-neutral-500 ml-1">({fb.rating}/5)</span>
                </div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{fb.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
