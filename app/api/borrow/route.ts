// app/api/borrow/route.ts
import { createServiceClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { sendBorrowConfirmEmail } from '@/lib/resend'
import { addDays } from 'date-fns'
import { borrowSchema, validateInput } from '@/lib/validation'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const supabase = createServiceClient()

  // ── ดึง user จาก session (ไม่ trust body ที่ client ส่งมา) ──
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
  if (!user) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 })
  }

  // ── Rate Limit: จำกัดการยืมต่อ user (5 ครั้ง/นาที) ──
  const rl = checkRateLimit(`borrow:${user.id}`, { maxRequests: 5, windowSeconds: 60 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  // ── Validate input ──
  const body = await request.json()
  const parsed = validateInput(borrowSchema, body)
  if (parsed.error) return parsed.error
  const { bookId } = parsed.data

  // ── ตรวจสอบ blacklist + profile ──
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, is_blacklisted')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'ไม่พบข้อมูลผู้ใช้' }, { status: 404 })
  }
  if (profile.is_blacklisted) {
    return NextResponse.json({ error: 'คุณถูก blacklist ไม่สามารถยืมหนังสือได้' }, { status: 403 })
  }

  // ── ตรวจสอบว่ายืมอยู่แล้วหรือเปล่า (1 เล่มต่อคน) ──
  const { data: activeBorrow } = await supabase
    .from('borrows')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['active', 'overdue'])
    .is('returned_at', null)
    .limit(1)

  if (activeBorrow && activeBorrow.length > 0) {
    return NextResponse.json({ error: 'คุณมีหนังสือที่ยืมอยู่แล้ว กรุณาคืนก่อน' }, { status: 400 })
  }

  // ── ตรวจสอบหนังสือว่าง ──
  // ── ลด available_copies (ตอนนี้ใช้ DB Trigger update_book_availability จัดการแทนแล้ว) ──
  const { data: book } = await supabase
    .from('books')
    .select('id, title, author, available_copies, total_copies, is_active')
    .eq('id', bookId)
    .limit(1)
    .maybeSingle()

  if (!book) {
    return NextResponse.json({ error: 'ไม่พบหนังสือ' }, { status: 404 })
  }
  if (book.is_active === false) {
    return NextResponse.json({ error: 'หนังสือเล่มนี้ไม่เปิดให้ยืม' }, { status: 400 })
  }
  if (book.available_copies <= 0) {
    return NextResponse.json({ error: 'หนังสือไม่ว่างในขณะนี้' }, { status: 400 })
  }

  // ── สร้าง borrow record ──
  const borrowDays = parseInt(process.env.NEXT_PUBLIC_BORROW_DAYS ?? '14')
  const dueDate = addDays(new Date(), borrowDays)

  const { data: borrow, error: borrowError } = await supabase
    .from('borrows')
    .insert({
      user_id: user.id,
      book_id: bookId,
      due_date: dueDate.toISOString(),
      status: 'active',
      reminder_sent: false,
      overdue_notified: false,
    })
    .select()
    .single()

  if (borrowError) {
    return NextResponse.json({ error: borrowError.message }, { status: 500 })
  }

  // DB trigger `update_book_availability()` จัดการลด available_copies อัตโนมัติแล้ว

  // ── เคลียร์คิวของผู้ใช้นี้ (หากเคยจองคิวไว้) และขยับลำดับคนที่ต่อคิวอยู่ ──
  try {
    const { data: userQueue } = await supabase
      .from('queue')
      .select('id, position')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .maybeSingle()

    if (userQueue) {
      await supabase.from('queue').delete().eq('id', userQueue.id)

      const { data: remaining } = await supabase
        .from('queue')
        .select('id, position')
        .eq('book_id', bookId)
        .gt('position', userQueue.position)

      if (remaining && remaining.length > 0) {
        for (const item of remaining) {
          await supabase
            .from('queue')
            .update({ position: item.position - 1 })
            .eq('id', item.id)
        }
      }
    }
  } catch (queueErr) {
    console.error('[Borrow] Error clearing queue record:', queueErr)
  }

  // ── ส่ง email ยืนยัน (fire-and-forget — ไม่ block response) ──
  sendBorrowConfirmEmail({
    to: profile.email,
    name: profile.full_name ?? 'สมาชิก',
    bookTitle: book.title,
    bookAuthor: book.author ?? undefined,
    dueDate,
  }).catch(err => console.error('[Email] sendBorrowConfirmEmail failed:', err))

  return NextResponse.json({ borrow })
}