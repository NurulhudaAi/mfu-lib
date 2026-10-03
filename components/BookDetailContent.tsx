'use client'
import { useState, useEffect, useTransition, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { format } from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import {
  BookOpen, Lock, Sparkles, Check, CheckCircle2,
  Pencil, Upload, X, MessageSquare, ArrowRight,
  ShieldCheck, AlertCircle, Camera, Scan, Search, Loader2, ImageIcon
} from 'lucide-react'
import { useApp } from '@/lib/app-context'
import BorrowButton from './BorrowButton'
import BookCard from './BookCard'

const ISBNScanner = dynamic(() => import('./ISBNScanner'), { ssr: false })

interface Props {
  book: any
  similarBooks?: any[]
  userId: string | null
  isAdmin?: boolean
  activeBorrow: { id: string; due_date: string } | null
  otherActiveBorrow?: { id: string; bookTitle: string } | null
  queueEntry: { id: string; position: number } | null
  queueCount: number
  totalBorrows?: number
}

export default function BookDetailContent({
  book,
  similarBooks = [],
  userId,
  isAdmin = false,
  activeBorrow,
  otherActiveBorrow = null,
  queueEntry,
  queueCount,
  totalBorrows = 0,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { t, locale, profile, showAlert } = useApp()

  const userIsAdmin = isAdmin || profile?.role === 'admin'
  const isDeactivated = book.is_active === false
  const isAvailable = !isDeactivated && book.available_copies > 0
  const dateLocale = locale === 'th' ? th : enUS

  // Admin In-Place Controls state
  const [mounted, setMounted] = useState(false)
  const [togglingActive, setTogglingActive] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock background body scroll when modal is open
  useEffect(() => {
    if (!isEditModalOpen) return

    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsEditModalOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isEditModalOpen])

  // Edit Form State
  const [editTitle, setEditTitle] = useState(book.title || '')
  const [editAuthor, setEditAuthor] = useState(book.author || '')
  const [editIsbn, setEditIsbn] = useState(book.isbn || '')
  const [editCategory, setEditCategory] = useState(book.category || 'ทั่วไป')
  const [editTotalCopies, setEditTotalCopies] = useState<number>(book.total_copies ?? 1)
  const [editAvailableCopies, setEditAvailableCopies] = useState<number>(book.available_copies ?? 1)
  const [editPublisher, setEditPublisher] = useState(book.publisher || '')
  const [editPublishedYear, setEditPublishedYear] = useState(book.published_year ? String(book.published_year) : '')
  const [editPages, setEditPages] = useState(book.pages || book.total_pages ? String(book.pages || book.total_pages) : '')
  const [editDescription, setEditDescription] = useState(book.description || '')
  const [editIsFeatured, setEditIsFeatured] = useState<boolean>(book.is_featured ?? false)
  const [editIsActive, setEditIsActive] = useState<boolean>(book.is_active !== false)
  const [editCoverUrl, setEditCoverUrl] = useState(book.cover_url || '')
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null)
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(book.cover_url || null)
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false)
  const [isOcrScanning, setIsOcrScanning] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const cameraOcrRef = useRef<HTMLInputElement | null>(null)
  const uploadFileRef = useRef<HTMLInputElement | null>(null)

  function handleRemoveCover() {
    setEditCoverUrl('')
    setEditCoverFile(null)
    setEditCoverPreview(null)
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

    if (info.title) setEditTitle(info.title)
    if (info.authors && info.authors.length > 0) setEditAuthor(info.authors.join(', '))
    if (info.publisher) setEditPublisher(info.publisher)
    if (info.publishedDate) setEditPublishedYear(info.publishedDate.slice(0, 4))
    if (info.description) setEditDescription(info.description)

    const isbn13 = info.industryIdentifiers?.find((x: any) => x.type === 'ISBN_13')?.identifier
    const isbn10 = info.industryIdentifiers?.find((x: any) => x.type === 'ISBN_10')?.identifier
    if (isbn13 || isbn10) setEditIsbn(isbn13 || isbn10)

    if (info.categories && info.categories.length > 0 && (!editCategory || editCategory === 'ทั่วไป')) {
      setEditCategory(info.categories[0])
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
      setEditCoverPreview(secureImg)
      setEditCoverUrl(secureImg)
      setEditCoverFile(null)
    }

    showAlert({
      type: 'success',
      title: 'ดึงข้อมูลสำเร็จ',
      message: `ดึงข้อมูลหนังสือ "${info.title}" จาก ${sourceDesc} สำเร็จแล้ว`,
    })
    return true
  }

  async function lookupISBN(customIsbn?: string) {
    const raw = customIsbn || editIsbn
    const cleaned = raw.replace(/[-\s]/g, '')
    if (!cleaned) {
      showAlert({
        type: 'warning',
        title: 'กรุณากรอก ISBN',
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
        title: 'ดึงข้อมูลไม่สำเร็จ',
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
        title: 'ดึงข้อมูลไม่สำเร็จ',
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
        setEditTitle(detectedTitle)
        await lookupTitle(detectedTitle)
      } else {
        showAlert({
          type: 'warning',
          title: 'ไม่พบข้อความปก',
          message: 'AI ไม่สามารถอ่านชื่อหนังสือจากภาพนี้ได้ กรุณากรอกชื่อหนังสือหรือลองถ่ายภาพใหม่อีกครั้ง',
        })
      }
    } catch (err: any) {
      showAlert({
        type: 'error',
        title: 'สแกนหน้าปกล้มเหลว',
        message: err.message || 'เกิดข้อผิดพลาดในการสแกนหน้าปก',
      })
    } finally {
      setIsOcrScanning(false)
    }
  }

  function openEditModal() {
    setEditTitle(book.title || '')
    setEditAuthor(book.author || '')
    setEditIsbn(book.isbn || '')
    setEditCategory(book.category || 'ทั่วไป')
    setEditTotalCopies(book.total_copies ?? 1)
    setEditAvailableCopies(book.available_copies ?? 1)
    setEditPublisher(book.publisher || '')
    setEditPublishedYear(book.published_year ? String(book.published_year) : '')
    setEditPages(book.pages || book.total_pages ? String(book.pages || book.total_pages) : '')
    setEditDescription(book.description || '')
    setEditIsFeatured(book.is_featured ?? false)
    setEditIsActive(book.is_active !== false)
    setEditCoverUrl(book.cover_url || '')
    setEditCoverFile(null)
    setEditCoverPreview(book.cover_url || null)
    setEditError(null)
    setIsSearchingGoogle(false)
    setIsOcrScanning(false)
    setShowScanner(false)
    setIsEditModalOpen(true)
  }

  // Quick toggle active / inactive for admin
  async function handleToggleActive() {
    setTogglingActive(true)
    try {
      const newActive = isDeactivated
      const res = await fetch(`/api/admin/books/${book.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newActive }),
      })
      if (res.ok) {
        startTransition(() => {
          router.refresh()
        })
      } else {
        const data = await res.json()
        showAlert({
          type: 'error',
          title: 'ไม่สามารถเปลี่ยนสถานะได้',
          message: data.error || 'ไม่สามารถเปลี่ยนสถานะหนังสือได้',
        })
      }
    } catch (_) {
      showAlert({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว',
      })
    } finally {
      setTogglingActive(false)
    }
  }

  // Save edited book details
  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTitle.trim()) {
      setEditError('กรุณาระบุชื่อหนังสือ')
      return
    }

    setSavingEdit(true)
    setEditError(null)

    try {
      if (editCoverFile) {
        const formData = new FormData()
        formData.append('title', editTitle.trim())
        formData.append('author', editAuthor.trim())
        formData.append('isbn', editIsbn.trim())
        formData.append('category', editCategory)
        formData.append('total_copies', String(editTotalCopies))
        formData.append('available_copies', String(editAvailableCopies))
        formData.append('publisher', editPublisher.trim())
        formData.append('published_year', editPublishedYear.trim())
        formData.append('description', editDescription.trim())
        formData.append('is_featured', String(editIsFeatured))
        formData.append('is_active', String(editIsActive))
        formData.append('cover', editCoverFile)

        const res = await fetch(`/api/admin/books/${book.id}`, {
          method: 'PUT',
          body: formData,
        })
        const data = await res.json()
        if (!res.ok) {
          setEditError(data.error || 'บันทึกข้อมูลไม่สำเร็จ')
          return
        }
      } else {
        const payload: Record<string, any> = {
          title: editTitle.trim(),
          author: editAuthor.trim() || null,
          isbn: editIsbn.trim() || null,
          category: editCategory || null,
          total_copies: editTotalCopies,
          available_copies: editAvailableCopies,
          publisher: editPublisher.trim() || null,
          published_year: editPublishedYear ? Number(editPublishedYear) : null,
          description: editDescription.trim() || null,
          is_featured: editIsFeatured,
          is_active: editIsActive,
          cover_url: editCoverUrl.trim() || null,
        }

        const res = await fetch(`/api/admin/books/${book.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) {
          setEditError(data.error || 'บันทึกข้อมูลไม่สำเร็จ')
          return
        }
      }

      setIsEditModalOpen(false)
      startTransition(() => {
        router.refresh()
      })
    } catch (_) {
      setEditError('เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว')
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 sm:p-8 lg:p-10 space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs sm:text-sm text-neutral-400 dark:text-neutral-500 mb-6 flex-wrap">
        <Link href="/" className="hover:text-black dark:hover:text-white transition-colors">
          {t('home') ?? 'หน้าแรก'}
        </Link>
        <span>›</span>
        <Link href="/books" className="hover:text-black dark:hover:text-white transition-colors">
          {t('allBooks') ?? 'หนังสือ'}
        </Link>
        {book.category && (
          <>
            <span>›</span>
            <Link
              href={`/books?category=${encodeURIComponent(book.category)}`}
              className="hover:text-gray-700 dark:text-gray-300 transition-colors"
            >
              {book.category}
            </Link>
          </>
        )}
        <span>›</span>
        <span className="text-neutral-600 dark:text-neutral-300 truncate max-w-[200px]">{book.title}</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ── Left: Cover (Realistic 3D Hardcover) ── */}
        <div className="flex-shrink-0 flex flex-col items-center gap-4 lg:w-[260px]">
          <div className="relative w-full max-w-[240px] book-stage book-card pt-1 pb-2">
            {/* Floating Bookmark Ribbon */}
            <div className="absolute -top-1 right-6 z-20 pointer-events-none">
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

            <div className={`book-3d group cursor-pointer ${isDeactivated ? 'opacity-75 saturate-50' : !isAvailable ? 'filter saturate-[0.88]' : ''}`}>
              {/* Back cover */}
              <div className="book-back-cover" />

              {/* Page block */}
              <div className="book-pages flex flex-col justify-between p-3 select-none relative">
                <div className="space-y-1 opacity-70">
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
                    <div className="border-2 border-neutral-400 text-neutral-500 dark:border-neutral-500 dark:text-neutral-400 -rotate-12 px-2.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase font-mono shadow-xs">
                      {locale === 'th' ? 'ปิดใช้งาน' : 'INACTIVE'}
                    </div>
                  </div>
                ) : !isAvailable && (
                  <div className="my-auto py-1 flex items-center justify-center">
                    <div className="border-2 border-red-500/70 text-red-600/80 -rotate-12 px-2.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase font-mono shadow-xs">
                      {locale === 'th' ? 'ถูกยืมแล้ว' : 'BORROWED'}
                    </div>
                  </div>
                )}

                {isAvailable && !isDeactivated && (
                  <div className="space-y-1 opacity-40">
                    <div className="h-1 bg-neutral-400 rounded-full w-4/5" />
                    <div className="h-1 bg-neutral-400 rounded-full w-full" />
                    <div className="h-1 bg-neutral-400 rounded-full w-3/4" />
                  </div>
                )}

                <div className="text-[7px] text-neutral-400 text-right font-mono opacity-60">
                  Page 1
                </div>
                <div className="book-pages-edge" />
              </div>

              {/* Front cover */}
              <div className="book-front-cover relative">
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col justify-between p-4 bg-gradient-to-br from-neutral-800 via-neutral-900 to-neutral-950 text-white select-none">
                    <div className="flex justify-between items-start">
                      <div className="w-6 h-6 rounded-full border border-neutral-700/60 flex items-center justify-center text-[10px] font-serif text-neutral-400">
                        MFU
                      </div>
                      <BookOpen size={16} className="text-neutral-400" />
                    </div>
                    <div className="my-auto py-2">
                      <p className="text-sm font-serif font-bold tracking-tight text-neutral-100 leading-snug line-clamp-3 text-center">
                        {book.title}
                      </p>
                      {book.author && (
                        <p className="text-xs text-neutral-400 text-center mt-1 truncate">
                          {book.author}
                        </p>
                      )}
                    </div>
                    <div className="text-[9px] text-center text-neutral-500 uppercase tracking-widest border-t border-neutral-800/80 pt-1">
                      {book.category || 'Library Collection'}
                    </div>
                  </div>
                )}
                <div className="book-crease" />
                <div className="book-hinge" />
                <div className="book-sheen" />

                {/* Japanese Obi Strip (สายคาดหนังสือ) */}
                {isDeactivated ? (
                  <div className="absolute bottom-4 inset-x-0 bg-neutral-900/90 dark:bg-black/95 backdrop-blur-xs py-1.5 px-3 z-20 flex items-center justify-between text-white shadow-sm border-y border-white/10 pointer-events-none">
                    <span className="flex items-center gap-1.5 text-[9px] font-bold tracking-wider uppercase text-neutral-300">
                      <Lock size={10} className="text-neutral-400" />
                      <span>{locale === 'th' ? 'ปิดใช้งาน' : 'Disabled'}</span>
                    </span>
                    <span className="text-[9px] text-neutral-400">
                      {locale === 'th' ? 'งดยืม' : 'Inactive'}
                    </span>
                  </div>
                ) : !isAvailable && (
                  <div className="absolute bottom-4 inset-x-0 bg-neutral-950/85 dark:bg-black/90 backdrop-blur-xs py-1.5 px-3 z-20 flex items-center justify-between text-white shadow-sm border-y border-white/10 pointer-events-none">
                    <span className="flex items-center gap-1.5 text-[9px] font-bold tracking-wider uppercase text-neutral-200">
                      <Lock size={10} className="text-amber-400" />
                      <span>{locale === 'th' ? 'ยืมครบแล้ว' : 'All Borrowed'}</span>
                    </span>
                    <span className="text-[9px] font-mono text-neutral-400">
                      0/{book.total_copies} {locale === 'th' ? 'เล่ม' : 'copies'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Info ── */}
        <div className="flex-1 min-w-0">
          {/* Title & Status */}
          <div className="flex flex-wrap items-center gap-2.5 mb-1">
            <h1 className="font-bold text-2xl sm:text-3xl text-neutral-900 dark:text-white leading-tight tracking-tight">
              {book.title}
            </h1>
            {isDeactivated && (
              <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 px-2 py-0.5 rounded-lg">
                <Lock size={11} />
                <span>{locale === 'th' ? 'ปิดใช้งาน' : 'Disabled'}</span>
              </span>
            )}
          </div>

          {/* Author */}
          {book.author && (
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-4">
              {locale === 'th' ? 'โดย' : 'by'} :{' '}
              <span className="text-neutral-800 dark:text-neutral-200 font-semibold">{book.author}</span>
            </p>
          )}

          {/* Publisher */}
          {book.publisher && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5">
              <span className="font-medium text-neutral-600 dark:text-neutral-300">
                {locale === 'th' ? 'สำนักพิมพ์' : 'Publisher'}:
              </span>{' '}
              {book.publisher}
            </p>
          )}

          {/* ── ACTION SECTION: ADMIN CONTROLS vs USER BORROW BUTTON ── */}
          {userIsAdmin ? (
            <div className="bg-neutral-50 dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 mb-6 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-900 dark:bg-white" />
                  <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    การจัดการสำหรับผู้ดูแลระบบ (Admin Controls)
                  </span>
                </div>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 bg-neutral-200/60 dark:bg-neutral-800 px-2.5 py-0.5 rounded-full">
                  แอดมินดูเล่มนี้ได้ แต่ไม่สามารถกดยืมได้
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Edit Button */}
                <button
                  type="button"
                  onClick={openEditModal}
                  className="flex-1 min-w-[150px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs sm:text-sm font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                >
                  <Pencil size={15} />
                  แก้ไขข้อมูลหนังสือ
                </button>

                {/* Toggle Active Button */}
                <button
                  type="button"
                  onClick={handleToggleActive}
                  disabled={togglingActive}
                  className={`flex-1 min-w-[150px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${
                    isDeactivated
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'
                      : 'bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white border-neutral-300 dark:border-neutral-700'
                  }`}
                >
                  {isDeactivated ? (
                    <>
                      <CheckCircle2 size={15} />
                      <span>{togglingActive ? 'กำลังเปิดใช้งาน...' : 'เปิดใช้งานหนังสือ'}</span>
                    </>
                  ) : (
                    <>
                      <Lock size={15} />
                      <span>{togglingActive ? 'กำลังปิดใช้งาน...' : 'ปิดใช้งานหนังสือ'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Regular user borrow button */
            <div className="flex gap-3 mb-6">
              <div className="flex-[1]">
                <BorrowButton
                  book={book}
                  userId={userId}
                  currentBorrow={activeBorrow}
                  otherActiveBorrow={otherActiveBorrow}
                  queueEntry={queueEntry}
                  queueCount={queueCount}
                />
              </div>
            </div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-px bg-neutral-200 dark:bg-neutral-800 rounded-2xl overflow-hidden mb-6">
            {/* คงเหลือ */}
            <div className="bg-white dark:bg-neutral-900 py-4 flex flex-col items-center gap-0.5">
              <span className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">
                {locale === 'th' ? 'คงเหลือ' : 'Available'}
              </span>
              <span
                className={`text-2xl font-bold tabular-nums ${
                  isDeactivated
                    ? 'text-neutral-400 dark:text-neutral-500'
                    : isAvailable
                    ? 'text-neutral-900 dark:text-white'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {isDeactivated ? '-' : `${book.available_copies}/${book.total_copies}`}
              </span>
              {isDeactivated ? (
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
                  {locale === 'th' ? 'ปิดการใช้งาน' : 'Disabled'}
                </span>
              ) : !isAvailable ? (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  {locale === 'th' ? 'ยืมครบแล้ว' : 'Out of stock'}
                </span>
              ) : null}
            </div>

            {/* รอคิว */}
            <div className="bg-white dark:bg-neutral-900 py-4 flex flex-col items-center gap-0.5">
              <span className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">
                {locale === 'th' ? 'รอคิว' : 'Queue'}
              </span>
              <span className="text-2xl font-bold tabular-nums text-neutral-900 dark:text-white">{queueCount}</span>
              {queueCount > 0 && (
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 text-center leading-tight">
                  {locale === 'th'
                    ? `ประมาณ ${Math.ceil(queueCount * 14)} วัน`
                    : `~${Math.ceil(queueCount * 14)} days`}
                </span>
              )}
            </div>

            {/* ยืมแล้ว */}
            <div className="bg-white dark:bg-neutral-900 py-4 flex flex-col items-center gap-0.5">
              <span className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">
                {locale === 'th' ? 'ยืมแล้ว' : 'Borrowed'}
              </span>
              <span className="text-2xl font-bold tabular-nums text-neutral-900 dark:text-white">{totalBorrows}</span>
            </div>
          </div>

          {/* Active borrow due date */}
          {activeBorrow && !userIsAdmin && (
            <div className="bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3 mb-5 text-sm text-neutral-900 dark:text-neutral-100 font-semibold">
              📅 {t('dueDate')}:{' '}
              {format(new Date(activeBorrow.due_date), 'dd MMM yyyy', { locale: dateLocale })}
            </div>
          )}

          {/* File / Book metadata */}
          {(book.file_size || book.file_format || book.pages || book.total_pages) && (
            <div className="grid grid-cols-3 gap-px bg-neutral-200 dark:bg-neutral-800 rounded-2xl overflow-hidden mb-6">
              {book.file_size && (
                <div className="bg-white dark:bg-neutral-900 py-4 flex flex-col items-center gap-0.5">
                  <span className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">
                    {locale === 'th' ? 'ขนาดไฟล์' : 'File size'}
                  </span>
                  <span className="text-xl font-bold text-neutral-900 dark:text-white">{book.file_size}</span>
                </div>
              )}
              {(book.file_format || book.format) && (
                <div className="bg-white dark:bg-neutral-900 py-4 flex flex-col items-center gap-0.5">
                  <span className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">
                    {locale === 'th' ? 'รูปแบบไฟล์' : 'Format'}
                  </span>
                  <span className="text-xl font-bold text-neutral-900 dark:text-white uppercase">
                    {book.file_format ?? book.format}
                  </span>
                </div>
              )}
              {(book.pages || book.total_pages) && (
                <div className="bg-white dark:bg-neutral-900 py-4 flex flex-col items-center gap-0.5">
                  <span className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">
                    {locale === 'th' ? 'จำนวนหน้า' : 'Pages'}
                  </span>
                  <span className="text-xl font-bold text-neutral-900 dark:text-white">
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
                  className="px-4 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-700 dark:text-neutral-300 hover:border-black dark:hover:border-white transition-colors"
                >
                  {book.category}
                </Link>
              )}
              {Array.isArray(book.tags) &&
                book.tags.map((tag: string) => (
                  <Link
                    key={tag}
                    href={`/books?tag=${encodeURIComponent(tag)}`}
                    className="px-4 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-700 dark:text-neutral-300 hover:border-black dark:hover:border-white transition-colors"
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
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-3">
            {locale === 'th' ? 'เรื่องย่อ' : 'Description'}
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-line">
            {book.description}
          </p>
        </section>
      )}

      {/* ── Additional details (ISBN, year) ── */}
      {(book.isbn || book.published_year) && (
        <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap gap-6 text-sm text-neutral-500 dark:text-neutral-400">
          {book.isbn && (
            <span>
              <span className="font-medium text-neutral-600 dark:text-neutral-300">ISBN:</span>{' '}
              <span className="font-mono">{book.isbn}</span>
            </span>
          )}
          {book.published_year && (
            <span>
              <span className="font-medium text-neutral-600 dark:text-neutral-300">
                {locale === 'th' ? 'ปีที่พิมพ์' : 'Year'}:
              </span>{' '}
              {book.published_year}
            </span>
          )}
        </div>
      )}

      {/* ── Regular User Feedback Prompt ── */}
      {!userIsAdmin && (
        <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-200/80 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 shrink-0">
              <MessageSquare size={18} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
                มีข้อเสนอแนะเกี่ยวกับหนังสือเล่มนี้?
              </p>
              <p className="text-[11px] sm:text-xs text-neutral-400">
                แจ้งปัญหาเกี่ยวกับหนังสือเล่มนี้ หรือเสนอแนะข้อคิดเห็นให้เจ้าหน้าที่
              </p>
            </div>
          </div>
          <Link
            href={`/feedback?category=book_request&title=${encodeURIComponent(book.title)}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:border-black dark:hover:border-white transition-all shadow-xs"
          >
            <span>ส่งข้อเสนอแนะ</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* ── SIMILAR BOOKS RECOMMENDATION SHELF ── */}
      {similarBooks && similarBooks.length > 0 && (
        <section className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
                <Sparkles size={18} className="stroke-[2.5]" />
                <span>
                  {locale === 'th' ? 'หนังสือที่เกี่ยวข้องที่คุณอาจสนใจ' : 'Similar Books You May Like'}
                </span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {book.category
                  ? locale === 'th'
                    ? `หนังสือหมวดหมู่เดียวกัน "${book.category}" และเนื้อหาใกล้เคียง`
                    : `Books in "${book.category}" category and related titles`
                  : locale === 'th'
                  ? 'หนังสือแนะนำเพิ่มเติมที่คุณอาจสนใจ'
                  : 'More books you might be interested in'}
              </p>
            </div>
            {book.category && (
              <Link
                href={`/books?category=${encodeURIComponent(book.category)}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors"
              >
                <span>{locale === 'th' ? 'ดูหมวดหมู่นี้' : 'View Category'}</span>
                <ArrowRight size={14} />
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-7">
            {similarBooks.map((simBook, idx) => (
              <BookCard key={simBook.id} book={simBook} animDelay={idx} />
            ))}
          </div>
        </section>
      )}

      {/* ── ADMIN EDIT BOOK MODAL (PORTAL TO DOCUMENT.BODY) ── */}
      {mounted && isEditModalOpen && createPortal(
        <div
          className="fixed inset-0 w-screen h-[100dvh] z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditModalOpen(false)
          }}
        >
          <div className="w-[calc(100vw-24px)] md:w-[min(940px,calc(100vw-32px))] xl:w-[min(1040px,calc(100vw-48px))] max-h-[calc(100dvh-24px)] md:max-h-[calc(100dvh-40px)] bg-white dark:bg-[#161619] rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden animate-scale-in">
            <form onSubmit={handleSaveEdit} className="flex flex-col h-full max-h-[inherit] overflow-hidden">
              {/* 1. FIXED MODAL HEADER */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-neutral-100 dark:border-neutral-800 shrink-0 bg-white dark:bg-[#161619]">
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white shrink-0">
                    <Pencil size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white truncate">
                      แก้ไขข้อมูลหนังสือ
                    </h3>
                    <p className="text-xs text-neutral-400 truncate">
                      อัปเดตข้อมูลรายละเอียดหนังสือในระบบ
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 2. SCROLLABLE MODAL CONTENT (HORIZONTAL 2-COLUMN LAYOUT) */}
              <div className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* ── LEFT COLUMN: BOOK COVER & TOGGLES (5 cols) ── */}
                  <div className="md:col-span-5 space-y-4">
                    {/* Cover Art Box */}
                    <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                          <Upload size={13} />
                          <span>รูปภาพหน้าปก</span>
                        </label>
                        {editCoverUrl && !editCoverFile && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            ✓ จาก Google Books
                          </span>
                        )}
                      </div>

                      {/* Prominent Cover Image Preview */}
                      <div className="relative aspect-[3/4] max-h-72 w-full rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shadow-inner group">
                        {editCoverPreview ? (
                          <>
                            <img src={editCoverPreview} alt="Cover preview" className="w-full h-full object-cover" />
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
                      <div className="flex gap-2">
                        <label className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-xs text-center">
                          <Upload size={13} />
                          <span>เลือกไฟล์ภาพปก</span>
                          <input
                            ref={uploadFileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0] || null
                              if (file) {
                                setEditCoverFile(file)
                                setEditCoverPreview(URL.createObjectURL(file))
                                setEditCoverUrl('')
                              }
                            }}
                          />
                        </label>
                      </div>

                      <input
                        type="url"
                        value={editCoverUrl}
                        onChange={e => {
                          setEditCoverUrl(e.target.value)
                          setEditCoverPreview(e.target.value || null)
                          setEditCoverFile(null)
                        }}
                        placeholder="https://... ลิงก์รูปภาพ หรือดึงจาก Google"
                        className="w-full px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-[11px] text-neutral-900 dark:text-white outline-none focus:border-neutral-900 dark:focus:border-white transition-colors"
                      />
                    </div>

                    {/* Toggles */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editIsFeatured}
                          onChange={e => setEditIsFeatured(e.target.checked)}
                          className="rounded border-neutral-300 text-black focus:ring-black"
                        />
                        <div>
                          <span className="text-xs font-semibold text-neutral-900 dark:text-white block">หนังสือแนะนำ (Featured)</span>
                          <span className="text-[10px] text-neutral-400">แสดงป้าย New Arrival ในแท็บแนะนำ</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editIsActive}
                          onChange={e => setEditIsActive(e.target.checked)}
                          className="rounded border-neutral-300 text-black focus:ring-black"
                        />
                        <div>
                          <span className="text-xs font-semibold text-neutral-900 dark:text-white block">เปิดใช้งาน (Active)</span>
                          <span className="text-[10px] text-neutral-400">อนุญาตให้สมาชิกค้นหาและยืมได้</span>
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
                              setEditCoverFile(file)
                              setEditCoverPreview(URL.createObjectURL(file))
                              setEditCoverUrl('')
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
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          ชื่อหนังสือ *
                        </label>
                        {editTitle.trim() && (
                          <button
                            type="button"
                            disabled={isSearchingGoogle}
                            onClick={() => lookupTitle(editTitle)}
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
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-neutral-900 dark:focus:border-white"
                      />
                    </div>

                    {/* Author */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        ผู้แต่ง
                      </label>
                      <input
                        type="text"
                        value={editAuthor}
                        onChange={e => setEditAuthor(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-neutral-900 dark:focus:border-white"
                      />
                    </div>

                    {/* Category & ISBN */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          หมวดหมู่
                        </label>
                        <input
                          type="text"
                          value={editCategory}
                          onChange={e => setEditCategory(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-neutral-900 dark:focus:border-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          ISBN
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={editIsbn}
                            onChange={e => setEditIsbn(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                lookupISBN()
                              }
                            }}
                            placeholder="978-..."
                            className="w-full px-3.5 py-2.5 pr-20 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-neutral-900 dark:focus:border-white font-mono"
                          />
                          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setShowScanner(true)}
                              title="สแกน Barcode หลังปก"
                              className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                            >
                              <Camera size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={isSearchingGoogle || !editIsbn.trim()}
                              onClick={() => lookupISBN()}
                              title="ดึงข้อมูลจาก Google Books"
                              className="px-2.5 py-1 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[11px] font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
                            >
                              {isSearchingGoogle ? <Loader2 size={12} className="animate-spin" /> : 'ค้นหา'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Copies (Total & Available) */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                          จำนวนเล่มทั้งหมด
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={editTotalCopies}
                          onChange={e => setEditTotalCopies(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-neutral-900 dark:focus:border-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                          จำนวนเล่มที่ว่าง
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={editAvailableCopies}
                          onChange={e => setEditAvailableCopies(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-neutral-900 dark:focus:border-white"
                        />
                      </div>
                    </div>

                    {/* Publisher & Published Year */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                          สำนักพิมพ์
                        </label>
                        <input
                          type="text"
                          value={editPublisher}
                          onChange={e => setEditPublisher(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-neutral-900 dark:focus:border-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                          ปีที่พิมพ์
                        </label>
                        <input
                          type="number"
                          value={editPublishedYear}
                          onChange={e => setEditPublishedYear(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-neutral-900 dark:focus:border-white"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        เรื่องย่อ / คำอธิบาย
                      </label>
                      <textarea
                        rows={3}
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                        className="w-full p-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-neutral-900 dark:focus:border-white resize-none"
                      />
                    </div>

                    {editError && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                        <AlertCircle size={14} />
                        {editError}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. FIXED MODAL FOOTER */}
              <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 shrink-0 flex items-center justify-end gap-2.5 bg-neutral-50/70 dark:bg-neutral-900/70">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black transition-all disabled:opacity-50 shadow-sm"
                >
                  {savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {mounted && showScanner && (
        <ISBNScanner
          onDetected={(isbn) => {
            setShowScanner(false)
            setEditIsbn(isbn)
            lookupISBN(isbn)
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}