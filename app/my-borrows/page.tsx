import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase-server'
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
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') {
    redirect('/admin/dashboard')
  }

  const { data: borrows } = await supabase
    .from('borrows')
    .select(`
      id, status, borrowed_at, due_date, returned_at, return_proof_url, notes, reminder_sent, overdue_notified,
      books (id, title, author, cover_url, category)
    `)
    .eq('user_id', user.id)
    .order('borrowed_at', { ascending: false })

  const { data: queues } = await supabase
    .from('queue')
    .select(`
      id, position, notified, notified_at, created_at,
      books (id, title, author, cover_url, category)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // กรองคิวที่หนังสือเล่มนั้นผู้ใช้กำลังยืมอยู่แล้วออก (ป้องกันคิวตกค้าง)
  const activeBookIds = new Set(
    (borrows || []).filter((b: any) => b.status === 'active' || (b.status === 'overdue' && !b.returned_at)).map((b: any) => b.books?.id)
  )
  const validQueues = (queues || []).filter((q: any) => !activeBookIds.has(q.books?.id))

  // เคลียร์คิวตกค้างในฐานข้อมูลแบบ asynchronous
  const staleQueues = (queues || []).filter((q: any) => activeBookIds.has(q.books?.id))
  if (staleQueues.length > 0) {
    const staleIds = staleQueues.map((q: any) => q.id)
    supabase.from('queue').delete().in('id', staleIds).then(() => {})
  }

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

  return { borrows: borrowsWithProof, queues: validQueues, userId: user.id }
}

export default async function MyBorrowsPage() {
  const { borrows, queues, userId } = await getData()

  return (
    <MyBorrowsContent borrows={borrows} queues={queues} userId={userId} />
  )
}
