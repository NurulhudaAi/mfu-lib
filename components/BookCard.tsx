'use client'
import Link from 'next/link'
import { BookOpen, Sparkles, Check, Lock, Edit3, Trash2 } from 'lucide-react'
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
  is_active?: boolean
  created_at: string
}

interface Props {
  book: Book
  animDelay?: number
  onEdit?: (book: Book) => void
  onToggleActive?: (book: Book) => void
  onDelete?: (book: Book) => void
}

export default function BookCard({
  book,
  animDelay = 0,
  onEdit,
  onToggleActive,
  onDelete,
}: Props) {
  const { t, locale } = useApp()
  const isDeactivated = book.is_active === false
  const isAvailable = !isDeactivated && book.available_copies > 0

  return (
    <Link
      href={`/books/${book.id}`}
      className={`book-card group flex flex-col cursor-pointer select-none transition-transform duration-300 animate-fade-in ${
        isDeactivated ? 'opacity-70 saturate-50' : !isAvailable ? 'opacity-90' : ''
      }`}
      style={{ animationDelay: `${animDelay * 0.04}s` }}
    >
      {/* 3D Book Presentation Stage (Borderless, clean surface) */}
      <div className="relative w-full book-stage flex items-center justify-center p-1 sm:p-2">
        {/* Admin Quick Action Floating Buttons (When Admin) */}
        {(onEdit || onToggleActive || onDelete) && (
          <div className="absolute top-1.5 left-2 z-30 flex items-center gap-1 p-1 bg-black/70 dark:bg-black/85 backdrop-blur-md rounded-xl border border-white/20 shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onEdit(book)
                }}
                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
                title="แก้ไขข้อมูลหนังสือ"
              >
                <Edit3 size={11} />
              </button>
            )}

            {onToggleActive && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onToggleActive(book)
                }}
                className={`p-1 rounded-lg text-white transition-colors ${
                  isDeactivated
                    ? 'hover:bg-emerald-500/40 text-emerald-300'
                    : 'hover:bg-amber-500/40 text-amber-300'
                }`}
                title={isDeactivated ? 'เปิดใช้งานหนังสือ' : 'ปิดใช้งานหนังสือ'}
              >
                {isDeactivated ? <Check size={11} /> : <Lock size={11} />}
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onDelete(book)
                }}
                className="p-1 rounded-lg hover:bg-red-500/40 text-red-300 transition-colors"
                title="ลบหนังสือเล่มนี้"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        )}

        {/* Floating Bookmark Ribbon (ที่คั่นหนังสือห้อยจากขอบบน) */}
        <div className="absolute -top-1 right-5 z-20 pointer-events-none">
          {isDeactivated ? (
            <div
              className="bookmark-ribbon w-6 sm:w-7 h-8 sm:h-10 bg-neutral-400 text-white dark:bg-neutral-700 dark:text-neutral-300 flex flex-col items-center pt-1.5 pb-2 shadow-sm"
              title={locale === 'th' ? 'ปิดใช้งาน' : 'Disabled'}
            >
              <Lock size={9} className="stroke-[2.5]" />
              <span className="text-[6px] font-bold tracking-tighter mt-0.5 uppercase">
                {locale === 'th' ? 'ปิด' : 'OFF'}
              </span>
            </div>
          ) : book.is_featured ? (
            <div
              className="bookmark-ribbon w-6 sm:w-7 h-9 sm:h-11 bg-gradient-to-b from-amber-500 to-amber-600 text-white flex flex-col items-center pt-1.5 pb-2.5 shadow-sm"
              title="New Arrival"
            >
              <Sparkles size={11} className="fill-current animate-pulse" />
              <span className="text-[7px] font-extrabold tracking-tighter mt-0.5 uppercase">
                NEW
              </span>
            </div>
          ) : (
            <div
              className={`bookmark-ribbon w-6 sm:w-7 h-8 sm:h-10 flex flex-col items-center pt-1.5 pb-2 transition-colors ${
                isAvailable
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-400 text-white dark:bg-neutral-600 dark:text-neutral-200'
              }`}
              title={isAvailable ? `${book.available_copies}/${book.total_copies} ${t('available')}` : (locale === 'th' ? 'ยืมครบแล้ว' : 'All borrowed')}
            >
              {isAvailable ? (
                <>
                  <Check size={10} className="stroke-[3]" />
                  <span className="text-[7px] font-bold tracking-tighter mt-0.5 font-mono">
                    {book.available_copies}
                  </span>
                </>
              ) : (
                <>
                  <Lock size={9} className="stroke-[2.5]" />
                  <span className="text-[6px] font-bold tracking-tighter mt-0.5 uppercase">
                    {locale === 'th' ? 'ยืมครบ' : 'OUT'}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* 3D Realistic Hardcover Book Object */}
        <div className={`book-3d ${!isAvailable ? 'filter saturate-[0.85]' : ''}`}>
          {/* 1. Back Cover of the Book */}
          <div className="book-back-cover" />

          {/* 2. Page Block (Book Thickness & Inside First Page) */}
          <div className="book-pages flex flex-col justify-between p-3 select-none relative">
            <div className="space-y-1.5 opacity-80">
              <div className="flex items-center gap-1 border-b border-neutral-300/60 pb-1">
                <BookOpen size={10} className="text-neutral-500" />
                <span className="text-[8px] font-semibold tracking-wider text-neutral-500 uppercase">
                  MFU Library
                </span>
              </div>
              <h4 className="text-[10px] font-serif font-bold text-neutral-800 leading-tight line-clamp-2 mt-1">
                {book.title}
              </h4>
              {book.author && (
                <p className="text-[8px] text-neutral-500 italic line-clamp-1">
                  by {book.author}
                </p>
              )}
            </div>

            {/* Vintage Library Stamp on Page 1 if deactivated or borrowed */}
            {isDeactivated ? (
              <div className="my-auto py-1 flex items-center justify-center">
                <div className="border-2 border-neutral-400 text-neutral-500 -rotate-12 px-2 py-0.5 rounded text-[8px] font-bold tracking-widest uppercase font-mono shadow-xs">
                  {locale === 'th' ? 'ปิดใช้งาน' : 'INACTIVE'}
                </div>
              </div>
            ) : !isAvailable && (
              <div className="my-auto py-1 flex items-center justify-center">
                <div className="border-2 border-red-500/70 text-red-600/80 -rotate-12 px-2 py-0.5 rounded text-[8px] font-bold tracking-widest uppercase font-mono shadow-xs">
                  {locale === 'th' ? 'ถูกยืมแล้ว' : 'BORROWED'}
                </div>
              </div>
            )}

            {/* Simulated text lines */}
            {isAvailable && !isDeactivated && (
              <div className="space-y-1 my-auto opacity-40">
                <div className="h-1 bg-neutral-400 rounded-full w-4/5" />
                <div className="h-1 bg-neutral-400 rounded-full w-full" />
                <div className="h-1 bg-neutral-400 rounded-full w-5/6" />
                <div className="h-1 bg-neutral-400 rounded-full w-2/3" />
              </div>
            )}

            <div className="text-[7px] text-neutral-400 text-right font-mono opacity-60">
              Page 1
            </div>

            {/* Edge texture on the right of the book */}
            <div className="book-pages-edge" />
          </div>

          {/* 3. Front Hardcover (Swings Open in 3D on Hover) */}
          <div className="book-front-cover relative">
            {book.cover_url ? (
              <img
                src={book.cover_url}
                alt={book.title}
                className="w-full h-full object-cover select-none pointer-events-none"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex flex-col justify-between p-3.5 bg-gradient-to-br from-neutral-800 via-neutral-900 to-neutral-950 text-white select-none">
                <div className="flex justify-between items-start">
                  <div className="w-5 h-5 rounded-full border border-neutral-700/60 flex items-center justify-center text-[9px] font-serif text-neutral-400">
                    MFU
                  </div>
                  <BookOpen size={14} className="text-neutral-400" />
                </div>
                <div className="my-auto py-2">
                  <p className="text-xs sm:text-sm font-serif font-bold tracking-tight text-neutral-100 leading-snug line-clamp-3 text-center">
                    {book.title}
                  </p>
                  {book.author && (
                    <p className="text-[10px] text-neutral-400 text-center mt-1 truncate">
                      {book.author}
                    </p>
                  )}
                </div>
                <div className="text-[8px] text-center text-neutral-500 uppercase tracking-widest border-t border-neutral-800/80 pt-1">
                  {book.category || 'Special Edition'}
                </div>
              </div>
            )}

            {/* Realistic Hardcover Spine Crease & Highlight */}
            <div className="book-crease" />

            {/* Hardcover Spine Hinge Groove */}
            <div className="book-hinge" />

            {/* Cover Light Sheen Gloss Reflection */}
            <div className="book-sheen" />

            {/* Japanese Obi Strip (สายคาดหนังสือ) when book is deactivated or borrowed */}
            {isDeactivated ? (
              <div className="absolute bottom-3 inset-x-0 bg-neutral-900/90 dark:bg-black/95 backdrop-blur-xs py-1 px-2.5 z-20 flex items-center justify-between text-white shadow-sm border-y border-white/10 pointer-events-none">
                <span className="flex items-center gap-1 text-[8px] sm:text-[9px] font-bold tracking-wider uppercase text-neutral-300">
                  <Lock size={9} className="text-neutral-400" />
                  <span>{locale === 'th' ? 'ปิดใช้งาน' : 'Disabled'}</span>
                </span>
                <span className="text-[8px] text-neutral-400">
                  {locale === 'th' ? 'งดยืม' : 'Inactive'}
                </span>
              </div>
            ) : !isAvailable && (
              <div className="absolute bottom-3 inset-x-0 bg-neutral-950/85 dark:bg-black/90 backdrop-blur-xs py-1 px-2.5 z-20 flex items-center justify-between text-white shadow-sm border-y border-white/10 pointer-events-none">
                <span className="flex items-center gap-1 text-[8px] sm:text-[9px] font-bold tracking-wider uppercase text-neutral-200">
                  <Lock size={9} className="text-amber-400" />
                  <span>{locale === 'th' ? 'ยืมครบแล้ว' : 'Borrowed'}</span>
                </span>
                <span className="text-[8px] font-mono text-neutral-400">
                  0/{book.total_copies}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Book Metadata & Typography */}
      <div className="mt-3 px-1">
        <h3 className="font-semibold text-sm sm:text-[15px] text-neutral-900 dark:text-neutral-100 leading-snug line-clamp-1 group-hover:text-black dark:group-hover:text-white transition-colors">
          {book.title}
        </h3>
        
        <div className="flex items-center justify-between gap-2 mt-1">
          {book.author ? (
            <p className="text-xs sm:text-[13px] text-neutral-500 dark:text-neutral-400 font-normal truncate">
              {book.author}
            </p>
          ) : <span />}

          {isDeactivated ? (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
              <Lock size={9} />
              {locale === 'th' ? 'ปิดใช้งาน' : 'Disabled'}
            </span>
          ) : book.category ? (
            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/60">
              {book.category}
            </span>
          ) : (
            !isAvailable && (
              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                <Lock size={9} />
                {locale === 'th' ? 'ยืมครบ' : 'Out'}
              </span>
            )
          )}
        </div>
      </div>
    </Link>
  )
}
