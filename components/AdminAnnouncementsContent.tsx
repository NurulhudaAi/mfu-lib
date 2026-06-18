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
    title: '', title_en: '', body: '', body_en: '', type: 'info' as const
  })
  const router = useRouter()

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setShowForm(false)
      setForm({ title: '', title_en: '', body: '', body_en: '', type: 'info' })
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

  const typeColors = {
    info: 'bg-blue-100 text-blue-700',
    warning: 'bg-amber-100 text-amber-700',
    success: 'bg-green-100 text-green-700',
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/dashboard" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ประกาศ</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{announcements.length} รายการ</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} /> เพิ่มประกาศ
        </button>
      </div>

      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Megaphone size={48} className="mx-auto mb-3 opacity-20" />
            <p>ยังไม่มีประกาศ</p>
          </div>
        ) : announcements.map(ann => (
          <div key={ann.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${typeColors[ann.type]}`}>
                    {ann.type}
                  </span>
                  <span className="text-xs text-gray-400">
                    {format(new Date(ann.created_at), 'dd MMM yyyy', { locale: th })}
                  </span>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">{ann.title}</p>
                {ann.title_en && <p className="text-sm text-gray-500">{ann.title_en}</p>}
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{ann.body}</p>
              </div>
              <button
                onClick={() => handleDelete(ann.id)}
                disabled={deleting === ann.id}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-white">เพิ่มประกาศใหม่</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">ประเภท</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm">
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">หัวข้อ (ไทย) *</label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">หัวข้อ (EN)</label>
                <input value={form.title_en} onChange={e => setForm({ ...form, title_en: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">เนื้อหา (ไทย) *</label>
                <textarea required rows={3} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">เนื้อหา (EN)</label>
                <textarea rows={3} value={form.body_en} onChange={e => setForm({ ...form, body_en: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
                  ยกเลิก
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50">
                  {saving ? 'กำลังบันทึก...' : 'เพิ่มประกาศ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}