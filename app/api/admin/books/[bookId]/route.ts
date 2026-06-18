import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function PUT(request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const supabase = createServiceClient()
  const { bookId } = await params

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

  const updateData: Record<string, any> = {
    ...fields,
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
  const supabase = createServiceClient()
  const body = await request.json()
  const { bookId } = await params

  const { error } = await supabase
    .from('books')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', bookId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const supabase = createServiceClient()
  const { bookId } = await params

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