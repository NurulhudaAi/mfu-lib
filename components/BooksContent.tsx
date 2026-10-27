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
  RotateCw,
  ChevronDown,
  Image as ImageIcon
} from 'lucide-react'
import BookCard from './BookCard'
import { useApp } from '@/lib/app-context'
import { getCategoryLabel, DEFAULT_BOOK_CATEGORIES } from '@/lib/i18n'

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
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const [booksList, setBooksList] = useState(books)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    setBooksList(books)
  }, [books])

  async function handleRefresh() {
    setIsRefreshing(true)
    try {
      router.refresh()
      await new Promise((r) => setTimeout(r, 600))
      showAlert({
        type: 'success',
        title: locale === 'th' ? 'อัปเดตข้อมูลแล้ว' : 'Updated',
        message: locale === 'th' ? 'ดึงข้อมูลหนังสือล่าสุดเรียบร้อยแล้ว' : 'Fetched latest books data.',
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Admin Book In-Place CRUD Modal State
  const [isBookModalOpen, setIsBookModalOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<any | null>(null)
  const [bookTitle, setBookTitle] = useState('')
  const [bookAuthor, setBookAuthor] = useState('')
  const [bookIsbn, setBookIsbn] = useState('')
  const [bookCategory, setBookCategory] = useState('')
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const allCategories = useMemo(() => {
    const set = new Set<string>([...categories, ...DEFAULT_BOOK_CATEGORIES])
    if (bookCategory && bookCategory.trim()) set.add(bookCategory.trim())
    return Array.from(set).filter(Boolean)
  }, [categories, bookCategory])
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
  const cameraDirectRef = useRef<HTMLInputElement | null>(null)

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
    const total = booksList.length
    const available = booksList.filter((b) => b.is_active !== false && b.available_copies > 0).length
    const inactive = booksList.filter((b) => b.is_active === false).length
    return { total, available, inactive }
  }, [booksList])

  const filtered = useMemo(() => {
    return booksList.filter((book) => {
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
  }, [booksList, searchQuery, selectedCategory, statusFilter])

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
        title: locale === 'th' ? 'ไม่พบข้อมูล' : 'No Data Found',
        message: locale === 'th'
          ? 'ไม่พบข้อมูลหนังสือเล่มนี้จาก Google Books กรุณาตรวจสอบหรือกรอกด้วยตนเอง'
          : 'No details found from Google Books for this book. Please verify or fill manually.',
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
      title: locale === 'th' ? 'ดึงข้อมูลสำเร็จ' : 'Data Fetched Successfully',
      message: locale === 'th'
        ? `ดึงข้อมูลหนังสือ "${info.title}" จาก ${sourceDesc} สำเร็จแล้ว`
        : `Successfully retrieved details for "${info.title}" from ${sourceDesc === 'ชื่อหนังสือ' ? 'title search' : sourceDesc}.`,
    })
    return true
  }

  async function lookupISBN(customIsbn?: string) {
    const raw = customIsbn || bookIsbn
    const cleaned = raw.replace(/[-\s]/g, '')
    if (!cleaned) {
      showAlert({
        type: 'warning',
        title: locale === 'th' ? 'กรุณาระบุ ISBN' : 'Please Enter ISBN',
        message: locale === 'th'
          ? 'กรุณากรอกหรือสแกนเลข ISBN 10 หรือ 13 หลักเพื่อค้นหา'
          : 'Please enter or scan a 10 or 13-digit ISBN to search.',
      })
      return
    }

    setIsSearchingGoogle(true)
    try {
      const res = await fetch('/api/lookup-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: cleaned, type: 'isbn' }),
      })
      if (!res.ok) throw new Error(locale === 'th' ? 'เกิดข้อผิดพลาดในการดึงข้อมูลหนังสือ' : 'Failed to retrieve book data')
      const data = await res.json()
      fillFromGoogleBooks(data, data.source || 'ISBN')
    } catch (err: any) {
      showAlert({
        type: 'error',
        title: locale === 'th' ? 'ค้นหาไม่สำเร็จ' : 'Search Failed',
        message: err.message || (locale === 'th' ? 'ไม่สามารถดึงข้อมูลหนังสือได้ในขณะนี้' : 'Could not fetch book data at this time.'),
      })
    } finally {
      setIsSearchingGoogle(false)
    }
  }

  async function lookupTitle(titleToLookup: string, silent: boolean = false) {
    if (!titleToLookup.trim()) return
    setIsSearchingGoogle(true)
    try {
      const res = await fetch('/api/lookup-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: titleToLookup.trim(), type: 'title' }),
      })
      if (!res.ok) {
        if (!silent) throw new Error(locale === 'th' ? 'เกิดข้อผิดพลาดในการดึงข้อมูลหนังสือ' : 'Failed to retrieve book data')
        return
      }
      const data = await res.json()
      fillFromGoogleBooks(data, data.source || (locale === 'th' ? 'ชื่อหนังสือ' : 'Title'))
    } catch (err: any) {
      if (!silent) {
        showAlert({
          type: 'error',
          title: locale === 'th' ? 'ค้นหาไม่สำเร็จ' : 'Search Failed',
          message: err.message || (locale === 'th' ? 'ไม่สามารถดึงข้อมูลหนังสือได้' : 'Could not fetch book data.'),
        })
      }
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
        if (data.author) setBookAuthor(data.author)
        if (data.publisher) setBookPublisher(data.publisher)
        if (data.published_year) setBookPublishedYear(String(data.published_year))
        if (data.isbn) setBookIsbn(data.isbn)
        if (data.description) setBookDescription(data.description)
        if (data.category) {
          const matched = categories.find(c =>
            c.toLowerCase().includes(data.category.toLowerCase()) ||
            data.category.toLowerCase().includes(c.toLowerCase())
          )
          if (matched) setBookCategory(matched)
        }

        showAlert({
          type: 'success',
          title: locale === 'th' ? 'สแกนปกและอ่านข้อมูลสำเร็จ!' : 'Cover Scanned Successfully!',
          message: locale === 'th'
            ? `AI วิเคราะห์และดึงข้อมูล: "${detectedTitle}" (${data.author || 'ไม่ระบุผู้แต่ง'}${data.publisher ? ` • ${data.publisher}` : ''}) เรียบร้อยแล้ว`
            : `Extracted details for "${detectedTitle}"`,
        })

        // Attempt silent background Google Books lookup for high-res cover & extra blurb if available
        await lookupTitle(detectedTitle, true).catch(() => {})
      } else {
        showAlert({
          type: 'info',
          title: locale === 'th' ? 'ไม่พบชื่อหนังสือ' : 'Title Not Found',
          message: locale === 'th'
            ? 'AI ไม่สามารถอ่านชื่อหนังสือจากภาพนี้ได้ กรุณากรอกชื่อหนังสือหรือลองถ่ายภาพใหม่อีกครั้ง'
            : 'AI could not detect the book title from this image. Please enter it manually or retake the photo.',
        })
      }
    } catch (err: any) {
      showAlert({
        type: 'error',
        title: locale === 'th' ? 'สแกนหน้าปกไม่สำเร็จ' : 'Cover Scan Failed',
        message: err.message || (locale === 'th' ? 'เกิดข้อผิดพลาดในการสแกนหน้าปก' : 'An error occurred while scanning the cover image.'),
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
    setIsCustomCategory(false)
    setIsBookModalOpen(true)
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && isAdmin) {
      const params = new URLSearchParams(window.location.search)
      if (params.get('action') === 'add') {
        openAddBookModal()
      }
    }
  }, [isAdmin])

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
    setIsCustomCategory(false)
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
      if (!res.ok) throw new Error(locale === 'th' ? 'ไม่สามารถเปลี่ยนสถานะได้' : 'Failed to update book status')
      showAlert({
        type: 'info',
        title: !current
          ? (locale === 'th' ? 'เปิดใช้งานหนังสือแล้ว' : 'Book Activated')
          : (locale === 'th' ? 'ปิดใช้งานหนังสือแล้ว' : 'Book Deactivated'),
        message: locale === 'th'
          ? `หนังสือ "${book.title}" ${!current ? 'พร้อมให้ยืมแล้ว' : 'ถูกปิดใช้งานชั่วคราว'}`
          : `"${book.title}" is ${!current ? 'now available for borrowing' : 'temporarily deactivated'}.`,
      })
      router.refresh()
    } catch (err: any) {
      showAlert({
        type: 'error',
        title: locale === 'th' ? 'เกิดข้อผิดพลาด' : 'Error',
        message: err.message,
      })
    }
  }

  function handleDeleteBook(book: any) {
    showConfirm({
      type: 'warning',
      title: locale === 'th' ? 'ยืนยันการลบหนังสือ' : 'Confirm Book Deletion',
      message: locale === 'th'
        ? `คุณต้องการลบหนังสือ "${book.title}" ออกจากระบบถาวรใช่หรือไม่?`
        : `Are you sure you want to permanently delete "${book.title}" from the catalog?`,
      confirmText: locale === 'th' ? 'ยืนยันลบ' : 'Delete',
      cancelText: locale === 'th' ? 'ยกเลิก' : 'Cancel',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/books/${book.id}`, { method: 'DELETE' })
          const data = await res.json()
          if (data.error) throw new Error(data.error)
          showAlert({
            type: 'success',
            title: locale === 'th' ? 'ลบสำเร็จ' : 'Deleted Successfully',
            message: locale === 'th' ? 'ลบหนังสือเรียบร้อยแล้ว' : 'Book has been deleted from catalog.',
          })
          router.refresh()
        } catch (err: any) {
          showAlert({
            type: 'error',
            title: locale === 'th' ? 'ลบไม่สำเร็จ' : 'Delete Failed',
            message: err.message,
          })
        }
      },
    })
  }

  async function handleSaveBook(e: React.FormEvent) {
    e.preventDefault()
    if (!bookTitle.trim()) {
      showAlert({
        type: 'warning',
        title: locale === 'th' ? 'ข้อมูลไม่ครบ' : 'Missing Information',
        message: locale === 'th' ? 'กรุณากรอกชื่อหนังสือ' : 'Please enter the book title.',
      })
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
        setBooksList((prev) =>
          prev.map((b) =>
            b.id === editingBook.id
              ? {
                  ...b,
                  title: bookTitle.trim(),
                  author: bookAuthor.trim() || null,
                  isbn: bookIsbn.trim() || null,
                  category: bookCategory.trim() || null,
                  total_copies: bookTotalCopies,
                  publisher: bookPublisher.trim() || null,
                  published_year: bookPublishedYear ? Number(bookPublishedYear) : null,
                  description: bookDescription.trim() || null,
                  is_featured: bookIsFeatured,
                  is_active: bookIsActive,
                  cover_url: bookCoverPreview || b.cover_url,
                }
              : b
          )
        )
      } else {
        const res = await fetch('/api/admin/books', {
          method: 'POST',
          body: fd,
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        if (data.book) {
          setBooksList((prev) => [data.book, ...prev])
        }
      }

      setIsBookModalOpen(false)
      showAlert({
        type: 'success',
        title: locale === 'th' ? 'สำเร็จ' : 'Success',
        message: editingBook
          ? (locale === 'th' ? 'แก้ไขข้อมูลหนังสือเรียบร้อยแล้ว' : 'Book details updated successfully.')
          : (locale === 'th' ? 'เพิ่มหนังสือใหม่เรียบร้อยแล้ว' : 'New book added successfully.'),
      })
      router.refresh()
    } catch (err: any) {
      showAlert({
        type: 'error',
        title: locale === 'th' ? 'เกิดข้อผิดพลาด' : 'Error',
        message: err.message || (locale === 'th' ? 'บันทึกไม่สำเร็จ' : 'Failed to save book.'),
      })
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

  function handleCategoryChange(cat: string) {
    setSelectedCategory(cat)
    const params = new URLSearchParams()
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim())
    }
    if (cat && cat !== 'all') {
      params.set('category', cat)
    }
    if (statusFilter && statusFilter !== 'all') {
      params.set('status', statusFilter)
    }
    const qs = params.toString()
    router.push(`/books${qs ? `?${qs}` : ''}`)
  }

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedCategory !== 'all' ||
    statusFilter !== 'all'

  return (
    <div className="w-full max-w-7xl mx-auto p-6 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 animate-fade-in">
      {/* Page Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {isAdmin ? (locale === 'th' ? 'จัดการหนังสือ' : 'Manage Books') : t('allBooks')}
            </h1>
          </div>
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

        <div className="flex items-center gap-3 self-start sm:self-center flex-wrap">
          {/* Clear All action if multiple filters active */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs font-semibold text-neutral-500 hover:text-black dark:hover:text-white underline transition-colors"
            >
              {locale === 'th' ? 'ล้างตัวกรองทั้งหมด' : 'Clear all filters'}
            </button>
          )}

          {/* Category Dropdown Filter */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              title={locale === 'th' ? 'เลือกหมวดหมู่หนังสือ' : 'Filter by category'}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl text-xs sm:text-sm font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200/60 dark:border-neutral-700 outline-none cursor-pointer transition-colors max-w-[170px] sm:max-w-[210px] truncate"
            >
              <option value="all">{locale === 'th' ? 'ทุกหมวดหมู่' : 'All Categories'}</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {getCategoryLabel(cat, locale)}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          </div>

          {/* Refresh Data Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title={locale === 'th' ? 'รีเฟรชข้อมูลล่าสุด' : 'Refresh latest books'}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs sm:text-sm font-medium transition-all active:scale-95 disabled:opacity-50 border border-neutral-200/60 dark:border-neutral-700"
          >
            <RotateCw size={14} className={isRefreshing ? 'animate-spin text-amber-500' : ''} />
            <span className="hidden sm:inline">{isRefreshing ? (locale === 'th' ? 'กำลังโหลด...' : 'Refreshing...') : (locale === 'th' ? 'รีเฟรช' : 'Refresh')}</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={openAddBookModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95"
            >
              <Plus size={16} />
              <span>{locale === 'th' ? 'เพิ่มหนังสือ' : 'Add Book'}</span>
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
              <span className="font-semibold">{getCategoryLabel(selectedCategory, locale)}</span>
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
          className="fixed inset-0 w-screen h-[100dvh] z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/50 dark:bg-black/70 animate-fade-in"
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
                      {editingBook
                        ? (locale === 'th' ? 'แก้ไขข้อมูลหนังสือ' : 'Edit Book Details')
                        : (locale === 'th' ? 'เพิ่มหนังสือใหม่ในแคตตาล็อก' : 'Add New Book to Catalog')}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      {locale === 'th'
                        ? 'จัดการรายละเอียด หน้าปก และสถานะของหนังสือเล่มนี้'
                        : 'Manage details, cover image, and availability for this book'}
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
                {/* AI OCR Scanning Active Banner */}
                {isOcrScanning && (
                  <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-blue-500/15 border border-amber-500/30 dark:border-amber-400/30 shadow-sm animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 animate-spin" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                            {locale === 'th' ? 'AI กำลังวิเคราะห์ข้อมูลปกหนังสือ...' : 'AI is Analyzing Book Cover...'}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-medium">Gemini AI</span>
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                          {locale === 'th' ? 'กำลังอ่านและค้นหาชื่อเรื่อง ผู้แต่ง สำนักพิมพ์ หมวดหมู่ และปีที่พิมพ์ โปรดรอสักครู่...' : 'Reading title, author, publisher, and year published...'}
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-1.5 mt-3 overflow-hidden">
                      <div className="bg-gradient-to-r from-amber-500 via-purple-500 to-amber-500 h-full w-2/3 animate-pulse rounded-full" />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* ── LEFT COLUMN: BOOK COVER & VISIBILITY TOGGLES (5 cols) ── */}
                  <div className="md:col-span-5 space-y-4">
                    {/* Cover Art Box */}
                    <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                          <Upload size={13} />
                          <span>{locale === 'th' ? 'รูปภาพหน้าปก' : 'Book Cover'}</span>
                        </label>
                        {googleCoverUrl && !bookCoverFile && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            {locale === 'th' ? '✓ จาก Google Books' : '✓ From Google Books'}
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
                              title={locale === 'th' ? 'ลบรูปภาพ' : 'Remove image'}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white transition-colors shadow-md"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <div className="text-center p-4">
                            <ImageIcon size={36} className="mx-auto mb-2 text-neutral-300 dark:text-neutral-600" />
                            <p className="text-xs font-medium text-neutral-400">
                              {locale === 'th' ? 'ยังไม่มีรูปภาพหน้าปก' : 'No cover image yet'}
                            </p>
                            <p className="text-[10px] text-neutral-400 mt-0.5">
                              {locale === 'th' ? 'ดึงจาก Google Books หรืออัปโหลดไฟล์' : 'Fetch from Google Books or upload image'}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Cover Action Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <label className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-xs text-center">
                          <Upload size={13} />
                          <span>{locale === 'th' ? 'เลือกไฟล์ภาพ' : 'Choose File'}</span>
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
                          <span>{isOcrScanning ? (locale === 'th' ? 'AI อ่านปก...' : 'Scanning...') : (locale === 'th' ? 'สแกนปก (AI)' : 'Scan Cover (AI)')}</span>
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
                        placeholder={locale === 'th' ? 'https://... ลิงก์รูปภาพ หรือดึงจาก Google' : 'https://... Image URL or from Google'}
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
                          <span className="text-xs font-semibold text-neutral-900 dark:text-white block">
                            {locale === 'th' ? 'หนังสือแนะนำ (Featured)' : 'Featured Book'}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {locale === 'th' ? 'แสดงในแท็บ New Arrival / แนะนำ' : 'Highlight in New Arrival and Featured'}
                          </span>
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
                          <span className="text-xs font-semibold text-neutral-900 dark:text-white block">
                            {locale === 'th' ? 'เปิดให้ยืม (Active)' : 'Available for Borrow (Active)'}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {locale === 'th' ? 'สถานะพร้อมใช้งานให้สมาชิกยืมได้' : 'Enabled and visible for members to borrow'}
                          </span>
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
                          <span>{locale === 'th' ? 'ดึงข้อมูลอัตโนมัติ (AI อ่านปก & Google Books)' : 'Auto-fetch Details (AI Vision & Google)'}</span>
                        </div>
                        {(isSearchingGoogle || isOcrScanning) && (
                          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                            <Loader2 size={11} className="animate-spin text-amber-500" />
                            {isOcrScanning
                              ? (locale === 'th' ? 'AI กำลังอ่านปก...' : 'AI scanning cover...')
                              : (locale === 'th' ? 'กำลังค้นหา...' : 'Searching...')}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Direct Camera Snapshot (Mobile Rear Camera) */}
                        <button
                          type="button"
                          disabled={isOcrScanning}
                          onClick={() => cameraDirectRef.current?.click()}
                          className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 disabled:opacity-50"
                          title={locale === 'th' ? 'เปิดกล้องมือถือถ่ายภาพหน้าปกเพื่ออ่านข้อมูลอัตโนมัติ' : 'Take a photo of book cover to auto-extract details'}
                        >
                          {isOcrScanning ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Camera size={14} />
                          )}
                          <span>{locale === 'th' ? 'ถ่ายรูปหน้าปก' : 'Take Cover Photo'}</span>
                        </button>

                        {/* Upload Cover Photo (AI OCR) Button */}
                        <button
                          type="button"
                          disabled={isOcrScanning}
                          onClick={() => cameraOcrRef.current?.click()}
                          className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-amber-500 dark:hover:border-amber-400 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                          title={locale === 'th' ? 'เลือกรูปภาพหน้าปกที่มีอยู่แล้วในเครื่อง' : 'Choose an existing cover image from device'}
                        >
                          <Scan size={14} className="text-amber-500" />
                          <span>{locale === 'th' ? 'เลือกรูปภาพปก' : 'Pick Cover Image'}</span>
                        </button>

                        {/* Scan Barcode Button */}
                        <button
                          type="button"
                          onClick={() => setShowScanner(true)}
                          className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-black dark:hover:border-white text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        >
                          <Scan size={14} className="text-neutral-600 dark:text-neutral-300" />
                          <span>{locale === 'th' ? 'สแกน Barcode ISBN' : 'Scan ISBN Barcode'}</span>
                        </button>

                        {/* Hidden input for direct camera snapshot */}
                        <input
                          ref={cameraDirectRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
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

                        {/* Hidden input for photo gallery / file upload */}
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
                          {locale === 'th' ? 'ชื่อหนังสือ *' : 'Book Title *'}
                        </label>
                        {bookTitle.trim() && (
                          <button
                            type="button"
                            disabled={isSearchingGoogle}
                            onClick={() => lookupTitle(bookTitle)}
                            className="text-[11px] text-neutral-500 hover:text-black dark:hover:text-white flex items-center gap-1 transition-colors"
                          >
                            <Search size={11} />
                            <span>{locale === 'th' ? 'ค้นหาข้อมูลจากชื่อนี้' : 'Search by title'}</span>
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        value={bookTitle}
                        onChange={(e) => setBookTitle(e.target.value)}
                        placeholder={locale === 'th' ? 'เช่น หลักการอิสลามเบื้องต้น...' : 'e.g. Fundamental Principles of Islam...'}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                      />
                    </div>

                    {/* Author */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        {locale === 'th' ? 'ชื่อผู้แต่ง / ผู้เขียน' : 'Author'}
                      </label>
                      <input
                        type="text"
                        value={bookAuthor}
                        onChange={(e) => setBookAuthor(e.target.value)}
                        placeholder={locale === 'th' ? 'เช่น ดร. ยูซุฟ อัล-ก็อรฎอวีย์' : 'e.g. Dr. Yusuf Al-Qaradawi'}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                      />
                    </div>

                    {/* ISBN & Category */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* ISBN */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          {locale === 'th' ? 'ISBN (10 หรือ 13 หลัก)' : 'ISBN (10 or 13 digits)'}
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
                              title={locale === 'th' ? 'สแกน Barcode หลังปก' : 'Scan barcode on back cover'}
                              className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                            >
                              <Camera size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={isSearchingGoogle || !bookIsbn.trim()}
                              onClick={() => lookupISBN()}
                              title={locale === 'th' ? 'ดึงข้อมูลจาก Google Books' : 'Fetch details from Google Books'}
                              className="px-2.5 py-1 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[11px] font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
                            >
                              {isSearchingGoogle ? <Loader2 size={12} className="animate-spin" /> : (locale === 'th' ? 'ค้นหา' : 'Search')}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Category */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                            {locale === 'th' ? 'หมวดหมู่' : 'Category'}
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsCustomCategory(!isCustomCategory)}
                            className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-medium"
                          >
                            {isCustomCategory
                              ? (locale === 'th' ? '← เลือกจากรายการ' : '← Choose from list')
                              : (locale === 'th' ? '+ กำหนดเอง' : '+ Custom')}
                          </button>
                        </div>

                        {isCustomCategory ? (
                          <input
                            type="text"
                            value={bookCategory}
                            onChange={(e) => setBookCategory(e.target.value)}
                            placeholder={locale === 'th' ? 'พิมพ์ชื่อหมวดหมู่ใหม่...' : 'Type custom category...'}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                          />
                        ) : (
                          <div className="relative">
                            <select
                              value={bookCategory}
                              onChange={(e) => {
                                if (e.target.value === '__custom__') {
                                  setIsCustomCategory(true)
                                } else {
                                  setBookCategory(e.target.value)
                                }
                              }}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors appearance-none cursor-pointer pr-10"
                            >
                              <option value="">{locale === 'th' ? '-- เลือกหมวดหมู่ --' : '-- Select Category --'}</option>
                              {allCategories.map((c) => (
                                <option key={c} value={c}>
                                  {getCategoryLabel(c, locale)}
                                </option>
                              ))}
                              <option value="__custom__">
                                {locale === 'th' ? '✏️ + พิมพ์หมวดหมู่ใหม่เอง...' : '✏️ + Type custom category...'}
                              </option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Publisher & Published Year */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          {locale === 'th' ? 'สำนักพิมพ์' : 'Publisher'}
                        </label>
                        <input
                          type="text"
                          value={bookPublisher}
                          onChange={(e) => setBookPublisher(e.target.value)}
                          placeholder={locale === 'th' ? 'สำนักพิมพ์...' : 'Publisher name...'}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          {locale === 'th' ? 'ปีที่พิมพ์ (พ.ศ. / ค.ศ.)' : 'Year Published'}
                        </label>
                        <input
                          type="number"
                          value={bookPublishedYear}
                          onChange={(e) => setBookPublishedYear(e.target.value)}
                          placeholder={locale === 'th' ? '2566 หรือ 2023' : '2023 or 2566'}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                        />
                      </div>
                    </div>

                    {/* Total Copies */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        {locale === 'th' ? 'จำนวนสำเนาทั้งหมด (เล่ม)' : 'Total Copies (Books)'}
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
                        {locale === 'th' ? 'คำอธิบาย / เรื่องย่อ' : 'Description / Synopsis'}
                      </label>
                      <textarea
                        rows={3}
                        value={bookDescription}
                        onChange={(e) => setBookDescription(e.target.value)}
                        placeholder={locale === 'th' ? 'รายละเอียดเนื้อหาโดยย่อ...' : 'Brief summary or synopsis...'}
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
                  {locale === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={savingBook}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-black text-white dark:bg-white dark:text-black hover:opacity-90 active:scale-98 transition-all disabled:opacity-50 shadow-sm"
                >
                  {savingBook
                    ? (locale === 'th' ? 'กำลังบันทึก...' : 'Saving...')
                    : editingBook
                    ? (locale === 'th' ? 'บันทึกการแก้ไข' : 'Save Changes')
                    : (locale === 'th' ? 'เพิ่มหนังสือ' : 'Add Book')}
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
