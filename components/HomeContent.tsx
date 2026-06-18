'use client'
import Link from 'next/link'
import BookCard from './BookCard'
import AnnouncementSwiper from './AnnouncementSwiper'
import { useApp } from '@/lib/app-context'
import { BookOpen, ArrowRight, Sparkles } from 'lucide-react'

interface Props {
  newBooks: any[]
  announcements: any[]
  userId: string | null
}

export default function HomeContent({ newBooks, announcements, userId }: Props) {
  const { t, profile } = useApp()

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-950 via-gray-950 to-gray-900 dark:from-green-950 dark:via-gray-950 dark:to-gray-900">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2322c55e' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="max-w-2xl animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-primary-500 text-sm font-medium mb-6">
              <Sparkles size={14} />
              MFU Muslim Club Library
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              {t('heroTitle')}
            </h1>
            <p className="text-lg text-gray-400 mb-8 leading-relaxed">
              {t('heroDesc')}
            </p>
            {!profile && (
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/books"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-green-600/25"
                >
                  <BookOpen size={18} />
                  {t('browseBooks')}
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl border border-white/20 transition-all"
                >
                  {t('login')}
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-50 dark:from-gray-950 to-transparent" />
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="animate-fade-in animate-fade-in-delay-1">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              📢 {t('announcement')}
            </h2>
            <AnnouncementSwiper announcements={announcements} />
          </div>
        )}

        {/* New Arrivals */}
        <div className="animate-fade-in animate-fade-in-delay-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('newArrival')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">หนังสือที่เพิ่งเข้าคลังใหม่</p>
            </div>
            <Link
              href="/books"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 font-medium hover:underline"
            >
              {t('viewAll')}
              <ArrowRight size={14} />
            </Link>
          </div>

          {newBooks.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-600">
              <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
              <p>ยังไม่มีหนังสือในระบบ</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {newBooks.map((book, i) => (
                <BookCard key={book.id} book={book} animDelay={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}