// app/admin/books/add/page.tsx
'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { ArrowLeft, Upload, BookOpen, Search, Camera, Scan } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const ISBNScanner = dynamic(() => import('@/components/ISBNScanner'), { ssr: false })

export default function AddBookPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isbnSearching, setIsbnSearching] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  const uploadRef = useRef<HTMLInputElement | null>(null)
  const cameraRef = useRef<HTMLInputElement | null>(null)

  const [form, setForm] = useState({
    title: '', author: '', isbn: '', description: '',
    category: '', publisher: '', published_year: '',
    total_copies: '1', is_featured: false,
  })

  function set(key: string, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function lookupISBN(isbn = form.isbn) {
    if (!isbn) return
    setIsbnSearching(true)
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`)
      const data = await res.json()
      fillFromGoogleBooks(data)
    } catch { }
    setIsbnSearching(false)
  }

  async function lookupTitle(title: string) {
    if (!title) return
    setIsbnSearching(true)
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}&maxResults=1`)
      const data = await res.json()
      fillFromGoogleBooks(data)
    } catch { }
    setIsbnSearching(false)
  }

  function fillFromGoogleBooks(data: any) {
    const info = data.items?.[0]?.volumeInfo
    if (info) {
      setForm(f => ({
        ...f,
        title: info.title || f.title,
        author: info.authors?.join(', ') || f.author,
        description: info.description || f.description,
        publisher: info.publisher || f.publisher,
        published_year: info.publishedDate?.slice(0, 4) || f.published_year,
        isbn: info.industryIdentifiers?.find((x: any) => x.type === 'ISBN_13')?.identifier || f.isbn,
      }))
      if (info.imageLinks?.thumbnail && !coverPreview) {
        setCoverPreview(info.imageLinks.thumbnail.replace('http:', 'https:'))
      }
    }
    // ไม่ alert ถ้าไม่เจอ เพราะ scan อัตโนมัติอาจผิด user แก้เองได้
  }

  async function handleOCRImage(file: File) {
    setOcrLoading(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const res = await fetch('/api/read-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mediaType: file.type || 'image/jpeg' }),
      })

      const data = await res.json()

      if (data.title) {
        set('title', data.title)
        await lookupTitle(data.title)
      }
      // ถ้าไม่เจอ ไม่ alert — user แก้เองในฟอร์มได้
    } catch (err) {
      console.error(err)
    }
    setOcrLoading(false)
  }

  // อัปโหลด/ถ่ายรูป → scan อัตโนมัติทันที
  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setCoverFile(f)
    setCoverPreview(URL.createObjectURL(f))
    e.target.value = ''
    handleOCRImage(f) // ← scan อัตโนมัติ
  }

  async function handleSubmit() {
    if (!form.title) { alert('กรุณากรอกชื่อหนังสือ'); return }
    setLoading(true)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== false) fd.append(k, String(v)) })
    if (coverFile) fd.append('cover', coverFile)
    const res = await fetch('/api/admin/books', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.error) { alert(data.error); setLoading(false); return }
    router.push('/admin/books')
  }

  const categories = ['อิสลาม', 'วิทยาศาสตร์', 'ประวัติศาสตร์', 'วรรณกรรม', 'ปรัชญา', 'ภาษา', 'อื่นๆ']

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      {/* hidden inputs */}
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCoverChange}
      />
      <input
        ref={(el) => {
          cameraRef.current = el
          if (el) el.setAttribute('capture', 'camera')
        }}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCoverChange}
      />

      <main className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/books" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">เพิ่มหนังสือใหม่</h1>
        </div>

        <div className="flex gap-6 items-start">

          {/* คอลัมน์ซ้าย */}
          <div className="w-64 shrink-0 space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-4 shadow-lg shadow-gray-200/50 dark:shadow-black/20">

              {/* รูปปก */}
              <div className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3 relative">
                {coverPreview ? (
                  <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <BookOpen size={32} className="text-gray-300" />
                    <span className="text-xs text-gray-400">ยังไม่มีรูปปก</span>
                  </div>
                )}
                {/* OCR loading overlay */}
                {ocrLoading && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 rounded-xl">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-white text-xs font-medium">กำลังอ่านปก...</span>
                  </div>
                )}
              </div>

              {/* ปุ่ม */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => uploadRef.current?.click()}
                  disabled={ocrLoading}
                  className="flex flex-col items-center gap-1 p-2.5 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl hover:border-green-400 disabled:opacity-50 transition-colors"
                >
                  <Upload size={16} className="text-gray-400" />
                  <span className="text-xs text-gray-500">อัปโหลด</span>
                </button>

                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  disabled={ocrLoading}
                  className="flex flex-col items-center gap-1 p-2.5 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 disabled:opacity-50 transition-colors"
                >
                  <Camera size={16} className="text-gray-400" />
                  <span className="text-xs text-gray-500">ถ่ายรูป</span>
                </button>
              </div>

              {/* hint */}
              <p className="text-xs text-center text-gray-400 mt-2">
                {ocrLoading ? '🔍 AI กำลังอ่านชื่อหนังสือ...' : 'อัปโหลดหรือถ่ายรูปปก → AI จะอ่านชื่ออัตโนมัติ'}
              </p>
            </div>

            {/* Scan Barcode */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-4 shadow-lg shadow-gray-200/50 dark:shadow-black/20 space-y-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">หรือสแกน ISBN</p>

              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="w-full flex items-center gap-2.5 p-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl transition-colors text-left"
              >
                <Scan size={18} className="text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">สแกน Barcode</p>
                  <p className="text-xs text-green-600 dark:text-green-500">ISBN จาก barcode หนังสือ</p>
                </div>
              </button>

              {isbnSearching && (
                <p className="text-xs text-center text-gray-400 animate-pulse">⏳ กำลังค้นหาข้อมูล...</p>
              )}
            </div>
          </div>

          {/* คอลัมน์ขวา */}
          <div className="flex-1 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 shadow-lg shadow-gray-200/50 dark:shadow-black/20">

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ISBN</label>
              <div className="flex gap-2">
                <input value={form.isbn} onChange={e => set('isbn', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && lookupISBN()}
                  placeholder="9789740000000 แล้วกด Enter" className="flex-1 input-field" />
                <button type="button" onClick={() => lookupISBN()} disabled={isbnSearching || !form.isbn}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
                  <Search size={15} />ค้น
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                ชื่อหนังสือ *
                {ocrLoading && <span className="ml-2 text-xs text-purple-500 animate-pulse">AI กำลังอ่าน...</span>}
              </label>
              <div className="flex gap-2">
                <input value={form.title} onChange={e => set('title', e.target.value)}
                  placeholder={ocrLoading ? 'กำลังอ่านชื่อจากปก...' : 'ชื่อหนังสือ'}
                  className="flex-1 input-field"
                  onKeyDown={e => e.key === 'Enter' && form.title && lookupTitle(form.title)} />
                <button type="button" onClick={() => lookupTitle(form.title)} disabled={isbnSearching || !form.title}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 disabled:opacity-50 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors">
                  <Search size={15} />ค้น
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">AI จะอ่านชื่อจากปกอัตโนมัติ หรือกรอกเองแล้วกด "ค้น"</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ผู้แต่ง</label>
              <input value={form.author} onChange={e => set('author', e.target.value)}
                placeholder="ชื่อผู้แต่ง" className="input-field w-full" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">คำอธิบาย</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                rows={3} placeholder="คำอธิบายสั้นๆ" className="input-field w-full resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">หมวดหมู่</label>
                <select value={form.category} onChange={e => set('category', e.target.value)} className="input-field w-full">
                  <option value="">เลือกหมวดหมู่</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">จำนวนเล่ม</label>
                <input type="number" min="1" value={form.total_copies}
                  onChange={e => set('total_copies', e.target.value)} className="input-field w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">สำนักพิมพ์</label>
                <input value={form.publisher} onChange={e => set('publisher', e.target.value)}
                  placeholder="สำนักพิมพ์" className="input-field w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ปีที่พิมพ์</label>
                <input type="number" value={form.published_year}
                  onChange={e => set('published_year', e.target.value)}
                  placeholder="2024" className="input-field w-full" />
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={form.is_featured as boolean}
                onChange={e => set('is_featured', e.target.checked)}
                className="w-4 h-4 rounded accent-green-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">⭐ แนะนำหนังสือ (แสดงใน "หนังสือแนะนำ")</span>
            </label>

            <button type="button" onClick={handleSubmit} disabled={loading || ocrLoading}
              className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors">
              {loading ? 'กำลังบันทึก...' : ocrLoading ? 'รอ AI อ่านปกก่อน...' : '+ เพิ่มหนังสือ'}
            </button>
          </div>
        </div>
      </main>

      {showScanner && (
        <ISBNScanner
          onDetected={async (isbn) => {
            setShowScanner(false)
            set('isbn', isbn)
            await lookupISBN(isbn)
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      <style jsx global>{`
        .input-field {
          padding: 0.625rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid rgb(229 231 235);
          background-color: rgb(249 250 251);
          color: rgb(17 24 39);
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-field:focus { border-color: rgb(34 197 94); }
        .dark .input-field {
          border-color: rgb(55 65 81);
          background-color: rgb(31 41 55);
          color: rgb(243 244 246);
        }
        .dark .input-field:focus { border-color: rgb(34 197 94); }
      `}</style>
    </div>
  )
}