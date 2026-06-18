import { createServiceClient } from '@/lib/supabase-server'
import Navbar from '@/components/Navbar'
import AdminDashboardContent from '@/components/AdminDashboardContent'

async function getData() {
  const supabase = createServiceClient()

  const [
    { count: totalBooks },
    { count: totalBorrows },
    { count: activeBorrows },
    { count: totalUsers },
    { count: totalQueues },
    { data: recentBorrows },
    { data: recentFeedback },
  ] = await Promise.all([
    supabase.from('books').select('*', { count: 'exact', head: true }),
    supabase.from('borrows').select('*', { count: 'exact', head: true }),
    supabase.from('borrows').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
    supabase.from('queue').select('*', { count: 'exact', head: true }),
    supabase.from('borrows')
      .select('id, status, borrowed_at, due_date, profiles(full_name, email, avatar_url), books(title, cover_url)')
      .order('borrowed_at', { ascending: false })
      .limit(10),
    supabase.from('feedback')
      .select('id, rating, message, category, created_at, profiles(full_name, email, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return {
    stats: {
      totalBooks: totalBooks || 0,
      totalBorrows: totalBorrows || 0,
      activeBorrows: activeBorrows || 0,
      totalUsers: totalUsers || 0,
      totalQueues: totalQueues || 0,
    },
    recentBorrows: recentBorrows || [],
    recentFeedback: recentFeedback || [],
  }
}

export default async function AdminDashboardPage() {
  const { stats, recentBorrows, recentFeedback } = await getData()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <AdminDashboardContent stats={stats} recentBorrows={recentBorrows} recentFeedback={recentFeedback} />
    </div>
  )
}