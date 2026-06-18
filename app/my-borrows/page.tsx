import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase-server'
import Navbar from '@/components/Navbar'
import MyBorrowsContent from '@/components/MyBorrowsContent'

async function getData() {
  const cookieStore = await cookies()
  const userSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) redirect('/login')

  const supabase = createServiceClient()
  const { data: borrows } = await supabase
    .from('borrows')
    .select(`
      id, status, borrowed_at, due_date, returned_at, return_proof_url,
      books (id, title, author, cover_url, category)
    `)
    .eq('user_id', user.id)
    .order('borrowed_at', { ascending: false })

  const { data: queues } = await supabase
    .from('queue')
    .select(`
      id, position, created_at,
      books (id, title, author, cover_url)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Get signed URLs for return proofs
  const borrowsWithProof = await Promise.all(
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

  return { borrows: borrowsWithProof, queues: queues || [], userId: user.id }
}

export default async function MyBorrowsPage() {
  const { borrows, queues, userId } = await getData()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <MyBorrowsContent borrows={borrows} queues={queues} userId={userId} />
    </div>
  )
}
