// app/api/borrow/route.ts
import { createServiceClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { sendBorrowConfirmEmail } from '@/lib/resend'
import { addDays } from 'date-fns'

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

  const { bookId } = await request.json()
  if (!bookId) {
    return NextResponse.json({ error: 'ไม่พบรหัสหนังสือ' }, { status: 400 })
  }

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
    .eq('status', 'active')
    .maybeSingle()

  if (activeBorrow) {
    return NextResponse.json({ error: 'คุณมีหนังสือที่ยืมอยู่แล้ว กรุณาคืนก่อน' }, { status: 400 })
  }

  // ── ตรวจสอบหนังสือว่าง ──
  const { data: book } = await supabase
    .from('books')
    .select('id, title, author, available_copies, total_copies, is_active')
    .eq('id', bookId)
    .single()

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

  // ── ลด available_copies ──
  await supabase
    .from('books')
    .update({ available_copies: book.available_copies - 1 })
    .eq('id', bookId)

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