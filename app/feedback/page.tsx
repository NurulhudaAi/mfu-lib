'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/app-context'
import Navbar from '@/components/Navbar'
import { Star, Send, MessageSquare, CheckCircle } from 'lucide-react'

export default function FeedbackPage() {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('general')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { t } = useApp()

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={40} className="text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('thankYou')}</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{t('feedbackValue')}</p>
            <button
              onClick={() => { setSuccess(false); setRating(0); setMessage(''); setCategory('general') }}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
            >
              {t('feedbackResubmit')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-8 animate-fade-in">
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-xl shadow-gray-200/50 dark:shadow-black/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-green-100 dark:bg-green-950 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <MessageSquare size={24} className="text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('feedbackTitle')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('feedbackDesc')}</p>
          </div>

          {/* Category */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('feedbackCategory')}</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    category === cat.value
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Star rating */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('rating')}</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={32}
                    className={`transition-colors ${
                      star <= (hoverRating || rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-200 dark:text-gray-700'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {['', t('rating1'), t('rating2'), t('rating3'), t('rating4'), t('rating5')][rating]}
              </p>
            )}
          </div>

          {/* Message */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('yourFeedback')}</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={t('feedbackPlaceholder')}
              rows={5}
              maxLength={500}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:border-green-500 outline-none transition-colors resize-none"
            />
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1 text-right">{message.length}/500</p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !message.trim() || rating === 0}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
          >
            <Send size={18} />
            {loading ? t('loading') : t('submit')}
          </button>
        </div>
      </main>
    </div>
  )
}
