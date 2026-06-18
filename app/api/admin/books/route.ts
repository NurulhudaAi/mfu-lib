import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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
  const coverFile = formData.get('cover') as File | null

  let cover_url: string | null = null

  if (coverFile && coverFile.size > 0) {
    const fileName = `${Date.now()}-${coverFile.name.replace(/\s/g, '-')}`
    const { error: uploadError, data: uploadData } = await supabase.storage
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
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ book: data })
}
