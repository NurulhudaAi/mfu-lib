import { createServiceClient, createSessionClient } from '@/lib/supabase-server'
import Navbar from '@/components/Navbar'
import HomeContent from '@/components/HomeContent'

async function getData() {
  const supabase = createServiceClient()
  const [{ data: books }, { data: announcements }] = await Promise.all([
    supabase
      .from('books')
      .select('id, title, author, cover_url, category, available_copies, total_copies, is_featured, created_at, description, isbn, publisher, published_year')
      .order('created_at', { ascending: false })
      .limit(36),
    supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  const categories = [
    ...new Set((books || []).map((b: any) => b.category).filter(Boolean)),
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