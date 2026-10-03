import { createServiceClient, createSessionClient } from '@/lib/supabase-server'
import Navbar from '@/components/Navbar'
import HomeContent from '@/components/HomeContent'

async function getData() {
  const supabase = createServiceClient()
  const [{ data: books }, { data: announcements }, { data: catData }] = await Promise.all([
    supabase
      .from('books')
      .select('id, title, author, cover_url, category, available_copies, total_copies, is_featured, is_active, created_at, description, isbn, publisher, published_year')
      .order('created_at', { ascending: false })
      .limit(60),
    supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('books')
      .select('category')
      .not('category', 'is', null),
  ])

  const categories = [
    ...new Set([
      ...(catData || []).map((b: any) => b.category),
      ...(books || []).map((b: any) => b.category),
    ].filter(Boolean)),
  ]

  return { books: books || [], announcements: announcements || [], categories }
}

export default async function HomePage() {
  const { books, announcements, categories } = await getData()
  const supabase = await createSessionClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <HomeContent
      books={books}
      announcements={announcements}
      categories={categories}
      userId={user?.id ?? null}
    />
  )
}