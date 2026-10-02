import { createServiceClient } from '@/lib/supabase-server'
import AdminBooksContent from '@/components/AdminBooksContent'

async function getData() {
  const supabase = createServiceClient()

  const [{ data: books }, { data: catData }] = await Promise.all([
    supabase
      .from('books')
      .select('id, title, author, cover_url, category, available_copies, total_copies, is_featured, is_active, created_at, isbn')
      .order('created_at', { ascending: false }),

    // ✅ ดึง categories จาก DB แทน localStorage
    supabase
      .from('books')
      .select('category')
      .not('category', 'is', null),
  ])

  // dedupe + กรอง null/empty ออก
  const categories = [
    ...new Set(
      (catData ?? []).map((b: { category: string }) => b.category).filter(Boolean)
    ),
  ] as string[]

  return { books: books ?? [], categories }
}

export default async function AdminBooksPage() {
  const { books, categories } = await getData()

  return (
    <AdminBooksContent books={books} categories={categories} />
  )
}