// app/books/[id]/page.tsx
import { createServiceClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
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
  // ── 1. Fetch base book info, counts, and user session concurrently ──
  const [
    userRes,
    { data: book },
    { count: queueCount },
    { count: totalBorrows },
  ] = await Promise.all([
    userSupabase.auth.getUser().catch(() => ({ data: { user: null } })),
    supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single(),
    supabase
      .from('queue')
      .select('*', { count: 'exact', head: true })
      .eq('book_id', bookId),
    supabase
      .from('borrows')
      .select('*', { count: 'exact', head: true })
      .eq('book_id', bookId),
  ])

  if (!book) notFound()

  const user = userRes?.data?.user

  // ── 2. Run user-specific queries & similar books in parallel ──
  const [
    { data: profile },
    { data: activeBorrow },
    { data: userAnyBorrow },
    { data: queueEntry },
    { data: catBooks },
  ] = await Promise.all([
    user
      ? supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    user
      ? supabase
          .from('borrows')
          .select('id, due_date')
          .eq('user_id', user.id)
          .eq('book_id', bookId)
          .in('status', ['active', 'overdue'])
          .is('returned_at', null)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    user
      ? supabase
          .from('borrows')
          .select('id, book_id, books(title)')
          .eq('user_id', user.id)
          .in('status', ['active', 'overdue'])
          .is('returned_at', null)
          .limit(1)
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

    book.category
      ? supabase
          .from('books')
          .select('*')
          .neq('id', bookId)
          .eq('category', book.category)
          .neq('is_active', false)
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] }),
  ])

  let similarBooks: any[] = catBooks || []

  // Fallback: If not enough books in the same category, fetch other latest books
  if (similarBooks.length < 4) {
    const existingIds = [bookId, ...similarBooks.map(b => b.id)]
    const { data: fallbackBooks } = await supabase
      .from('books')
      .select('*')
      .not('id', 'in', `(${existingIds.join(',')})`)
      .neq('is_active', false)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(4 - similarBooks.length)
    if (fallbackBooks) {
      similarBooks = [...similarBooks, ...fallbackBooks]
    }
  }

  // Any active borrow of another book
  const otherBorrow = (userAnyBorrow as any)?.book_id && (userAnyBorrow as any).book_id !== bookId
    ? {
        id: (userAnyBorrow as any).id,
        bookTitle: (userAnyBorrow as any).books?.title || 'หนังสืออื่น',
      }
    : null

  const isAdmin = (profile as any)?.role === 'admin' || (profile as any)?.role === 'super_admin'

  const { data: catData } = await supabase
    .from('books')
    .select('category')
    .not('category', 'is', null)

  const categories = [...new Set(catData?.map((b: any) => b.category).filter(Boolean) || [])] as string[]

  return {
    book,
    similarBooks,
    categories,
    userId: user?.id ?? null,
    isAdmin,
    activeBorrow: activeBorrow ?? null,
    otherActiveBorrow: otherBorrow,
    queueEntry: queueEntry ?? null,
    queueCount: queueCount ?? 0,
    totalBorrows: totalBorrows ?? 0,
  }
}

export default async function BookDetailPage({ params }: Props) {
  const { id } = await params
  const { book, similarBooks, categories, userId, isAdmin, activeBorrow, otherActiveBorrow, queueEntry, queueCount, totalBorrows } = await getData(id)

  return (
    <BookDetailContent
      book={book}
      similarBooks={similarBooks}
      categories={categories}
      userId={userId}
      isAdmin={isAdmin}
      activeBorrow={activeBorrow}
      otherActiveBorrow={otherActiveBorrow}
      queueEntry={queueEntry}
      queueCount={queueCount}
      totalBorrows={totalBorrows}
    />
  )
}