'use client'
import Link from 'next/link'
import { BookOpen, Users } from 'lucide-react'
import { useApp } from '@/lib/app-context'

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
}

interface Props {
  book: Book
  animDelay?: number
}

export default function BookCard({ book, animDelay = 0 }: Props) {
  const { t } = useApp()
  const isAvailable = book.available_copies > 0

  return (
    <Link
      href={`/books/${book.id}`}
      className="book-card group block rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white hover:shadow-xl hover:shadow-neutral-500/10 transition-all duration-300 animate-fade-in"
      style={{ animationDelay: `${animDelay * 0.05}s` }}
    >
      {/* Cover */}
      <div className="relative aspect-[3/4] bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-800 p-3">
            <BookOpen size={36} className="text-neutral-400 dark:text-neutral-500 mb-2" />
            <span className="text-xs text-neutral-600 dark:text-neutral-300 text-center font-medium leading-tight line-clamp-3">
              {book.title}
            </span>
          </div>
        )}

        {/* Availability badge */}
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
          isAvailable
            ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
            : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700'
        }`}>
          {isAvailable ? t('available') : t('unavailable')}
        </div>

        {/* New badge */}
        {book.is_featured && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black border border-neutral-700 dark:border-neutral-300">
            NEW
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm text-neutral-900 dark:text-white leading-tight line-clamp-2 mb-1 group-hover:text-black dark:group-hover:text-white transition-colors">
          {book.title}
        </h3>
        {book.author && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{book.author}</p>
        )}
        {book.category && (
          <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
            {book.category}
          </span>
        )}
        <div className="flex items-center gap-1 mt-2 text-[11px] text-neutral-400 dark:text-neutral-500">
          <Users size={10} />
          <span>{book.available_copies}/{book.total_copies} {t('copies')}</span>
        </div>
      </div>
    </Link>
  )
}
