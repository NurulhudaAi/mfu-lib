import { createServiceClient } from '@/lib/supabase-server'
import AdminDashboardContent from '@/components/AdminDashboardContent'

async function getData() {
  const supabase = createServiceClient()

  const [
    { count: totalBooks },
    { count: totalBorrows },
    { count: activeBorrows },
    { count: overdueBorrows },
    { count: returnedBorrows },
    { count: totalUsers },
    { count: totalQueues },
    { data: allBorrowsRaw },
    { data: allUsersRaw },
    { data: queuesRaw },
  ] = await Promise.all([
    supabase.from('books').select('*', { count: 'exact', head: true }),
    supabase.from('borrows').select('*', { count: 'exact', head: true }),
    supabase.from('borrows').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('borrows').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
    supabase.from('borrows').select('*', { count: 'exact', head: true }).eq('status', 'returned'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('queue').select('*', { count: 'exact', head: true }),
    supabase.from('borrows')
      .select('id, book_id, user_id, status, borrowed_at, due_date, returned_at, return_proof_url, notes, profiles(id, full_name, email, avatar_url, is_blacklisted), books(id, title, author, cover_url)')
      .order('borrowed_at', { ascending: false })
      .limit(300),
    supabase.from('profiles')
      .select('id, full_name, email, student_id, avatar_url, role, is_blacklisted, blacklist_reason, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('queue')
      .select('id, position, created_at, profiles(id, full_name, email, avatar_url), books(id, title, author, cover_url)')
      .order('book_id', { ascending: true })
      .order('position', { ascending: true }),
  ])

  // Calculate Most Borrowed Books
  const bookBorrowCountMap = new Map<string, { book: any; count: number }>()
  for (const b of (allBorrowsRaw as any[]) || []) {
    const book = Array.isArray(b.books) ? b.books[0] : b.books
    if (!book?.id) continue
    const existing = bookBorrowCountMap.get(book.id)
    if (existing) {
      existing.count += 1
    } else {
      bookBorrowCountMap.set(book.id, {
        book,
        count: 1,
      })
    }
  }
  const mostBorrowedBooks = Array.from(bookBorrowCountMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map(item => ({
      ...item.book,
      borrowCount: item.count,
    }))

  // Calculate Top Borrowers
  const userBorrowCountMap = new Map<string, { user: any; count: number }>()
  for (const b of (allBorrowsRaw as any[]) || []) {
    const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles
    if (!profile?.id) continue
    const existing = userBorrowCountMap.get(profile.id)
    if (existing) {
      existing.count += 1
    } else {
      userBorrowCountMap.set(profile.id, {
        user: profile,
        count: 1,
      })
    }
  }
  const topBorrowers = Array.from(userBorrowCountMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map(item => ({
      ...item.user,
      borrowCount: item.count,
    }))

  // Generate signed URLs for return proof images
  const borrowsWithUrls = await Promise.all(
    (allBorrowsRaw || []).map(async (b: any) => {
      if (b.return_proof_url) {
        try {
          const { data } = await supabase.storage
            .from('return-proofs')
            .createSignedUrl(b.return_proof_url, 3600)
          return { ...b, proof_signed_url: data?.signedUrl || null }
        } catch (_) {
          return { ...b, proof_signed_url: null }
        }
      }
      return { ...b, proof_signed_url: null }
    })
  )

  return {
    stats: {
      totalBooks: totalBooks || 0,
      totalBorrows: totalBorrows || 0,
      activeBorrows: activeBorrows || 0,
      overdueBorrows: overdueBorrows || 0,
      returnedBorrows: returnedBorrows || 0,
      totalUsers: totalUsers || 0,
      totalQueues: totalQueues || 0,
    },
    mostBorrowedBooks,
    topBorrowers,
    allBorrows: borrowsWithUrls,
    recentBorrows: (allBorrowsRaw || []).slice(0, 8),
    allUsers: allUsersRaw || [],
    queues: queuesRaw || [],
  }
}

export default async function AdminDashboardPage() {
  const data = await getData()

  return (
    <AdminDashboardContent
      stats={data.stats}
      mostBorrowedBooks={data.mostBorrowedBooks}
      topBorrowers={data.topBorrowers}
      recentBorrows={data.recentBorrows}
      allBorrows={data.allBorrows}
      allUsers={data.allUsers}
      queues={data.queues}
    />
  )
}