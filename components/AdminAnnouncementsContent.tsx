'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Megaphone, X } from 'lucide-react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

interface Announcement {
  id: string
  title: string
  title_en?: string
  body: string
  body_en?: string
  type: 'info' | 'warning' | 'success'
  created_at: string
}

export default function AdminAnnouncementsContent({ announcements }: { announcements: Announcement[] }) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '', title_en: '', body: '', body_en: '', type: 'info' as const, imageUrl: ''
  })
  const router = useRouter()

  const PRESET_IMAGES = [
    { label: '🏛️ ห้องสมุด', url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80' },
    { label: '📚 หนังสือ', url: 'https://images.unsplash.com/photo-1507842229446-51f78713d334?auto=format&fit=crop&w=1200&q=80' },
    { label: '✨ โมเดิร์น', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80' },
  ]

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    let finalBody = form.body.trim()
    if (form.imageUrl && form.imageUrl.trim()) {
      finalBody += `\n\n[image: ${form.imageUrl.trim()}]`
    }

    const res = await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        title_en: form.title_en,
        body: finalBody,
        body_en: form.body_en,
        type: form.type,
      }),
    })
    if (res.ok) {
      setShowForm(false)
      setForm({ title: '', title_en: '', body: '', body_en: '', type: 'info', imageUrl: '' })
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'เพิ่มไม่สำเร็จ')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('ลบประกาศนี้?')) return
    setDeleting(id)
    const res = await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
    else alert('ลบไม่สำเร็จ')
    setDeleting(null)
  }

  return (
    <div className="w-full p-6 sm:p-8 lg:p-10 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">ประกาศระบบ</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{announcements.length} รายการทั้งหมด</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-95"
        >
          <Plus size={16} />
          <span>เพิ่มประกาศ</span>
        </button>
      </div>

      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="text-center py-20 bg-neutral-50/50 dark:bg-neutral-900/30 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 text-neutral-400">
            <Megaphone size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">ยังไม่มีประกาศ</p>
          </div>
        ) : announcements.map(ann => {
          const imgMatch = ann.body?.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/) || ann.body?.match(/\[(?:image|bg|cover):\s*(https?:\/\/[^\s\]]+)\]/i)
          const imgUrl = imgMatch ? imgMatch[1] : null
          const cleanBody = ann.body ? ann.body.replace(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/g, '').replace(/\[(?:image|bg|cover):\s*(https?:\/\/[^\s\]]+)\]/gi, '').trim() : ''

          return (
            <div key={ann.id} className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  {imgUrl && (
                    <img
                      src={imgUrl}
                      alt={ann.title}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 border border-neutral-200 dark:border-neutral-800"
                    />
                  )}
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                        {ann.type}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {format(new Date(ann.created_at), 'dd MMM yyyy', { locale: th })}
                      </span>
                    </div>
                    <h3 className="font-bold text-neutral-900 dark:text-white text-base truncate">{ann.title}</h3>
                    {ann.title_en && <p className="text-xs text-neutral-500 font-medium truncate">{ann.title_en}</p>}
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 pt-1 leading-relaxed line-clamp-2">{cleanBody}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(ann.id)}
                  disabled={deleting === ann.id}
                  className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-black dark:hover:bg-white dark:hover:text-black transition-colors"
                  title="ลบประกาศ"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
              <h2 className="font-bold text-neutral-900 dark:text-white text-base">เพิ่มประกาศใหม่</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">ประเภท</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none focus:border-black dark:focus:border-white">
                  <option value="info">Info (ทั่วไป)</option>
                  <option value="warning">Warning (แจ้งเตือน)</option>
                  <option value="success">Success (แนะนำ/พิเศษ)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                  รูปภาพพื้นหลัง / ภาพประกอบ (Image URL) - ไม่ใส่ได้
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={form.imageUrl}
                  onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none focus:border-black dark:focus:border-white"
                />
                {/* Presets */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[11px] text-neutral-400">ภาพแนะนำ:</span>
                  {PRESET_IMAGES.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setForm({ ...form, imageUrl: preset.url })}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">หัวข้อ (ไทย) *</label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none focus:border-black dark:focus:border-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">หัวข้อ (EN)</label>
                <input value={form.title_en} onChange={e => setForm({ ...form, title_en: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none focus:border-black dark:focus:border-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">เนื้อหา (ไทย) *</label>
                <textarea required rows={3} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none focus:border-black dark:focus:border-white resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">เนื้อหา (EN)</label>
                <textarea rows={3} value={form.body_en} onChange={e => setForm({ ...form, body_en: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none focus:border-black dark:focus:border-white resize-none" />
              </div>
              <div className="flex gap-2.5 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  ยกเลิก
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-sm font-semibold transition-all disabled:opacity-50">
                  {saving ? 'กำลังบันทึก...' : 'เพิ่มประกาศ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}