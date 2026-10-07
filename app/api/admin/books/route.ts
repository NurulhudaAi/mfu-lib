import { createServiceClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-guard'
import { NextResponse } from 'next/server'
import { createBookFieldsSchema, validateInput } from '@/lib/validation'

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const supabase = createServiceClient()
  const formData = await request.formData()

  // ── Parse fields from FormData ──
  const rawFields: Record<string, any> = {}
  for (const [key, value] of formData.entries()) {
    if (key !== 'cover') {
      rawFields[key] = value
    }
  }

  // ── Validate input ──
  const parsed = validateInput(createBookFieldsSchema, rawFields)
  if (parsed.error) return parsed.error

  const {
    title, author, isbn, description, category, publisher,
    published_year, total_copies, is_featured, is_active, cover_url: coverUrlParam,
  } = parsed.data

  let cover_url: string | null = coverUrlParam || null
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

    const fileName = `${Date.now()}-${coverFile.name.replace(/\s/g, '-')}`
    const { error: uploadError } = await supabase.storage
      .from('book-covers')
      .upload(fileName, coverFile, { upsert: true })

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('book-covers').getPublicUrl(fileName)
      cover_url = urlData.publicUrl
    }
  }

  const { data, error } = await supabase.from('books').insert({
    title, author, isbn: isbn || null, description, category, publisher,
    published_year, total_copies, available_copies: total_copies, cover_url,
    is_featured, is_active, added_by: auth.admin.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ book: data })
}
