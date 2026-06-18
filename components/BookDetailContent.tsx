'use client'
import { useApp } from '@/lib/app-context'
import BorrowButton from './BorrowButton'
import { BookOpen } from 'lucide-react' // ✅ BUG FIX #2: ลบ import ที่ไม่ใช้ (ArrowLeft, Heart, UserPlus)
import Link from 'next/link'
import { format } from 'date-fns'
import { th, enUS } from 'date-fns/locale'

interface Props {
  book: any
  userId: string | null
  activeBorrow: { id: string; due_date: string } | null
  queueEntry: { id: string; position: number } | null
  queueCount: number
  totalBorrows?: number
}

export default function BookDetailContent({
  book,
  userId,
  activeBorrow,
  queueEntry,
  queueCount,
  totalBorrows = 0,
}: Props) {
  const { t, locale } = useApp()
  const isAvailable = book.available_copies > 0

  const dateLocale = locale === 'th' ? th : enUS

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-6 flex-wrap">
        <Link href="/" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          {t('home') ?? 'หน้าแรก'}
        </Link>
        <span>›</span>
        <Link href="/books" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          {t('allBooks') ?? 'หนังสือ'}
        </Link>
        {book.category && (
          <>
            <span>›</span>
            <Link
              href={`/books?category=${encodeURIComponent(book.category)}`}
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              {book.category}
            </Link>
          </>
        )}
        <span>›</span>
        <span className="text-gray-600 dark:text-gray-300 truncate max-w-[200px]">{book.title}</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ── Left: Cover ── */}
        <div className="flex-shrink-0 flex flex-col items-center gap-3 lg:w-[260px]">
          <div className="relative w-full max-w-[260px]">
            {book.cover_url ? (
              <img
                src={book.cover_url}
                alt={book.title}
                className="w-full rounded-2xl shadow-lg object-cover aspect-[2/3]"
              />
            ) : (
              <div className="w-full aspect-[2/3] rounded-2xl bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-950 dark:to-gray-900 flex flex-col items-center justify-center gap-3 shadow-lg">
                <BookOpen size={56} className="text-green-400 dark:text-green-600 opacity-60" />
                <p className="text-sm font-medium text-green-700 dark:text-green-400 text-center px-4 leading-snug">
                  {book.title}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Info ── */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-1">
            {book.title}
          </h1>

          {/* Author */}
          {book.author && (
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">
              {locale === 'th' ? 'โดย' : 'by'} :{' '}
              <span className="text-gray-700 dark:text-gray-300 font-medium">{book.author}</span>
            </p>
          )}

          {/* Publisher */}
          {book.publisher && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              <span className="font-medium text-gray-600 dark:text-gray-300">
                {locale === 'th' ? 'สำนักพิมพ์' : 'Publisher'}:
              </span>{' '}
              {book.publisher}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <div className="flex-[1]">
              <BorrowButton
                book={book}
                userId={userId}
                currentBorrow={activeBorrow}
                queueEntry={queueEntry}
                queueCount={queueCount}
              />
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-px bg-gray-200 dark:bg-gray-700 rounded-2xl overflow-hidden mb-6">
            {/* คงเหลือ */}
            <div className="bg-white dark:bg-gray-900 py-4 flex flex-col items-center gap-0.5">
              <span className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                {locale === 'th' ? 'คงเหลือ' : 'Available'}
              </span>
              {/* ✅ BUG FIX #3: แสดงสีต่างกันตาม isAvailable */}
              <span
                className={`text-2xl font-bold tabular-nums ${
                  isAvailable
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-rose-500'
                }`}
              >
                {book.available_copies}/{book.total_copies}
              </span>
            </div>

            {/* รอคิว */}
            <div className="bg-white dark:bg-gray-900 py-4 flex flex-col items-center gap-0.5">
              <span className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                {locale === 'th' ? 'รอคิว' : 'Queue'}
              </span>
              <span className="text-2xl font-bold tabular-nums text-rose-500">{queueCount}</span>
              {queueCount > 0 && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500 text-center leading-tight">
                  {locale === 'th'
                    ? `ประมาณ ${Math.ceil(queueCount * 14)} วัน`
                    : `~${Math.ceil(queueCount * 14)} days`}
                </span>
              )}
            </div>

            {/* ยืมแล้ว */}
            <div className="bg-white dark:bg-gray-900 py-4 flex flex-col items-center gap-0.5">
              <span className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                {locale === 'th' ? 'ยืมแล้ว' : 'Borrowed'}
              </span>
              <span className="text-2xl font-bold tabular-nums text-rose-500">{totalBorrows}</span>
            </div>
          </div>

          {/* Active borrow due date */}
          {activeBorrow && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-5 text-sm text-amber-800 dark:text-amber-300 font-medium">
              📅 {t('dueDate')}:{' '}
              {format(new Date(activeBorrow.due_date), 'dd MMM yyyy', { locale: dateLocale })}
            </div>
          )}

          {/* File / Book metadata */}
          {(book.file_size || book.file_format || book.pages || book.total_pages) && (
            <div className="grid grid-cols-3 gap-px bg-gray-200 dark:bg-gray-700 rounded-2xl overflow-hidden mb-6">
              {book.file_size && (
                <div className="bg-white dark:bg-gray-900 py-4 flex flex-col items-center gap-0.5">
                  <span className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                    {locale === 'th' ? 'ขนาดไฟล์' : 'File size'}
                  </span>
                  <span className="text-xl font-bold text-rose-500">{book.file_size}</span>
                </div>
              )}
              {(book.file_format || book.format) && (
                <div className="bg-white dark:bg-gray-900 py-4 flex flex-col items-center gap-0.5">
                  <span className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                    {locale === 'th' ? 'รูปแบบไฟล์' : 'Format'}
                  </span>
                  <span className="text-xl font-bold text-rose-500 uppercase">
                    {book.file_format ?? book.format}
                  </span>
                </div>
              )}
              {(book.pages || book.total_pages) && (
                <div className="bg-white dark:bg-gray-900 py-4 flex flex-col items-center gap-0.5">
                  <span className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                    {locale === 'th' ? 'จำนวนหน้า' : 'Pages'}
                  </span>
                  <span className="text-xl font-bold text-rose-500">
                    {book.pages ?? book.total_pages}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Genre / Category tags */}
          {(book.category || book.tags) && (
            <div className="flex flex-wrap gap-2 mb-6">
              {book.category && (
                <Link
                  href={`/books?category=${encodeURIComponent(book.category)}`}
                  className="px-4 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  {book.category}
                </Link>
              )}
              {Array.isArray(book.tags) &&
                book.tags.map((tag: string) => (
                  <Link
                    key={tag}
                    href={`/books?tag=${encodeURIComponent(tag)}`}
                    className="px-4 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:border-green-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Description ── */}
      {book.description && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
            {locale === 'th' ? 'เรื่องย่อ' : 'Description'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
            {book.description}
          </p>
        </section>
      )}

      {/* ── Additional details (ISBN, year) ── */}
      {(book.isbn || book.published_year) && (
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-6 text-sm text-gray-500 dark:text-gray-400">
          {book.isbn && (
            <span>
              <span className="font-medium text-gray-600 dark:text-gray-300">ISBN:</span>{' '}
              <span className="font-mono">{book.isbn}</span>
            </span>
          )}
          {book.published_year && (
            <span>
              <span className="font-medium text-gray-600 dark:text-gray-300">
                {locale === 'th' ? 'ปีที่พิมพ์' : 'Year'}:
              </span>{' '}
              {book.published_year}
            </span>
          )}
        </div>
      )}
    </main>
  )
}