import { createServiceClient } from '@/lib/supabase-server'
import Navbar from '@/components/Navbar'
import BooksContent from '@/components/BooksContent'

interface Props {
  searchParams: Promise<{ q?: string; category?: string }>
}

async function getData(q?: string, category?: string) {
  const supabase = createServiceClient()

  let query = supabase
    .from('books')
    .select('id, title, author, cover_url, category, available_copies, total_copies, is_featured, created_at')
    .order('created_at', { ascending: false })

  if (q) {
    query = query.or(`title.ilike.%${q}%,author.ilike.%${q}%`)
  }
  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  const { data: books } = await query

  // Get unique categories
  const { data: catData } = await supabase
    .from('books')
    .select('category')
    .not('category', 'is', null)

  const categories = [...new Set(catData?.map(b => b.category).filter(Boolean) || [])]

  return { books: books || [], categories }
}

export default async function BooksPage({ searchParams }: Props) {
  const params = await searchParams
  const { books, categories } = await getData(params.q, params.category)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <BooksContent books={books} categories={categories} initialSearch={params.q || ''} />
    </div>
  )
}
