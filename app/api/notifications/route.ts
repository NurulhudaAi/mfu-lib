import { createServiceClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { differenceInCalendarDays, differenceInDays } from 'date-fns'
import { sendReminderEmail } from '@/lib/resend'

export interface UserNotification {
  id: string
  type: 'queue_ready' | 'due_tomorrow' | 'overdue'
  title: string
  titleEn: string
  message: string
  messageEn: string
  bookId?: string
  bookTitle?: string
  bookAuthor?: string
  coverUrl?: string
  borrowId?: string
  actionUrl: string
  actionLabel: string
  actionLabelEn: string
  createdAt: string
  priority: 'high' | 'warning' | 'danger'
}

export async function GET() {
  const cookieStore = await cookies()
  const userSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    }
  )

  const {
    data: { user },
  } = await userSupabase.auth.getUser()

  if (!user) {
    return NextResponse.json({
      personalNotifications: [],
      unreadCount: 0,
      announcements: [],
    })
  }

  const supabase = createServiceClient()
  const now = new Date()
  const personalNotifications: UserNotification[] = []

  // 1. Fetch user's profile info (for email reminders if needed)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', user.id)
    .single()

  // 2. Fetch queue items that have reached their turn (notified = true)
  const { data: readyQueues } = await supabase
    .from('queue')
    .select(`
      id, position, notified, notified_at, created_at,
      books (id, title, author, cover_url)
    `)
    .eq('user_id', user.id)
    .eq('notified', true)
    .order('notified_at', { ascending: false })

  for (const q of readyQueues ?? []) {
    const book = Array.isArray(q.books) ? q.books[0] : q.books
    if (!book) continue

    personalNotifications.push({
      id: `queue-${q.id}`,
      type: 'queue_ready',
      title: 'ถึงคิวคุณแล้ว! พร้อมให้ยืมหนังสือ',
      titleEn: 'Your queue is ready!',
      message: `หนังสือ "${book.title}" ถูกคืนแล้วและถึงคิวคุณแล้ว พร้อมให้คุณยืมทันที (สิทธิ์ยืมภายใน 24 ชม.)`,
      messageEn: `"${book.title}" has been returned and it's your turn. Ready for you to borrow within 24 hours.`,
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author ?? undefined,
      coverUrl: book.cover_url ?? undefined,
      actionUrl: `/books/${book.id}`,
      actionLabel: 'ยืมหนังสือเลย',
      actionLabelEn: 'Borrow Now',
      createdAt: q.notified_at || q.created_at,
      priority: 'high',
    })
  }

  // 3. Fetch active borrows to check:
  //    a) 1 day before due date reminder (due tomorrow)
  //    b) overdue alerts
  const { data: activeBorrows } = await supabase
    .from('borrows')
    .select(`
      id, borrowed_at, due_date, status, reminder_sent, overdue_notified,
      books (id, title, author, cover_url)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('due_date', { ascending: true })

  for (const b of activeBorrows ?? []) {
    const book = Array.isArray(b.books) ? b.books[0] : b.books
    if (!book) continue

    const dueDate = new Date(b.due_date)
    const calDays = differenceInCalendarDays(dueDate, now)

    // A) 1 Day Before Due Date (Due Tomorrow)
    if (calDays === 1) {
      personalNotifications.push({
        id: `due-tomorrow-${b.id}`,
        type: 'due_tomorrow',
        title: 'เตือนคืนหนังสือ (ครบกำหนดส่งพรุ่งนี้)',
        titleEn: 'Due Tomorrow Reminder',
        message: `หนังสือ "${book.title}" จะครบกำหนดส่งคืนในวันพรุ่งนี้ กรุณาเตรียมคืนหนังสือตามกำหนด`,
        messageEn: `"${book.title}" is due for return tomorrow. Please return it on time.`,
        borrowId: b.id,
        bookId: book.id,
        bookTitle: book.title,
        bookAuthor: book.author ?? undefined,
        coverUrl: book.cover_url ?? undefined,
        actionUrl: `/my-borrows?return=${b.id}`,
        actionLabel: 'คืนหนังสือ',
        actionLabelEn: 'Return Book',
        createdAt: b.due_date,
        priority: 'warning',
      })

      // Fallback: If 1-day reminder email wasn't sent yet by cron, send it now and update DB
      if (!b.reminder_sent && profile?.email) {
        sendReminderEmail({
          to: profile.email,
          name: profile.full_name || 'สมาชิก',
          bookTitle: book.title,
          bookAuthor: book.author ?? undefined,
          dueDate,
        }).catch((err) => console.error('[Notifications API] sendReminderEmail error:', err))

        await supabase
          .from('borrows')
          .update({ reminder_sent: true })
          .eq('id', b.id)
      }
    } else if (calDays < 0 || dueDate < now) {
      // B) Overdue
      const daysOverdue = Math.max(1, Math.abs(differenceInDays(now, dueDate)))
      personalNotifications.push({
        id: `overdue-${b.id}`,
        type: 'overdue',
        title: 'เกินกำหนดส่งคืนหนังสือ!',
        titleEn: 'Book Overdue Alert!',
        message: `หนังสือ "${book.title}" เกินกำหนดส่งคืนแล้ว ${daysOverdue} วัน กรุณาดำเนินการส่งคืนโดยด่วน`,
        messageEn: `"${book.title}" is ${daysOverdue} days overdue. Please return it as soon as possible.`,
        borrowId: b.id,
        bookId: book.id,
        bookTitle: book.title,
        bookAuthor: book.author ?? undefined,
        coverUrl: book.cover_url ?? undefined,
        actionUrl: `/my-borrows?return=${b.id}`,
        actionLabel: 'คืนหนังสือทันที',
        actionLabelEn: 'Return Now',
        createdAt: b.due_date,
        priority: 'danger',
      })
    }
  }

  // 4. Fetch general library announcements
  const { data: announcements } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(8)

  return NextResponse.json({
    personalNotifications,
    unreadCount: personalNotifications.length,
    announcements: announcements || [],
  })
}
