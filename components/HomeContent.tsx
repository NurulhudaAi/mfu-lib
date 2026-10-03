'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useApp } from '@/lib/app-context'
import {
  BookOpen,
  Sparkles,
  ArrowRight,
  Layers,
  EyeOff,
} from 'lucide-react'
import BookCard from './BookCard'
import AnnouncementCarousel, { AnnouncementItem } from './AnnouncementCarousel'

interface Book {
  id: string
  title: string
  author: string | null
  cover_url: string | null
  category: string | null
  available_copies: number
  total_copies: number
  is_featured: boolean
  is_active?: boolean
  created_at: string
  description?: string | null
  isbn?: string | null
  publisher?: string | null
  published_year?: number | null
}

interface Props {
  books: Book[]
  announcements: AnnouncementItem[]
  categories: string[]
  userId: string | null
}

export default function HomeContent({
  books,
  announcements,
  categories,
  userId,
}: Props) {
  const { locale } = useApp()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [hideInactive, setHideInactive] = useState<boolean>(false)

  // Featured / Recommended list (strictly is_featured books only)
  const recommendedBooks = useMemo(() => {
    return books.filter((b) => b.is_featured && b.is_active !== false)
  }, [books])

  // Filtered books for Category section
  const filteredCategoryBooks = useMemo(() => {
    return books.filter((b) => {
      const matchCat =
        selectedCategory === 'all' || b.category === selectedCategory
      const matchActive = !hideInactive || b.is_active !== false
      return matchCat && matchActive
    })
  }, [books, selectedCategory, hideInactive])

  return (
    <div className="w-full max-w-7xl mx-auto p-6 sm:p-8 lg:p-10 space-y-12 animate-fade-in">
      
      {/* ======================================================== */}
      {/* 1. TOP HERO / ANNOUNCEMENT SLIDER (Above Recommended)    */}
      {/* ======================================================== */}
      <AnnouncementCarousel announcements={announcements} />

      {/* ======================================================== */}
      {/* 2. RECOMMENDED BOOKS SHELF                               */}
      {/* ======================================================== */}
      {recommendedBooks.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
                <Sparkles size={20} className="stroke-[2.5]" />
                <span>{locale === 'th' ? 'หนังสือแนะนำ' : 'Recommended Books'}</span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {locale === 'th'
                  ? 'หนังสือยอดนิยมและคัดสรรพิเศษสำหรับสมาชิก'
                  : 'Curated and popular books for members'}
              </p>
            </div>
            <Link
              href="/books"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors"
            >
              <span>{locale === 'th' ? 'ดูทั้งหมด' : 'See All'}</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* 4-Card Showcase Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-7 lg:gap-8">
            {recommendedBooks.map((book, idx) => (
              <BookCard key={book.id} book={book} animDelay={idx} />
            ))}
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 3. CATEGORIES & CATALOG EXPLORER                         */}
      {/* ======================================================== */}
      <section className="space-y-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
              <Layers size={20} className="stroke-[2.5]" />
              <span>{locale === 'th' ? 'หมวดหมู่หนังสือ' : 'Categories'}</span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {filteredCategoryBooks.length} {locale === 'th' ? 'เล่มในหมวดนี้' : 'books in this category'}
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {books.some((b) => b.is_active === false) && (
              <button
                type="button"
                onClick={() => setHideInactive(!hideInactive)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  hideInactive
                    ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                }`}
                title={locale === 'th' ? 'ซ่อนหนังสือที่ปิดใช้งาน' : 'Hide inactive books'}
              >
                <EyeOff size={13} />
                <span>{locale === 'th' ? 'ซ่อนที่ปิดใช้งาน' : 'Hide Inactive'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`}
            >
              {locale === 'th' ? 'ทั้งหมด' : 'All'}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Books Grid */}
        {filteredCategoryBooks.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800 text-neutral-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              {locale === 'th'
                ? 'ไม่พบหนังสือในหมวดหมู่นี้'
                : 'No books found in this category'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-7 lg:gap-8">
            {filteredCategoryBooks.map((book, idx) => (
              <BookCard key={book.id} book={book} animDelay={idx} />
            ))}
          </div>
        )}
      </section>

    </div>
  )
}