import { createServiceClient, createSessionClient } from '@/lib/supabase-server'
import Navbar from '@/components/Navbar'
import HomeContent from '@/components/HomeContent'

async function getData() {
  const supabase = createServiceClient()
  const [{ data: newBooks }, { data: announcements }] = await Promise.all([
    supabase
      .from('books')
      .select('id, title, author, cover_url, category, available_copies, total_copies, is_featured, created_at')
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5),
  ])
  return { newBooks: newBooks || [], announcements: announcements || [] }
}

export default async function HomePage() {
  const { newBooks, announcements } = await getData()

const supabase = await createSessionClient()  // ✅ เพิ่ม await
const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <HomeContent
        newBooks={newBooks}
        announcements={announcements}
        userId={user?.id ?? null}
      />
    </div>
  )
}