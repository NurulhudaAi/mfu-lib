import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-guard'

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'กรุณาเลือกไฟล์รูปภาพ' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WebP, GIF)' },
        { status: 400 }
      )
    }

    // 10 MB maximum
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'ขนาดไฟล์รูปภาพเกิน 10 MB' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const ext = file.name.split('.').pop() || 'jpg'
    const cleanFileName = `announcements/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('book-covers')
      .upload(cleanFileName, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      return NextResponse.json(
        { error: `อัปโหลดรูปภาพไม่สำเร็จ: ${uploadError.message}` },
        { status: 500 }
      )
    }

    const { data: urlData } = supabase.storage.from('book-covers').getPublicUrl(cleanFileName)
    return NextResponse.json({ url: urlData.publicUrl })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ' },
      { status: 500 }
    )
  }
}
