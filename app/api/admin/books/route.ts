import { createServiceClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-guard'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const supabase = createServiceClient()
  const formData = await request.formData()

  const title = formData.get('title') as string
  const author = formData.get('author') as string | null
  const isbn = formData.get('isbn') as string | null
  const description = formData.get('description') as string | null
  const category = formData.get('category') as string | null
  const publisher = formData.get('publisher') as string | null
  const published_year = formData.get('published_year') ? parseInt(formData.get('published_year') as string) : null
  const total_copies = formData.get('total_copies') ? parseInt(formData.get('total_copies') as string) : 1
  const is_featured = formData.get('is_featured') === 'true'
  const is_active = formData.get('is_active') !== 'false'
  const coverFile = formData.get('cover') as File | null
  const coverUrlParam = formData.get('cover_url') as string | null

  let cover_url: string | null = coverUrlParam || null

  if (coverFile && coverFile.size > 0) {
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
    is_featured, is_active,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ book: data })
}
