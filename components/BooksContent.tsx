'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  BookOpen,
  X,
  Sparkles,
  EyeOff,
  Ban,
  CheckCircle2,
  Plus,
  Edit3,
  Trash2,
  Upload,
  Check,
  Search,
  Camera,
  Scan,
  Loader2,
  Image as ImageIcon
} from 'lucide-react'
import BookCard from './BookCard'
import { useApp } from '@/lib/app-context'

const ISBNScanner = dynamic(() => import('./ISBNScanner'), { ssr: false })

type StatusFilter = 'all' | 'available' | 'active'

interface Props {
  books: any[]
  categories: string[]
  initialSearch: string
  initialCategory?: string
  initialStatus?: string
}

export default function BooksContent({
  books,
  categories,
  initialSearch,
  initialCategory = 'all',
  initialStatus = 'all',
}: Props) {
  const {
    t,
    locale,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    statusFilter,
    setStatusFilter,
    profile,
    showAlert,
    showConfirm,
  } = useApp()
  const router = useRouter()
  const isAdmin = profile?.role === 'admin'

  // Admin Book In-Place CRUD Modal State
  const [isBookModalOpen, setIsBookModalOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<any | null>(null)
  const [bookTitle, setBookTitle] = useState('')
  const [bookAuthor, setBookAuthor] = useState('')
  const [bookIsbn, setBookIsbn] = useState('')
  const [bookCategory, setBookCategory] = useState('')
  const [bookTotalCopies, setBookTotalCopies] = useState(1)
  const [bookPublisher, setBookPublisher] = useState('')
  const [bookPublishedYear, setBookPublishedYear] = useState('')
  const [bookDescription, setBookDescription] = useState('')
  const [bookIsFeatured, setBookIsFeatured] = useState(false)
  const [bookIsActive, setBookIsActive] = useState(true)
  const [bookCoverFile, setBookCoverFile] = useState<File | null>(null)
  const [bookCoverPreview, setBookCoverPreview] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [savingBook, setSavingBook] = useState(false)
  const [googleCoverUrl, setGoogleCoverUrl] = useState<string | null>(null)
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false)
  const [isOcrScanning, setIsOcrScanning] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const uploadFileRef = useRef<HTMLInputElement | null>(null)
  const cameraOcrRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock background body scroll when book modal is open
  useEffect(() => {
    if (!isBookModalOpen) return

    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsBookModalOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isBookModalOpen])

  // Sync with initial props whenever URL query params change
  useEffect(() => {
    setSearchQuery(initialSearch || '')
  }, [initialSearch])

  useEffect(() => {
    setSelectedCategory(initialCategory || 'all')
  }, [initialCategory])

  useEffect(() => {
    if (initialStatus === 'available' || initialStatus === 'active') {
      setStatusFilter(initialStatus)
    } else {
      setStatusFilter('all')
    }
  }, [initialStatus])

  const stats = useMemo(() => {
    const total = books.length
    const available = books.filter((b) => b.is_active !== false && b.available_copies > 0).length
    const inactive = books.filter((b) => b.is_active === false).length
    return { total, available, inactive }
  }, [books])

  const filtered = useMemo(() => {
    return books.filter((book) => {
      const matchSearch =
        !searchQuery ||
        book.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCat =
        selectedCategory === 'all' || book.category === selectedCategory

      if (statusFilter === 'available') {
        return matchSearch && matchCat && book.is_active !== false && book.available_copies > 0
      }
      if (statusFilter === 'active') {
        return matchSearch && matchCat && book.is_active !== false
      }

      return matchSearch && matchCat
    })
  }, [books, searchQuery, selectedCategory, statusFilter])

  function handleRemoveCover() {
    setBookCoverFile(null)
    setBookCoverPreview(null)
    setGoogleCoverUrl(null)
  }

  function fillFromGoogleBooks(data: any, sourceDesc = 'Google Books') {
    const info = data.items?.[0]?.volumeInfo
    if (!info) {
      showAlert({
        type: 'warning',
        title: 'ไม่พบข้อมูล',
        message: 'ไม่พบข้อมูลหนังสือเล่มนี้จาก Google Books กรุณาตรวจสอบหรือกรอกด้วยตนเอง',
      })
      return false
    }

    if (info.title) setBookTitle(info.title)
    if (info.authors && info.authors.length > 0) setBookAuthor(info.authors.join(', '))
    if (info.publisher) setBookPublisher(info.publisher)
    if (info.publishedDate) setBookPublishedYear(info.publishedDate.slice(0, 4))
    if (info.description) setBookDescription(info.description)

    const isbn13 = info.industryIdentifiers?.find((x: any) => x.type === 'ISBN_13')?.identifier
    const isbn10 = info.industryIdentifiers?.find((x: any) => x.type === 'ISBN_10')?.identifier
    if (isbn13 || isbn10) setBookIsbn(isbn13 || isbn10)

    if (info.categories && info.categories.length > 0 && (!bookCategory || bookCategory === 'ทั่วไป')) {
      setBookCategory(info.categories[0])
    }

    // High quality cover image from Google Books
    const imageLink =
      info.imageLinks?.extraLarge ||
      info.imageLinks?.large ||
      info.imageLinks?.medium ||
      info.imageLinks?.small ||
      info.imageLinks?.thumbnail

    if (imageLink) {
      const secureImg = imageLink.replace('http:', 'https:').replace('&edge=curl', '')
      setBookCoverPreview(secureImg)
      setGoogleCoverUrl(secureImg)
      setBookCoverFile(null)
    }

    showAlert({
      type: 'success',
      title: 'ดึงข้อมูลสำเร็จ',
      message: `ดึงข้อมูลหนังสือ "${info.title}" จาก ${sourceDesc} สำเร็จแล้ว`,
    })
    return true
  }

  async function lookupISBN(customIsbn?: string) {
    const raw = customIsbn || bookIsbn
    const cleaned = raw.replace(/[-\s]/g, '')
    if (!cleaned) {
      showAlert({
        type: 'warning',
        title: 'กรุณาระบุ ISBN',
        message: 'กรุณากรอกหรือสแกนเลข ISBN 10 หรือ 13 หลักเพื่อค้นหา',
      })
      return
    }

    setIsSearchingGoogle(true)
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleaned}`)
      if (!res.ok) throw new Error('เกิดข้อผิดพลาดในการเชื่อมต่อ Google Books API')
      const data = await res.json()
      fillFromGoogleBooks(data, 'ISBN')
    } catch (err: any) {
      showAlert({
        type: 'error',
        title: 'ค้นหาไม่สำเร็จ',
        message: err.message || 'ไม่สามารถดึงข้อมูลจาก Google Books ได้ในขณะนี้',
      })
    } finally {
      setIsSearchingGoogle(false)
    }
  }

  async function lookupTitle(titleToLookup: string) {
    if (!titleToLookup.trim()) return
    setIsSearchingGoogle(true)
    try {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(titleToLookup)}&maxResults=1`
      )
      if (!res.ok) throw new Error('เกิดข้อผิดพลาดในการเชื่อมต่อ Google Books API')
      const data = await res.json()
      fillFromGoogleBooks(data, 'ชื่อหนังสือ')
    } catch (err: any) {
      showAlert({
        type: 'error',
        title: 'ค้นหาไม่สำเร็จ',
        message: err.message || 'ไม่สามารถดึงข้อมูลจาก Google Books ได้',
      })
    } finally {
      setIsSearchingGoogle(false)
    }
  }

  async function handleOCRImage(file: File) {
    setIsOcrScanning(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const res = reader.result as string
          resolve(res.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const res = await fetch('/api/read-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mediaType: file.type || 'image/jpeg' }),
      })

      if (!res.ok) throw new Error('ไม่สามารถอ่านข้อความจากภาพปกได้')
      const data = await res.json()

      if (data.title && data.title.trim()) {
        const detectedTitle = data.title.trim()
        setBookTitle(detectedTitle)
        // Automatically search Google Books for this title to get metadata & crisp cover!
        await lookupTitle(detectedTitle)
      } else {
        showAlert({
          type: 'info',
          title: 'ไม่พบชื่อหนังสือ',
          message: 'AI ไม่สามารถอ่านชื่อหนังสือจากภาพนี้ได้ กรุณากรอกชื่อหนังสือหรือลองถ่ายภาพใหม่อีกครั้ง',
        })
      }
    } catch (err: any) {
      showAlert({
        type: 'error',
        title: 'สแกนหน้าปกไม่สำเร็จ',
        message: err.message || 'เกิดข้อผิดพลาดในการสแกนหน้าปก',
      })
    } finally {
      setIsOcrScanning(false)
    }
  }

  function openAddBookModal() {
    setEditingBook(null)
    setBookTitle('')
    setBookAuthor('')
    setBookIsbn('')
    setBookCategory(categories[0] || 'ทั่วไป')
    setBookTotalCopies(1)
    setBookPublisher('')
    setBookPublishedYear('')
    setBookDescription('')
    setBookIsFeatured(false)
    setBookIsActive(true)
    setBookCoverFile(null)
    setBookCoverPreview(null)
    setGoogleCoverUrl(null)
    setIsSearchingGoogle(false)
    setIsOcrScanning(false)
    setShowScanner(false)
    setIsBookModalOpen(true)
  }

  function openEditBookModal(book: any) {
    setEditingBook(book)
    setBookTitle(book.title || '')
    setBookAuthor(book.author || '')
    setBookIsbn(book.isbn || '')
    setBookCategory(book.category || categories[0] || '')
    setBookTotalCopies(book.total_copies || 1)
    setBookPublisher(book.publisher || '')
    setBookPublishedYear(book.published_year ? String(book.published_year) : '')
    setBookDescription(book.description || '')
    setBookIsFeatured(Boolean(book.is_featured))
    setBookIsActive(book.is_active !== false)
    setBookCoverFile(null)
    setBookCoverPreview(book.cover_url || null)
    setGoogleCoverUrl(book.cover_url || null)
    setIsSearchingGoogle(false)
    setIsOcrScanning(false)
    setShowScanner(false)
    setIsBookModalOpen(true)
  }

  async function handleToggleActive(book: any) {
    const current = book.is_active !== false
    try {
      const res = await fetch(`/api/admin/books/${book.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !current }),
      })
      if (!res.ok) throw new Error('ไม่สามารถเปลี่ยนสถานะได้')
      showAlert({
        type: 'info',
        title: !current ? 'เปิดใช้งานหนังสือแล้ว' : 'ปิดใช้งานหนังสือแล้ว',
        message: `หนังสือ "${book.title}" ${!current ? 'พร้อมให้ยืมแล้ว' : 'ถูกปิดใช้งานชั่วคราว'}`,
      })
      router.refresh()
    } catch (err: any) {
      showAlert({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message })
    }
  }

  function handleDeleteBook(book: any) {
    showConfirm({
      type: 'warning',
      title: 'ยืนยันการลบหนังสือ',
      message: `คุณต้องการลบหนังสือ "${book.title}" ออกจากระบบถาวรใช่หรือไม่?`,
      confirmText: 'ยืนยันลบ',
      cancelText: 'ยกเลิก',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/books/${book.id}`, { method: 'DELETE' })
          const data = await res.json()
          if (data.error) throw new Error(data.error)
          showAlert({ type: 'success', title: 'ลบสำเร็จ', message: 'ลบหนังสือเรียบร้อยแล้ว' })
          router.refresh()
        } catch (err: any) {
          showAlert({ type: 'error', title: 'ลบไม่สำเร็จ', message: err.message })
        }
      },
    })
  }

  async function handleSaveBook(e: React.FormEvent) {
    e.preventDefault()
    if (!bookTitle.trim()) {
      showAlert({ type: 'warning', title: 'ข้อมูลไม่ครบ', message: 'กรุณากรอกชื่อหนังสือ' })
      return
    }

    setSavingBook(true)
    const fd = new FormData()
    fd.append('title', bookTitle.trim())
    if (bookAuthor.trim()) fd.append('author', bookAuthor.trim())
    if (bookIsbn.trim()) fd.append('isbn', bookIsbn.trim())
    if (bookCategory.trim()) fd.append('category', bookCategory.trim())
    fd.append('total_copies', String(bookTotalCopies))
    if (bookPublisher.trim()) fd.append('publisher', bookPublisher.trim())
    if (bookPublishedYear.trim()) fd.append('published_year', bookPublishedYear.trim())
    if (bookDescription.trim()) fd.append('description', bookDescription.trim())
    fd.append('is_featured', String(bookIsFeatured))
    fd.append('is_active', String(bookIsActive))
    if (bookCoverFile) {
      fd.append('cover', bookCoverFile)
    } else if (googleCoverUrl) {
      fd.append('cover_url', googleCoverUrl)
    }

    try {
      if (editingBook) {
        const res = await fetch(`/api/admin/books/${editingBook.id}`, {
          method: 'PUT',
          body: fd,
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
      } else {
        const res = await fetch('/api/admin/books', {
          method: 'POST',
          body: fd,
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
      }

      setIsBookModalOpen(false)
      showAlert({
        type: 'success',
        title: 'สำเร็จ',
        message: editingBook ? 'แก้ไขข้อมูลหนังสือเรียบร้อยแล้ว' : 'เพิ่มหนังสือใหม่เรียบร้อยแล้ว',
      })
      router.refresh()
    } catch (err: any) {
      showAlert({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message || 'บันทึกไม่สำเร็จ' })
    } finally {
      setSavingBook(false)
    }
  }

  function handleClearSearch() {
    setSearchQuery('')
    const params = new URLSearchParams()
    if (selectedCategory && selectedCategory !== 'all') {
      params.set('category', selectedCategory)
    }
    if (statusFilter && statusFilter !== 'all') {
      params.set('status', statusFilter)
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
    if (statusFilter && statusFilter !== 'all') {
      params.set('status', statusFilter)
    }
    const qs = params.toString()
    router.push(`/books${qs ? `?${qs}` : ''}`)
  }

  function handleSetStatusFilter(status: StatusFilter) {
    setStatusFilter(status)
    const params = new URLSearchParams()
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim())
    }
    if (selectedCategory && selectedCategory !== 'all') {
      params.set('category', selectedCategory)
    }
    if (status !== 'all') {
      params.set('status', status)
    }
    const qs = params.toString()
    router.push(`/books${qs ? `?${qs}` : ''}`)
  }

  function handleClearAll() {
    setSearchQuery('')
    setSelectedCategory('all')
    setStatusFilter('all')
    router.push('/books')
  }

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedCategory !== 'all' ||
    statusFilter !== 'all'

  return (
    <div className="w-full max-w-7xl mx-auto p-6 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 animate-fade-in">
      {/* Page Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white mb-1">
            {isAdmin ? (locale === 'th' ? 'จัดการหนังสือ' : 'Manage Books') : t('allBooks')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm">
            {filtered.length} {locale === 'th' ? 'เล่มที่แสดง' : 'books shown'}
            {filtered.length !== books.length && (
              <span className="opacity-75"> ({locale === 'th' ? `จากทั้งหมด ${books.length} เล่ม` : `of ${books.length} total`})</span>
            )}
            {isAdmin && stats.inactive > 0 && (
              <span className="ml-2 text-neutral-400 dark:text-neutral-500">
                • {locale === 'th' ? `ปิดใช้งาน ${stats.inactive} เล่ม` : `${stats.inactive} inactive`}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Admin Add Book Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={openAddBookModal}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-95"
            >
              <Plus size={16} />
              <span>{locale === 'th' ? 'เพิ่มหนังสือใหม่' : 'Add Book'}</span>
            </button>
          )}

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

          {statusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-[#151518] text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 font-medium shadow-xs">
              <span className="text-neutral-400">{locale === 'th' ? 'สถานะ:' : 'Status:'}</span>
              <span className="font-semibold">
                {statusFilter === 'available'
                  ? locale === 'th' ? 'พร้อมให้ยืม' : 'Available'
                  : locale === 'th' ? 'ซ่อนที่ปิดใช้งาน' : 'Hide Inactive'}
              </span>
              <button
                type="button"
                onClick={() => handleSetStatusFilter('all')}
                className="p-0.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                title="ล้างสถานะ"
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6 lg:gap-7">
          {filtered.map((book, i) => (
            <BookCard
              key={book.id}
              book={book}
              animDelay={i}
              onEdit={isAdmin ? openEditBookModal : undefined}
              onToggleActive={isAdmin ? handleToggleActive : undefined}
              onDelete={isAdmin ? handleDeleteBook : undefined}
            />
          ))}
        </div>
      )}

      {/* Admin Add / Edit Book Modal Dialog (Portal to document.body) */}
      {mounted && isBookModalOpen && createPortal(
        <div
          className="fixed inset-0 w-screen h-[100dvh] z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBookModalOpen(false)
          }}
        >
          <div className="w-[calc(100vw-24px)] md:w-[min(940px,calc(100vw-32px))] xl:w-[min(1040px,calc(100vw-48px))] max-h-[calc(100dvh-24px)] md:max-h-[calc(100dvh-40px)] bg-white dark:bg-[#161619] rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden animate-scale-in">
            <form onSubmit={handleSaveBook} className="flex flex-col h-full max-h-[inherit] overflow-hidden">
              {/* 1. FIXED MODAL HEADER */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-neutral-100 dark:border-neutral-800 shrink-0 bg-white dark:bg-[#161619]">
                <div className="flex items-center gap-2.5 min-w-0 pr-3">
                  <span className="p-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white shrink-0">
                    {editingBook ? <Edit3 size={18} /> : <Plus size={18} />}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white truncate">
                      {editingBook ? 'แก้ไขข้อมูลหนังสือ' : 'เพิ่มหนังสือใหม่ในแคตตาล็อก'}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      จัดการรายละเอียด หน้าปก และสถานะของหนังสือเล่มนี้
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 2. SCROLLABLE MODAL CONTENT (HORIZONTAL 2-COLUMN LAYOUT) */}
              <div className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* ── LEFT COLUMN: BOOK COVER & VISIBILITY TOGGLES (5 cols) ── */}
                  <div className="md:col-span-5 space-y-4">
                    {/* Cover Art Box */}
                    <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                          <Upload size={13} />
                          <span>รูปภาพหน้าปก</span>
                        </label>
                        {googleCoverUrl && !bookCoverFile && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            ✓ จาก Google Books
                          </span>
                        )}
                      </div>

                      {/* Cover Image Preview */}
                      <div className="relative aspect-[3/4] max-h-72 w-full rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shadow-inner group">
                        {bookCoverPreview ? (
                          <>
                            <img src={bookCoverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={handleRemoveCover}
                              title="ลบรูปภาพ"
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white transition-colors shadow-md"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <div className="text-center p-4">
                            <ImageIcon size={36} className="mx-auto mb-2 text-neutral-300 dark:text-neutral-600" />
                            <p className="text-xs font-medium text-neutral-400">ยังไม่มีรูปภาพหน้าปก</p>
                            <p className="text-[10px] text-neutral-400 mt-0.5">ดึงจาก Google Books หรืออัปโหลดไฟล์</p>
                          </div>
                        )}
                      </div>

                      {/* Cover Action Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <label className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-xs text-center">
                          <Upload size={13} />
                          <span>เลือกไฟล์ภาพ</span>
                          <input
                            ref={uploadFileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null
                              if (file) {
                                setBookCoverFile(file)
                                setBookCoverPreview(URL.createObjectURL(file))
                                setGoogleCoverUrl(null)
                              }
                            }}
                          />
                        </label>

                        <button
                          type="button"
                          disabled={isOcrScanning}
                          onClick={() => cameraOcrRef.current?.click()}
                          className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-amber-500/25 disabled:opacity-50 text-center"
                        >
                          {isOcrScanning ? <Loader2 size={13} className="animate-spin text-amber-500" /> : <Scan size={13} />}
                          <span>{isOcrScanning ? 'AI อ่านปก...' : 'สแกนปก (AI)'}</span>
                        </button>
                      </div>

                      <input
                        type="url"
                        value={googleCoverUrl || (bookCoverFile ? '' : bookCoverPreview || '')}
                        onChange={(e) => {
                          setGoogleCoverUrl(e.target.value)
                          setBookCoverPreview(e.target.value || null)
                          setBookCoverFile(null)
                        }}
                        placeholder="https://... ลิงก์รูปภาพ หรือดึงจาก Google"
                        className="w-full px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-[11px] text-neutral-800 dark:text-neutral-200 outline-none focus:border-black dark:focus:border-white transition-colors"
                      />
                    </div>

                    {/* Visibility & Featured Toggles */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bookIsFeatured}
                          onChange={(e) => setBookIsFeatured(e.target.checked)}
                          className="rounded border-neutral-300 text-black focus:ring-black"
                        />
                        <div>
                          <span className="text-xs font-semibold text-neutral-900 dark:text-white block">หนังสือแนะนำ (Featured)</span>
                          <span className="text-[10px] text-neutral-400">แสดงในแท็บ New Arrival / แนะนำ</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bookIsActive}
                          onChange={(e) => setBookIsActive(e.target.checked)}
                          className="rounded border-neutral-300 text-black focus:ring-black"
                        />
                        <div>
                          <span className="text-xs font-semibold text-neutral-900 dark:text-white block">เปิดให้ยืม (Active)</span>
                          <span className="text-[10px] text-neutral-400">สถานะพร้อมใช้งานให้สมาชิกยืมได้</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* ── RIGHT COLUMN: GOOGLE TOOLS & METADATA (7 cols) ── */}
                  <div className="md:col-span-7 space-y-4">
                    {/* Google Books & AI Scanner Toolbar */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-neutral-50 via-amber-500/5 to-neutral-50 dark:from-neutral-900 dark:via-amber-500/10 dark:to-neutral-900 border border-amber-500/20 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200">
                          <Sparkles size={14} className="text-amber-500 shrink-0" />
                          <span>ดึงข้อมูล & รูปภาพอัตโนมัติ (Google Books)</span>
                        </div>
                        {isSearchingGoogle && (
                          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                            <Loader2 size={11} className="animate-spin text-amber-500" />
                            กำลังค้นหา...
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Scan Barcode Button */}
                        <button
                          type="button"
                          onClick={() => setShowScanner(true)}
                          className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-black dark:hover:border-white text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        >
                          <Camera size={14} className="text-neutral-600 dark:text-neutral-300" />
                          <span>สแกน Barcode ISBN</span>
                        </button>

                        {/* Scan Cover Photo (AI OCR) Button */}
                        <button
                          type="button"
                          disabled={isOcrScanning}
                          onClick={() => cameraOcrRef.current?.click()}
                          className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-amber-500 dark:hover:border-amber-400 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                        >
                          {isOcrScanning ? (
                            <Loader2 size={14} className="animate-spin text-amber-500" />
                          ) : (
                            <Scan size={14} className="text-amber-500" />
                          )}
                          <span>{isOcrScanning ? 'AI อ่านปก...' : 'สแกนรูปหน้าปก (AI)'}</span>
                        </button>

                        {/* Hidden input for camera/file OCR */}
                        <input
                          ref={cameraOcrRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setBookCoverFile(file)
                              setBookCoverPreview(URL.createObjectURL(file))
                              setGoogleCoverUrl(null)
                              handleOCRImage(file)
                            }
                            e.target.value = ''
                          }}
                        />
                      </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          ชื่อหนังสือ *
                        </label>
                        {bookTitle.trim() && (
                          <button
                            type="button"
                            disabled={isSearchingGoogle}
                            onClick={() => lookupTitle(bookTitle)}
                            className="text-[11px] text-neutral-500 hover:text-black dark:hover:text-white flex items-center gap-1 transition-colors"
                          >
                            <Search size={11} />
                            <span>ค้นหาข้อมูลจากชื่อนี้</span>
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        value={bookTitle}
                        onChange={(e) => setBookTitle(e.target.value)}
                        placeholder="เช่น หลักการอิสลามเบื้องต้น..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                      />
                    </div>

                    {/* Author */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        ชื่อผู้แต่ง / ผู้เขียน
                      </label>
                      <input
                        type="text"
                        value={bookAuthor}
                        onChange={(e) => setBookAuthor(e.target.value)}
                        placeholder="เช่น ดร. ยูซุฟ อัล-ก็อรฎอวีย์"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                      />
                    </div>

                    {/* ISBN & Category */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* ISBN */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          ISBN (10 หรือ 13 หลัก)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={bookIsbn}
                            onChange={(e) => setBookIsbn(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                lookupISBN()
                              }
                            }}
                            placeholder="978-..."
                            className="w-full px-3.5 py-2.5 pr-20 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors font-mono"
                          />
                          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setShowScanner(true)}
                              title="สแกน Barcode หลังปก"
                              className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                            >
                              <Camera size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={isSearchingGoogle || !bookIsbn.trim()}
                              onClick={() => lookupISBN()}
                              title="ดึงข้อมูลจาก Google Books"
                              className="px-2.5 py-1 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[11px] font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
                            >
                              {isSearchingGoogle ? <Loader2 size={12} className="animate-spin" /> : 'ค้นหา'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Category */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          หมวดหมู่
                        </label>
                        <input
                          type="text"
                          list="category-suggestions"
                          value={bookCategory}
                          onChange={(e) => setBookCategory(e.target.value)}
                          placeholder="เลือกหรือพิมพ์หมวดหมู่..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                        />
                        <datalist id="category-suggestions">
                          {categories.map((c) => (
                            <option key={c} value={c} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    {/* Publisher & Published Year */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          สำนักพิมพ์
                        </label>
                        <input
                          type="text"
                          value={bookPublisher}
                          onChange={(e) => setBookPublisher(e.target.value)}
                          placeholder="สำนักพิมพ์..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          ปีที่พิมพ์ (พ.ศ. / ค.ศ.)
                        </label>
                        <input
                          type="number"
                          value={bookPublishedYear}
                          onChange={(e) => setBookPublishedYear(e.target.value)}
                          placeholder="2566 หรือ 2023"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                        />
                      </div>
                    </div>

                    {/* Total Copies */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        จำนวนสำเนาทั้งหมด (เล่ม)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={bookTotalCopies}
                        onChange={(e) => setBookTotalCopies(parseInt(e.target.value) || 1)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        คำอธิบาย / เรื่องย่อ
                      </label>
                      <textarea
                        rows={3}
                        value={bookDescription}
                        onChange={(e) => setBookDescription(e.target.value)}
                        placeholder="รายละเอียดเนื้อหาโดยย่อ..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. FIXED MODAL FOOTER */}
              <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 shrink-0 flex items-center justify-end gap-2.5 bg-neutral-50/70 dark:bg-neutral-900/70">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingBook}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-black text-white dark:bg-white dark:text-black hover:opacity-90 active:scale-98 transition-all disabled:opacity-50 shadow-sm"
                >
                  {savingBook ? 'กำลังบันทึก...' : editingBook ? 'บันทึกการแก้ไข' : 'เพิ่มหนังสือ'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Barcode ISBN Scanner Modal */}
      {showScanner && (
        <ISBNScanner
          onDetected={(code) => {
            setShowScanner(false)
            setBookIsbn(code)
            lookupISBN(code)
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}
