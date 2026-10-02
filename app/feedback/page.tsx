'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/app-context'
import { Star, Send, MessageSquare, CheckCircle } from 'lucide-react'

export default function FeedbackPage() {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('general')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { t, locale } = useApp()

  async function handleSubmit() {
    if (!message.trim() || rating === 0) {
      alert(t('feedbackAlert'))
      return
    }
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id || null,
        rating,
        message: message.trim(),
        category,
      }),
    })

    const data = await res.json()
    if (data.error) { alert(data.error); setLoading(false); return }

    setSuccess(true)
    setLoading(false)
  }

  const categories = [
    { value: 'general', label: t('feedbackGeneral') },
    { value: 'book_request', label: t('feedbackBookRequest') },
    { value: 'system', label: t('feedbackSystem') },
    { value: 'service', label: t('feedbackService') },
  ]

  if (success) {
    return (
      <div className="w-full flex items-center justify-center min-h-[70vh] p-6 sm:p-8 animate-fade-in">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mx-auto mb-5 shadow-sm">
            <CheckCircle size={40} className="text-neutral-900 dark:text-white" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">{t('thankYou')}</h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-8">{t('feedbackValue')}</p>
          <button
            onClick={() => { setSuccess(false); setRating(0); setMessage(''); setCategory('general') }}
            className="px-6 py-3 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl font-semibold transition-all shadow-sm"
          >
            {t('feedbackResubmit')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-xl mx-auto p-6 sm:p-8 lg:p-10 space-y-6 animate-fade-in">
      <div className="bg-neutral-50 dark:bg-[#121214] rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex items-center justify-center mx-auto mb-3.5 shadow-sm">
            <MessageSquare size={24} className="text-neutral-900 dark:text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{t('feedbackTitle')}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{t('feedbackDesc')}</p>
        </div>

        {/* Category */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
            {t('feedbackCategory')}
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  category === cat.value
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                    : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Star rating */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
            {t('rating')}
          </label>
          <div className="flex gap-2.5">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110 p-0.5"
              >
                <Star
                  size={28}
                  className={`transition-colors ${
                    star <= (hoverRating || rating)
                      ? 'fill-black text-black dark:fill-white dark:text-white'
                      : 'text-neutral-300 dark:text-neutral-700'
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 font-medium">
              {['', t('rating1'), t('rating2'), t('rating3'), t('rating4'), t('rating5')][rating]}
            </p>
          )}
        </div>

        {/* Message */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
            {t('yourFeedback')}
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t('feedbackPlaceholder')}
            rows={5}
            maxLength={500}
            className="w-full px-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:border-black dark:focus:border-white outline-none transition-colors resize-none shadow-sm"
          />
          <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-1 text-right">{message.length}/500</p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !message.trim() || rating === 0}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 disabled:opacity-40 text-white dark:text-black font-bold rounded-2xl transition-all shadow-md text-sm"
        >
          <Send size={16} />
          <span>{loading ? t('loading') : t('submit')}</span>
        </button>
      </div>
    </div>
  )
}
