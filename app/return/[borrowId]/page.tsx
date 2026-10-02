'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/app-context'
import { ArrowLeft, Upload, X, Calendar, CheckCircle } from 'lucide-react'
import Link from 'next/link'

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

    if (file.size > MAX_FILE_SIZE) {
      alert('ไฟล์รูปต้องไม่เกิน 10MB กรุณาเลือกไฟล์ใหม่')
      e.target.value = ''
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
      <div className="w-full flex items-center justify-center min-h-[70vh] p-6 sm:p-8 animate-fade-in">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mx-auto mb-5 shadow-sm">
            <CheckCircle size={40} className="text-neutral-900 dark:text-white" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">คืนหนังสือสำเร็จ!</h2>
          <p className="text-neutral-500 dark:text-neutral-400">กำลังกลับสู่หน้ารายการยืมของคุณ...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg mx-auto p-6 sm:p-8 lg:p-10 space-y-6 animate-fade-in">
      <Link
        href="/my-borrows"
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        {t('myBorrows')}
      </Link>

      <div className="bg-neutral-50 dark:bg-[#121214] rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white mb-1">{t('returnTitle')}</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">กรุณาแนบรูปหลักฐานและเลือกวันที่คืน</p>

        {/* Notice */}
        <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3.5 mb-6 text-xs text-neutral-700 dark:text-neutral-300">
          ℹ️ {t('uploadProofHint')} เพื่อเป็นหลักฐานการคืน
        </div>

        {/* Return date */}
        <div className="mb-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
            <Calendar size={13} className="inline mr-1.5" />
            {t('selectReturnDate')}
          </label>
          <input
            type="date"
            value={returnDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={e => setReturnDate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:border-black dark:focus:border-white outline-none transition-colors text-sm"
          />
        </div>

        {/* Photo upload */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
            📷 {t('uploadProof')} <span className="text-neutral-400">*</span>
          </label>

          {preview ? (
            <div className="relative rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
              <img src={preview} alt="preview" className="w-full object-cover max-h-64 rounded-2xl" />
              <button
                type="button"
                onClick={() => { setPhoto(null); setPreview(null) }}
                className="absolute top-2.5 right-2.5 p-1.5 bg-black text-white dark:bg-white dark:text-black rounded-full shadow-md hover:opacity-80 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="block border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white rounded-2xl p-8 text-center cursor-pointer transition-colors group bg-white dark:bg-neutral-900">
              <Upload size={32} className="mx-auto mb-2 text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
              <p className="text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                แตะเพื่อถ่ายรูปหรือเลือกไฟล์
              </p>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">JPG, PNG (ไม่เกิน 10MB)</p>
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
          className="w-full py-3.5 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 disabled:opacity-40 text-white dark:text-black font-bold rounded-2xl transition-all shadow-md text-sm"
        >
          {loading ? 'กำลังส่งข้อมูล...' : t('confirmReturn')}
        </button>
      </div>
    </div>
  )
}