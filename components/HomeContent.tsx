'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useApp } from '@/lib/app-context'
import {
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Megaphone,
  Sparkles,
  ArrowRight,
  Layers,
} from 'lucide-react'
import BookCard from './BookCard'
import { format } from 'date-fns'
import { th, enUS } from 'date-fns/locale'

interface Book {
  id: string
  title: string
  author: string | null
  cover_url: string | null
  category: string | null
  available_copies: number
  total_copies: number
  is_featured: boolean
  created_at: string
  description?: string | null
  isbn?: string | null
  publisher?: string | null
  published_year?: number | null
}

interface Announcement {
  id: string
  title: string
  title_en?: string | null
  body: string
  body_en?: string | null
  type: 'info' | 'warning' | 'success'
  created_at: string
}

interface Props {
  books: Book[]
  announcements: Announcement[]
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

  // Top slider state
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // Fallback slides if no announcements in DB
  const slides = useMemo(() => {
    if (announcements && announcements.length > 0) {
      return announcements
    }
    return [
      {
        id: 'default-1',
        title: 'ยินดีต้อนรับสู่ห้องสมุดชมรมมุสลิม มหาวิทยาลัยแม่ฟ้าหลวง',
        title_en: 'Welcome to MFU Muslim Club Library',
        body: 'ระบบยืม-คืนหนังสือดิจิทัลสำหรับสมาชิกชมรมมุสลิม มฟล. ค้นหาหนังสือที่ต้องการและทำรายการได้ทันที',
        body_en: 'Digital book borrowing system for MFU Muslim Club members. Search and borrow your favorite books anytime.',
        type: 'info' as const,
        created_at: new Date().toISOString(),
      },
      {
        id: 'default-2',
        title: 'กติกาการยืมหนังสือ',
        title_en: 'Borrowing Rules & Guidelines',
        body: 'สมาชิกสามารถยืมหนังสือได้ครั้งละ 1 เล่ม นาน 14 วัน และต้องแนบภาพถ่ายคู่กับหนังสือเมื่อทำการคืน',
        body_en: 'Members can borrow 1 book at a time for 14 days. Photo proof is required upon return.',
        type: 'success' as const,
        created_at: new Date().toISOString(),
      },
    ]
  }, [announcements])

  // Autoplay slider every 5 seconds
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [slides.length, isPaused])

  // Featured / Recommended list (is_featured books, fallback to latest)
  const recommendedBooks = useMemo(() => {
    const featured = books.filter((b) => b.is_featured)
    const list = featured.length >= 4 ? featured : books
    return list.slice(0, 4)
  }, [books])

  // Filtered books for Category section
  const filteredCategoryBooks = useMemo(() => {
    return books.filter((b) => {
      const matchCat =
        selectedCategory === 'all' || b.category === selectedCategory
      return matchCat
    })
  }, [books, selectedCategory])

  return (
    <div className="w-full max-w-7xl mx-auto p-6 sm:p-8 lg:p-10 space-y-12 animate-fade-in">
      
      {/* ======================================================== */}
      {/* 1. TOP HERO / ANNOUNCEMENT SLIDER (Above Recommended)    */}
      {/* ======================================================== */}
      <section
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative overflow-hidden rounded-3xl bg-neutral-100/80 dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 transition-all shadow-xs"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 min-h-[140px]">
          <div className="flex-1 space-y-2 max-w-3xl">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-black text-white dark:bg-white dark:text-black">
                <Megaphone size={12} />
                {locale === 'th' ? 'ประกาศ & ข่าวสาร' : 'Announcement'}
              </span>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                {slides[currentSlide]?.created_at
                  ? format(
                      new Date(slides[currentSlide].created_at),
                      'dd MMM yyyy',
                      { locale: locale === 'th' ? th : enUS }
                    )
                  : ''}
              </span>
            </div>

            <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white leading-snug">
              {locale === 'th'
                ? slides[currentSlide]?.title
                : slides[currentSlide]?.title_en || slides[currentSlide]?.title}
            </h2>

            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-2">
              {locale === 'th'
                ? slides[currentSlide]?.body
                : slides[currentSlide]?.body_en || slides[currentSlide]?.body}
            </p>
          </div>

          {/* Slider navigation controls */}
          {slides.length > 1 && (
            <div className="flex sm:flex-col items-center gap-2 shrink-0 self-end sm:self-center">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentSlide(
                      (prev) => (prev - 1 + slides.length) % slides.length
                    )
                  }
                  className="p-2 rounded-xl bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 transition-colors shadow-xs"
                  aria-label="Previous Slide"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentSlide((prev) => (prev + 1) % slides.length)
                  }
                  className="p-2 rounded-xl bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 transition-colors shadow-xs"
                  aria-label="Next Slide"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Progress dots */}
              <div className="flex items-center gap-1.5 mt-1">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === currentSlide
                        ? 'w-6 bg-black dark:bg-white'
                        : 'w-1.5 bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400'
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. RECOMMENDED BOOKS SHELF                               */}
      {/* ======================================================== */}
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
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
          {recommendedBooks.map((book, idx) => (
            <BookCard key={book.id} book={book} animDelay={idx} />
          ))}
        </div>
      </section>

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
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
            {filteredCategoryBooks.map((book, idx) => (
              <BookCard key={book.id} book={book} animDelay={idx} />
            ))}
          </div>
        )}
      </section>

    </div>
  )
}