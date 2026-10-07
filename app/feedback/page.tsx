'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/app-context'
import { MessageSquare, Star, Send, CheckCircle2, Sparkles, BookPlus, Wrench, Headphones } from 'lucide-react'

function FeedbackContent() {
  const { t, locale, profile } = useApp()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [category, setCategory] = useState<'general' | 'book_request' | 'system' | 'service'>('general')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Pre-fill from query params if available (e.g. from book detail)
  useEffect(() => {
    const cat = searchParams.get('category')
    const title = searchParams.get('title')
    if (cat === 'book_request' || cat === 'system' || cat === 'service' || cat === 'general') {
      setCategory(cat)
    }
    if (title) {
      setMessage(`[หนังสือ: ${title}] `)
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || rating === 0) {
      alert(t('feedbackAlert') || 'กรุณาให้คะแนนและเขียนความคิดเห็น')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('feedback').insert({
      user_id: profile?.id ?? null,
      rating,
      category,
      message: message.trim(),
    })
    setLoading(false)

    if (error) {
      alert(t('error') || 'ส่งความคิดเห็นไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
      return
    }

    setSuccess(true)
  }

  const categoryOptions = [
    { value: 'general', label: t('feedbackGeneral') || 'ทั่วไป', icon: Sparkles },
    { value: 'book_request', label: t('feedbackBookRequest') || 'ขอเพิ่มหนังสือ', icon: BookPlus },
    { value: 'system', label: t('feedbackSystem') || 'ระบบ', icon: Wrench },
    { value: 'service', label: t('feedbackService') || 'บริการ', icon: Headphones },
  ] as const

  const ratingLabels = [
    '',
    t('rating1') || 'แย่มาก',
    t('rating2') || 'แย่',
    t('rating3') || 'ปานกลาง',
    t('rating4') || 'ดี',
    t('rating5') || 'ดีมาก',
  ]

  if (success) {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-4 animate-fade-in text-center">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 sm:p-10 shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-2xl font-extrabold text-neutral-900 dark:text-white mb-2">
            {t('thankYou') || 'ขอบคุณสำหรับข้อเสนอแนะ!'}
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-8 max-w-sm mx-auto">
            {t('feedbackValue') || 'ความคิดเห็นของคุณมีคุณค่าอย่างยิ่งในการพัฒนาห้องสมุดชมรมมุสลิม มฟล.'}
          </p>
          <button
            onClick={() => {
              setSuccess(false)
              setRating(0)
              setMessage('')
              setCategory('general')
            }}
            className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
          >
            {t('feedbackResubmit') || 'ส่งข้อเสนอแนะอีกครั้ง'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-xl mx-auto py-10 px-4 sm:px-6 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white mb-3">
          <MessageSquare size={24} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
          {t('feedbackTitle') || 'ข้อเสนอแนะและความคิดเห็น'}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5">
          {t('feedbackDesc') || 'ช่วยเราพัฒนาห้องสมุดชมรมมุสลิม มฟล. ให้ดียิ่งขึ้น'}
        </p>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Chips */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2.5">
              {t('feedbackCategory') || 'ประเภทข้อเสนอแนะ'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {categoryOptions.map(cat => {
                const Icon = cat.icon
                const isSelected = category === cat.value
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-transparent shadow-xs'
                        : 'bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Star Rating */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
              {t('rating') || 'ให้คะแนนความพึงพอใจ'} *
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-115 p-1 rounded-lg focus:outline-none"
                >
                  <Star
                    size={30}
                    className={`transition-colors ${
                      star <= (hoverRating || rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-neutral-300 dark:text-neutral-700'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 ml-2">
                  {ratingLabels[rating]}
                </span>
              )}
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                {t('yourFeedback') || 'ข้อความของคุณ'} *
              </label>
              <span className="text-[11px] text-neutral-400">{message.length}/500</span>
            </div>
            <textarea
              required
              rows={5}
              maxLength={500}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={t('feedbackPlaceholder') || 'แบ่งปันความคิดเห็น ขอเสนอแนะ หรือรายงานปัญหา...'}
              className="w-full p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none focus:border-neutral-900 dark:focus:border-white text-neutral-900 dark:text-white resize-none transition-colors"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !message.trim() || rating === 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 disabled:opacity-40 text-white dark:text-black font-bold text-sm transition-all shadow-sm active:scale-[0.99]"
          >
            <Send size={16} />
            <span>{loading ? t('loading') || 'กำลังส่ง...' : t('submit') || 'ส่งความคิดเห็น'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-neutral-400">กำลังโหลด...</div>}>
      <FeedbackContent />
    </Suspense>
  )
}
