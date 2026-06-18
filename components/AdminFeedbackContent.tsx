'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/lib/app-context'
import { format } from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import { ArrowLeft, Star, MessageSquare, Users } from 'lucide-react'

interface Props { feedback: any[] }

const catLabels: Record<string, string> = {
  general: 'ทั่วไป', book_request: 'ขอเพิ่มหนังสือ', system: 'ระบบ', service: 'บริการ'
}

export default function AdminFeedbackContent({ feedback }: Props) {
  const [filter, setFilter] = useState('all')
  const { locale } = useApp()
  const dateLocale = locale === 'th' ? th : enUS

  const filtered = feedback.filter(f => filter === 'all' || f.category === filter)
  const avgRating = feedback.length
    ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1)
    : '—'

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/dashboard" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Feedback</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{feedback.length} ความคิดเห็น · คะแนนเฉลี่ย {avgRating} ⭐</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['all', 'general', 'book_request', 'system', 'service'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === cat ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            {cat === 'all' ? 'ทั้งหมด' : catLabels[cat]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <MessageSquare size={40} className="mx-auto mb-2 opacity-20" />
            ยังไม่มี feedback
          </div>
        ) : filtered.map(fb => (
          <div key={fb.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 animate-slide-up">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                {fb.profiles?.avatar_url ? (
                  <img src={fb.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Users size={14} className="text-gray-400" /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {fb.profiles?.full_name || 'ไม่ระบุ'}
                  </p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    {catLabels[fb.category] || fb.category}
                  </span>
                  <span className="ml-auto text-xs text-gray-400">
                    {format(new Date(fb.created_at), 'dd MMM yy', { locale: dateLocale })}
                  </span>
                </div>
                <div className="flex mt-1 mb-2">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={13} className={s <= fb.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-gray-700'} />
                  ))}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{fb.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
