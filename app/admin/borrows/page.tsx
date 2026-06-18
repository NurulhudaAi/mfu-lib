import { createServiceClient } from '@/lib/supabase-server'
import Navbar from '@/components/Navbar'
import AdminBorrowsContent from '@/components/AdminBorrowsContent'

async function getData() {
  const supabase = createServiceClient()

  const [{ data: borrows }, { data: queues }] = await Promise.all([
    supabase
      .from('borrows')
      .select(`
        id, status, borrowed_at, due_date, returned_at, return_proof_url, notes,
        profiles (id, full_name, email, avatar_url, is_blacklisted),
        books (id, title, author, cover_url)
      `)
      .order('borrowed_at', { ascending: false })
      .limit(100),

    supabase
      .from('queue')
      .select(`
        id, position, created_at,
        profiles (id, full_name, email, avatar_url),
        books (id, title, author, cover_url)
      `)
      .order('book_id', { ascending: true })
      .order('position', { ascending: true }),
  ])

  // Generate signed URLs for return proofs
  const borrowsWithUrls = await Promise.all(
    (borrows || []).map(async (b: any) => {
      if (b.return_proof_url) {
        const { data } = await supabase.storage
          .from('return-proofs')
          .createSignedUrl(b.return_proof_url, 3600)
        return { ...b, proof_signed_url: data?.signedUrl || null }
      }
      return { ...b, proof_signed_url: null }
    })
  )

  return { borrows: borrowsWithUrls, queues: queues || [] }
}

export default async function AdminBorrowsPage() {
  const { borrows, queues } = await getData()
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <AdminBorrowsContent borrows={borrows} queues={queues} />
    </div>
  )
}