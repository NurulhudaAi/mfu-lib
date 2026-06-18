'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Plus, Trash2, Star, ArrowLeft, Search, Pencil, X, Upload, ToggleLeft, ToggleRight, Tag } from 'lucide-react'

interface Props {
  books: any[]
  categories: string[]  // ✅ รับ categories จาก DB ผ่าน props
}

// ✅ ลบ DEFAULT_CATEGORIES และ STORAGE_KEY ออก ไม่ใช้ localStorage แล้ว
function useCategories(initialCategories: string[]) {
  const [categories, setCategories] = useState<string[]>(initialCategories)

  function addCategory(name: string) {
    const trimmed = name.trim()
    if (!trimmed || categories.includes(trimmed)) return false
    setCategories(prev => [...prev, trimmed])
    return true
  }

  function deleteCategory(name: string) {
    setCategories(prev => prev.filter(c => c !== name))
  }

  return { categories, addCategory, deleteCategory }
}

export default function AdminBooksContent({ books, categories: initialCategories }: Props) {
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editing, setEditing] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [showCatManager, setShowCatManager] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const { categories, addCategory, deleteCategory } = useCategories(initialCategories)  // ✅ ส่ง initialCategories เข้าไป
  const router = useRouter()

  const filtered = books.filter(b =>
    !search ||
    b.title?.toLowerCase().includes(search.toLowerCase()) ||
    b.author?.toLowerCase().includes(search.toLowerCase())
  )

  function openEdit(book: any) {
    setEditing({ ...book })
    setCoverFile(null)
    setCoverPreview(book.cover_url || null)
  }

  function closeEdit() {
    setEditing(null)
    setCoverFile(null)
    setCoverPreview(null)
  }

  async function handleDelete(bookId: string) {
    if (!confirm('ลบหนังสือเล่มนี้?')) return
    setDeleting(bookId)
    const res = await fetch(`/api/admin/books/${bookId}`, { method: 'DELETE' })
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'ลบไม่สำเร็จ')
      setDeleting(null)
    }
  }

  async function toggleFeatured(bookId: string, current: boolean) {
    await fetch(`/api/admin/books/${bookId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_featured: !current }),
    })
    router.refresh()
  }

  async function toggleActive(bookId: string, current: boolean) {
    const res = await fetch(`/api/admin/books/${bookId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    const data = await res.json()
    console.log('toggleActive response:', res.status, data)
    if (res.ok) router.refresh()
    else alert('เปลี่ยนสถานะไม่สำเร็จ')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    try {
      if (coverFile) {
        const fd = new FormData()
        Object.entries(editing).forEach(([k, v]) => {
          if (v !== null && v !== undefined) fd.append(k, String(v))
        })
        fd.append('cover', coverFile)
        const res = await fetch(`/api/admin/books/${editing.id}`, { method: 'PUT', body: fd })
        if (res.ok) { closeEdit(); router.refresh() }
        else { const d = await res.json().catch(() => ({})); alert(d.error || 'บันทึกไม่สำเร็จ') }
      } else {
        const res = await fetch(`/api/admin/books/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: editing.title, author: editing.author, category: editing.category,
            description: editing.description, publisher: editing.publisher,
            published_year: editing.published_year, isbn: editing.isbn,
            total_copies: editing.total_copies, available_copies: editing.available_copies,
          }),
        })
        if (res.ok) { closeEdit(); router.refresh() }
        else { const d = await res.json().catch(() => ({})); alert(d.error || 'บันทึกไม่สำเร็จ') }
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/dashboard" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">จัดการหนังสือ</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{books.length} เล่มทั้งหมด</p>
        </div>
        <button
          onClick={() => setShowCatManager(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors"
        >
          <Tag size={16} />
          หมวดหมู่
        </button>
        <Link
          href="/admin/books/add"
          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          เพิ่มหนังสือ
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาหนังสือ..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:border-green-500 outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">หนังสือ</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 hidden md:table-cell">หมวดหมู่</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">จำนวน</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">แนะนำ</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">สถานะ</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  <BookOpen size={36} className="mx-auto mb-2 opacity-20" />
                  ไม่พบหนังสือ
                </td>
              </tr>
            ) : filtered.map(book => (
              <tr
                key={book.id}
                className={`border-b border-gray-50 dark:border-gray-800 transition-colors ${
                  book.is_active === false
                    ? 'opacity-50 bg-gray-50/50 dark:bg-gray-800/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                      {book.cover_url ? (
                        <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen size={14} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{book.title}</p>
                      {book.author && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{book.author}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                  {book.category || '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-sm font-medium ${book.available_copies > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {book.available_copies}/{book.total_copies}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleFeatured(book.id, book.is_featured)}
                    className={`p-1.5 rounded-lg transition-colors ${book.is_featured ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'}`}
                  >
                    <Star size={16} fill={book.is_featured ? 'currentColor' : 'none'} />
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleActive(book.id, book.is_active !== false)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      book.is_active === false
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-red-50 hover:text-red-500'
                        : 'bg-green-50 dark:bg-green-950/30 text-green-600 hover:bg-gray-100 hover:text-gray-500'
                    }`}
                  >
                    {book.is_active === false
                      ? <><ToggleLeft size={14} /> ปิด</>
                      : <><ToggleRight size={14} /> เปิด</>
                    }
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => openEdit(book)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(book.id)}
                      disabled={deleting === book.id}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Category Manager Modal ── */}
      {showCatManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">จัดการหมวดหมู่</h2>
              <button onClick={() => setShowCatManager(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {/* เพิ่มหมวดหมู่ใหม่ */}
              <div className="flex gap-2">
                <input
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (addCategory(newCatName)) setNewCatName('')
                      else alert('หมวดหมู่นี้มีอยู่แล้ว')
                    }
                  }}
                  placeholder="ชื่อหมวดหมู่ใหม่"
                  className="flex-1 input-field"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (addCategory(newCatName)) setNewCatName('')
                    else alert('หมวดหมู่นี้มีอยู่แล้ว')
                  }}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* รายการหมวดหมู่ */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{cat}</span>
                    <button
                      onClick={() => {
                        if (confirm(`ลบหมวดหมู่ "${cat}"?`)) deleteCategory(cat)
                      }}
                      className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">แก้ไขหนังสือ</h2>
              <button onClick={closeEdit} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">

                {/* Cover */}
                <div className="flex gap-4 items-start">
                  <div className="w-20 h-28 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                    {coverPreview ? (
                      <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={20} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                  <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:border-green-400 transition-colors p-4 text-center h-28">
                    <Upload size={18} className="text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">เปลี่ยนรูปปก</span>
                    <input type="file" accept="image/*" onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) { setCoverFile(f); setCoverPreview(URL.createObjectURL(f)) }
                    }} className="hidden" />
                  </label>
                </div>

                <Field label="ชื่อหนังสือ *">
                  <input required value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} className="input-field w-full" />
                </Field>

                <Field label="ผู้แต่ง">
                  <input value={editing.author || ''} onChange={e => setEditing({ ...editing, author: e.target.value })} className="input-field w-full" />
                </Field>

                <Field label="คำอธิบาย">
                  <textarea value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={3} className="input-field w-full resize-none" />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="หมวดหมู่">
                    <select value={editing.category || ''} onChange={e => setEditing({ ...editing, category: e.target.value })} className="input-field w-full">
                      <option value="">เลือกหมวดหมู่</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="ISBN">
                    <input value={editing.isbn || ''} onChange={e => setEditing({ ...editing, isbn: e.target.value })} className="input-field w-full" />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="สำนักพิมพ์">
                    <input value={editing.publisher || ''} onChange={e => setEditing({ ...editing, publisher: e.target.value })} className="input-field w-full" />
                  </Field>
                  <Field label="ปีที่พิมพ์">
                    <input type="number" value={editing.published_year || ''} onChange={e => setEditing({ ...editing, published_year: e.target.value })} className="input-field w-full" />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="จำนวนทั้งหมด">
                    <input type="number" min={1} value={editing.total_copies ?? 1} onChange={e => setEditing({ ...editing, total_copies: +e.target.value })} className="input-field w-full" />
                  </Field>
                  <Field label="จำนวนว่าง">
                    <input type="number" min={0} value={editing.available_copies ?? 0} onChange={e => setEditing({ ...editing, available_copies: +e.target.value })} className="input-field w-full" />
                  </Field>
                </div>
              </div>

              <div className="flex gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
                <button type="button" onClick={closeEdit} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  ยกเลิก
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input-field {
          padding: 0.5rem 0.75rem;
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
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  )
}