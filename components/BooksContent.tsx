'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, X, Sparkles } from 'lucide-react'
import BookCard from './BookCard'
import { useApp } from '@/lib/app-context'

interface Props {
  books: any[]
  categories: string[]
  initialSearch: string
  initialCategory?: string
}

export default function BooksContent({
  books,
  categories,
  initialSearch,
  initialCategory = 'all',
}: Props) {
  const {
    t,
    locale,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
  } = useApp()
  const router = useRouter()

  // Sync with initial props whenever URL query params change
  useEffect(() => {
    if (initialSearch) setSearchQuery(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    if (initialCategory && initialCategory !== 'all') {
      setSelectedCategory(initialCategory)
    }
  }, [initialCategory])

  const filtered = useMemo(() => {
    return books.filter((book) => {
      const matchSearch =
        !searchQuery ||
        book.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCat =
        selectedCategory === 'all' || book.category === selectedCategory
      return matchSearch && matchCat
    })
  }, [books, searchQuery, selectedCategory])

  function handleClearSearch() {
    setSearchQuery('')
    const params = new URLSearchParams()
    if (selectedCategory && selectedCategory !== 'all') {
      params.set('category', selectedCategory)
    }
    const qs = params.toString()
    router.push(`/books${qs ? `?${qs}` : ''}`)
  }

  function handleClearCategory() {
    setSelectedCategory('all')
    const params = new URLSearchParams()
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim())
    }
    const qs = params.toString()
    router.push(`/books${qs ? `?${qs}` : ''}`)
  }

  function handleClearAll() {
    setSearchQuery('')
    setSelectedCategory('all')
    router.push('/books')
  }

  const hasActiveFilters = Boolean(searchQuery.trim()) || selectedCategory !== 'all'

  return (
    <div className="w-full max-w-7xl mx-auto p-6 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 animate-fade-in">
      {/* Page Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white mb-1">
            {t('allBooks')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm">
            {filtered.length} {locale === 'th' ? 'เล่มทั้งหมดในระบบ' : 'books available in library'}
          </p>
        </div>

        {/* Clear All action if multiple filters active */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs font-semibold text-neutral-500 hover:text-black dark:hover:text-white underline self-start sm:self-auto transition-colors"
          >
            {locale === 'th' ? 'ล้างตัวกรองทั้งหมด' : 'Clear all filters'}
          </button>
        )}
      </div>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
          <span className="text-neutral-400 font-medium">
            {locale === 'th' ? 'ตัวกรองที่เลือก:' : 'Active filters:'}
          </span>

          {searchQuery.trim() && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-[#151518] text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 font-medium shadow-xs">
              <span className="text-neutral-400">{locale === 'th' ? 'ค้นหา:' : 'Query:'}</span>
              <span className="font-semibold">"{searchQuery}"</span>
              <button
                type="button"
                onClick={handleClearSearch}
                className="p-0.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                title="ลบคำค้นหา"
              >
                <X size={12} />
              </button>
            </span>
          )}

          {selectedCategory !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-[#151518] text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 font-medium shadow-xs">
              <span className="text-neutral-400">{locale === 'th' ? 'หมวดหมู่:' : 'Category:'}</span>
              <span className="font-semibold">{selectedCategory}</span>
              <button
                type="button"
                onClick={handleClearCategory}
                className="p-0.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                title="ลบหมวดหมู่"
              >
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Books Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-24 rounded-3xl bg-neutral-50 dark:bg-neutral-900/30 border border-dashed border-neutral-200 dark:border-neutral-800 text-neutral-400 dark:text-neutral-500">
          <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-neutral-800 dark:text-neutral-200 text-base">
            {locale === 'th' ? 'ไม่พบหนังสือที่ค้นหา' : 'No books found'}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
            {locale === 'th'
              ? 'ลองค้นหาด้วยคำอื่น หรือเลือกหมวดหมู่อื่นจากไอคอนตัวกรองด้านบน'
              : 'Try searching with another keyword or select another category from the top filter icon'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearAll}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-opacity"
            >
              {locale === 'th' ? 'แสดงหนังสือทั้งหมด' : 'Show all books'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
          {filtered.map((book, i) => (
            <BookCard key={book.id} book={book} animDelay={i} />
          ))}
        </div>
      )}
    </div>
  )
}
