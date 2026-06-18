// app/books/[id]/page.tsx
import { createServiceClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import BookDetailContent from '@/components/BookDetailContent'

interface Props {
  params: Promise<{ id: string }>
}

async function getData(bookId: string) {
  const supabase = createServiceClient()
  const cookieStore = await cookies()

  // ── Get current user (anon key — อ่าน session จาก cookie) ──
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

  // ── Run all queries in parallel ──
  const [
    { data: book },
    { data: activeBorrow },
    { data: queueEntry },
    { count: queueCount },
    { count: totalBorrows },   // ✅ เพิ่ม query นี้ — นับจำนวนครั้งที่ถูกยืมทั้งหมด
  ] = await Promise.all([
    supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single(),

    user
      ? supabase
          .from('borrows')
          .select('id, due_date')
          .eq('user_id', user.id)
          .eq('book_id', bookId)
          .eq('status', 'active')
          .maybeSingle()
      : Promise.resolve({ data: null }),

    user
      ? supabase
          .from('queue')
          .select('id, position')
          .eq('user_id', user.id)
          .eq('book_id', bookId)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    supabase
      .from('queue')
      .select('*', { count: 'exact', head: true })
      .eq('book_id', bookId),

    // ✅ นับ borrows ทุก status (active + returned + overdue) = ยอดยืมทั้งหมดตลอดกาล
    supabase
      .from('borrows')
      .select('*', { count: 'exact', head: true })
      .eq('book_id', bookId),
  ])

  if (!book) notFound()

  return {
    book,
    userId: user?.id ?? null,
    activeBorrow: activeBorrow ?? null,
    queueEntry: queueEntry ?? null,
    queueCount: queueCount ?? 0,
    totalBorrows: totalBorrows ?? 0,   // ✅ ส่งเป็น prop
  }
}

export default async function BookDetailPage({ params }: Props) {
  const { id } = await params
  const { book, userId, activeBorrow, queueEntry, queueCount, totalBorrows } = await getData(id)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <BookDetailContent
        book={book}
        userId={userId}
        activeBorrow={activeBorrow}
        queueEntry={queueEntry}
        queueCount={queueCount}
        totalBorrows={totalBorrows}    // ✅ pass prop ไปที่ component
      />
    </div>
  )
}