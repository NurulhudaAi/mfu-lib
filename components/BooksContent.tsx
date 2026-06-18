'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, BookOpen } from 'lucide-react'
import BookCard from './BookCard'
import { useApp } from '@/lib/app-context'

interface Props {
  books: any[]
  categories: string[]
  initialSearch: string
}

export default function BooksContent({ books, categories, initialSearch }: Props) {
  const [search, setSearch] = useState(initialSearch)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [availability, setAvailability] = useState<'all' | 'available'>('all')
  const { t } = useApp()
  const router = useRouter()

  const filtered = useMemo(() => {
    return books.filter(book => {
      const matchSearch = !search || 
        book.title?.toLowerCase().includes(search.toLowerCase()) || 
        book.author?.toLowerCase().includes(search.toLowerCase())
      const matchCat = selectedCategory === 'all' || book.category === selectedCategory
      const matchAvail = availability === 'all' || book.available_copies > 0
      return matchSearch && matchCat && matchAvail
    })
  }, [books, search, selectedCategory, availability])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    router.push(`/books?q=${encodeURIComponent(search)}`)
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t('allBooks')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{filtered.length} เล่ม</p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 mb-6 space-y-3">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-green-500 outline-none text-sm text-gray-900 dark:text-white transition-colors"
          />
        </form>

        <div className="flex flex-wrap gap-2">
          {/* Category filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <SlidersHorizontal size={14} className="text-gray-400" />
            {['all', ...categories].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {cat === 'all' ? 'ทั้งหมด' : cat}
              </button>
            ))}
          </div>

          {/* Availability toggle */}
          <button
            onClick={() => setAvailability(a => a === 'all' ? 'available' : 'all')}
            className={`ml-auto px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              availability === 'available'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            ✅ ว่างอยู่
          </button>
        </div>
      </div>

      {/* Books grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-600">
          <BookOpen size={56} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">ไม่พบหนังสือที่ค้นหา</p>
          <p className="text-sm mt-1">ลองค้นหาด้วยคำอื่น</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((book, i) => (
            <BookCard key={book.id} book={book} animDelay={i} />
          ))}
        </div>
      )}
    </main>
  )
}
