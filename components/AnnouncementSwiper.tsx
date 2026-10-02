'use client'
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Megaphone } from 'lucide-react'
import { useApp } from '@/lib/app-context'

interface Announcement {
  id: string
  title: string
  title_en: string
  body: string
  body_en: string
  type: 'info' | 'warning' | 'success'
  created_at: string
}

interface Props {
  announcements: Announcement[]
}

const typeStyles = {
  info: 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100',
  warning: 'bg-neutral-100 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100',
  success: 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-950 dark:text-white',
}

export default function AnnouncementSwiper({ announcements }: Props) {
  const [index, setIndex] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const { locale, t } = useApp()

  useEffect(() => {
    if (announcements.length <= 1) return
    const timer = setInterval(() => {
      setIndex(i => (i + 1) % announcements.length)
      setAnimKey(k => k + 1)
    }, 5000)
    return () => clearInterval(timer)
  }, [announcements.length])

  function go(dir: 1 | -1) {
    setIndex(i => (i + dir + announcements.length) % announcements.length)
    setAnimKey(k => k + 1)
  }

  if (!announcements.length) return null

  const ann = announcements[index]

  return (
    <div className={`relative rounded-2xl border p-4 ${typeStyles[ann.type]}`}>
      <div className="flex items-start gap-3">
        <Megaphone size={18} className="shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0" key={animKey}>
          <p className="font-semibold text-sm announcement-slide">
            {locale === 'th' ? ann.title : (ann.title_en || ann.title)}
          </p>
          <p className="text-sm mt-0.5 opacity-80 announcement-slide">
            {locale === 'th' ? ann.body : (ann.body_en || ann.body)}
          </p>
        </div>
        {announcements.length > 1 && (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => go(-1)} className="p-1 rounded-lg hover:bg-black/10 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs opacity-60">{index + 1}/{announcements.length}</span>
            <button onClick={() => go(1)} className="p-1 rounded-lg hover:bg-black/10 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
      {announcements.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {announcements.map((_, i) => (
            <button
              key={i}
              onClick={() => { setIndex(i); setAnimKey(k => k + 1) }}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-current opacity-80' : 'w-1.5 bg-current opacity-30'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
