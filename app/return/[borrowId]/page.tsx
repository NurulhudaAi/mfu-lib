'use client'
import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/app-context'
import Navbar from '@/components/Navbar'
import { ArrowLeft, Upload, X, Calendar, CheckCircle } from 'lucide-react'
import Link from 'next/link'

// ✅ BUG FIX #5: ขนาดไฟล์สูงสุดที่อนุญาต (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024

export default function ReturnPage() {
  const params = useParams()
  const borrowId = params.borrowId as string
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { t } = useApp()
  const router = useRouter()

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // ✅ BUG FIX #5: ตรวจขนาดไฟล์ฝั่ง client ก่อน upload
    if (file.size > MAX_FILE_SIZE) {
      alert('ไฟล์รูปต้องไม่เกิน 10MB กรุณาเลือกไฟล์ใหม่')
      e.target.value = '' // reset input
      return
    }

    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handleReturn() {
    if (!photo) { alert('กรุณาแนบรูปหลักฐานการคืนหนังสือ'); return }
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // ✅ BUG FIX #6 (Security): ownership ถูกตรวจที่ฝั่ง API (/api/return)
    // API ต้องทำ: .eq('id', borrowId).eq('user_id', user.id) ก่อน update
    // ดูความคิดเห็นใน /api/return/route.ts
    const formData = new FormData()
    formData.append('borrowId', borrowId)
    formData.append('photo', photo)
    formData.append('returnDate', returnDate)

    const res = await fetch('/api/return', { method: 'POST', body: formData })
    const data = await res.json()

    if (data.error) {
      alert(data.error)
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/my-borrows'), 2500)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={40} className="text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">คืนหนังสือสำเร็จ!</h2>
            <p className="text-gray-500 dark:text-gray-400">กำลังกลับสู่หน้าการยืม...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="max-w-md mx-auto px-4 py-8 animate-fade-in">
        <Link
          href="/my-borrows"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          {t('myBorrows')}
        </Link>

        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-xl shadow-gray-200/50 dark:shadow-black/20">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{t('returnTitle')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">กรุณาแนบรูปหลักฐานและเลือกวันที่คืน</p>

          {/* Warning */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-6 text-sm text-amber-800 dark:text-amber-300">
            ⚠️ {t('uploadProofHint')} เพื่อเป็นหลักฐาน
          </div>

          {/* Return date */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <Calendar size={14} className="inline mr-1.5" />
              {t('selectReturnDate')}
            </label>
            <input
              type="date"
              value={returnDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => setReturnDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-green-500 outline-none transition-colors text-sm"
            />
          </div>

          {/* Photo upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              📷 {t('uploadProof')} <span className="text-red-500">*</span>
            </label>

            {preview ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={preview} alt="preview" className="w-full object-cover max-h-64 rounded-xl" />
                <button
                  onClick={() => { setPhoto(null); setPreview(null) }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="block border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-600 rounded-xl p-10 text-center cursor-pointer transition-colors group">
                <Upload size={36} className="mx-auto mb-2 text-gray-300 dark:text-gray-600 group-hover:text-green-500 dark:group-hover:text-green-500 transition-colors" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400">
                  แตะเพื่อถ่ายรูปหรือเลือกไฟล์
                </p>
                {/* ✅ BUG FIX #5: แสดงข้อจำกัดขนาดชัดเจน */}
                <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">JPG, PNG (ไม่เกิน 10MB)</p>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <button
            onClick={handleReturn}
            disabled={loading || !photo}
            className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-base"
          >
            {loading ? '⏳ กำลังส่ง...' : `✅ ${t('confirmReturn')}`}
          </button>
        </div>
      </main>
    </div>
  )
}