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
      className="book-card group block rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-green-400 dark:hover:border-green-600 hover:shadow-xl hover:shadow-green-500/10 animate-fade-in"
      style={{ animationDelay: `${animDelay * 0.05}s` }}
    >
      {/* Cover */}
      <div className="relative aspect-[3/4] bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-green-100 to-green-50 dark:from-green-950 dark:to-gray-800">
            <BookOpen size={40} className="text-green-400 dark:text-green-600 mb-2" />
            <span className="text-xs text-green-600 dark:text-green-500 text-center px-2 font-medium leading-tight">
              {book.title}
            </span>
          </div>
        )}

        {/* Availability badge */}
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
          isAvailable
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white'
        }`}>
          {isAvailable ? t('available') : t('unavailable')}
        </div>

        {/* New badge */}
        {book.is_featured && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
            NEW
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white leading-tight line-clamp-2 mb-1 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
          {book.title}
        </h3>
        {book.author && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{book.author}</p>
        )}
        {book.category && (
          <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {book.category}
          </span>
        )}
        <div className="flex items-center gap-1 mt-2 text-[11px] text-gray-400 dark:text-gray-500">
          <Users size={10} />
          <span>{book.available_copies}/{book.total_copies} {t('copies')}</span>
        </div>
      </div>
    </Link>
  )
}
