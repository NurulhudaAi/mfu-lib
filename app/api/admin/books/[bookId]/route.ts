import { createServiceClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-guard'
import { NextResponse } from 'next/server'

// ── UUID format regex ──
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── Allowed fields for book update (prevent mass-assignment) ──
const ALLOWED_BOOK_FIELDS = new Set([
  'title', 'author', 'isbn', 'description', 'category', 'publisher',
  'published_year', 'total_copies', 'available_copies',
  'is_featured', 'is_active', 'cover_url',
])

function sanitizeBookFields(raw: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (ALLOWED_BOOK_FIELDS.has(key)) {
      result[key] = value
    }
  }
  return result
}

export async function PUT(request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const supabase = createServiceClient()
  const { bookId } = await params

  // ── Validate UUID ──
  if (!uuidRegex.test(bookId)) {
    return NextResponse.json({ error: 'รหัสหนังสือไม่ถูกต้อง' }, { status: 400 })
  }

  const contentType = request.headers.get('content-type') || ''

  let fields: Record<string, any> = {}
  let coverUrl: string | null = null

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()

    for (const [key, value] of formData.entries()) {
      if (key !== 'cover') {
        if (key === 'total_copies' || key === 'available_copies' || key === 'published_year') {
          fields[key] = value ? Number(value) : null
        } else if (key === 'is_featured' || key === 'is_active') {
          fields[key] = value === 'true'
        } else {
          fields[key] = value || null
        }
      }
    }

    const coverFile = formData.get('cover') as File | null
    if (coverFile && coverFile.size > 0) {
      // ── Validate file type & size ──
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      if (!allowedTypes.includes(coverFile.type)) {
        return NextResponse.json({ error: 'รองรับเฉพาะไฟล์ JPG, PNG, WebP, GIF' }, { status: 400 })
      }
      if (coverFile.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'ไฟล์ปกใหญ่เกินไป (สูงสุด 5 MB)' }, { status: 400 })
      }

      const ext = coverFile.name.split('.').pop()
      const path = `covers/${crypto.randomUUID()}.${ext}`
      const buffer = Buffer.from(await coverFile.arrayBuffer())

      const { error: uploadError } = await supabase.storage
        .from('book-covers')
        .upload(path, buffer, { contentType: coverFile.type, upsert: true })

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
      }

      const { data: urlData } = supabase.storage.from('book-covers').getPublicUrl(path)
      coverUrl = urlData.publicUrl
    }
  } else {
    fields = await request.json()
  }

  // ── Sanitize: only allow known book fields ──
  const updateData: Record<string, any> = {
    ...sanitizeBookFields(fields),
    updated_at: new Date().toISOString(),
  }
  if (coverUrl) updateData.cover_url = coverUrl
  delete updateData.id

  const { error } = await supabase
    .from('books')
    .update(updateData)
    .eq('id', bookId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const supabase = createServiceClient()
  const body = await request.json()
  const { bookId } = await params

  // ── Validate UUID ──
  if (!uuidRegex.test(bookId)) {
    return NextResponse.json({ error: 'รหัสหนังสือไม่ถูกต้อง' }, { status: 400 })
  }

  // ── Sanitize: only allow known book fields ──
  const safeBody = sanitizeBookFields(body)
  if (Object.keys(safeBody).length === 0) {
    return NextResponse.json({ error: 'ไม่มีข้อมูลที่ต้องอัปเดต' }, { status: 400 })
  }

  const { error } = await supabase
    .from('books')
    .update({ ...safeBody, updated_at: new Date().toISOString() })
    .eq('id', bookId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const supabase = createServiceClient()
  const { bookId } = await params

  // ── Validate UUID ──
  if (!uuidRegex.test(bookId)) {
    return NextResponse.json({ error: 'รหัสหนังสือไม่ถูกต้อง' }, { status: 400 })
  }

  // เช็คว่ามีการยืมที่ยังค้างอยู่มั้ย
  const { count } = await supabase
    .from('borrows')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', bookId)
    .eq('status', 'active')

  if (count && count > 0) {
    return NextResponse.json({ error: 'ไม่สามารถลบได้ มีการยืมหนังสือเล่มนี้อยู่' }, { status: 400 })
  }

  // ลบ borrows ทั้งหมดของหนังสือเล่มนี้ก่อน (ที่ return แล้ว)
  await supabase
    .from('borrows')
    .delete()
    .eq('book_id', bookId)

  // แล้วค่อยลบหนังสือ
  const { error } = await supabase.from('books').delete().eq('id', bookId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}