// app/api/cron/remind/route.ts
//
// Vercel Cron เรียก endpoint นี้ทุกวันตาม schedule ใน vercel.json
// Vercel จะส่ง Authorization: Bearer <CRON_SECRET> มาให้อัตโนมัติ
//
import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { sendReminderEmail, sendOverdueEmail } from '@/lib/resend'
import { addDays, startOfDay, endOfDay, differenceInDays } from 'date-fns'

export async function GET(request: Request) {
  // ── Auth: ตรวจ CRON_SECRET (Vercel ส่งมาใน Authorization header) ──
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()
  const tomorrow = addDays(now, 1)

  // ════════════════════════════════════════════════════════════════
  // PART 1 — Reminder: ยืมที่จะครบกำหนดพรุ่งนี้ และยังไม่ได้แจ้ง
  // ════════════════════════════════════════════════════════════════
  const { data: dueTomorrow } = await supabase
    .from('borrows')
    .select('id, due_date, profiles(email, full_name), books(title, author)')
    .eq('status', 'active')
    .eq('reminder_sent', false)
    .gte('due_date', startOfDay(tomorrow).toISOString())
    .lte('due_date', endOfDay(tomorrow).toISOString())

  let reminderSent = 0
  for (const borrow of dueTomorrow ?? []) {
    const profile = borrow.profiles as unknown as { email: string; full_name: string | null }
    const book = borrow.books as unknown as { title: string; author: string | null }
    try {
      await sendReminderEmail({
        to: profile.email,
        name: profile.full_name ?? 'สมาชิก',
        bookTitle: book.title,
        bookAuthor: book.author ?? undefined,
        dueDate: new Date(borrow.due_date),
      })
      await supabase
        .from('borrows')
        .update({ reminder_sent: true })
        .eq('id', borrow.id)
      reminderSent++
    } catch (err) {
      console.error(`[Cron/Remind] failed for borrow ${borrow.id}:`, err)
    }
  }

  // ════════════════════════════════════════════════════════════════
  // PART 2 — Overdue: เกินกำหนดและยังไม่ได้แจ้ง overdue
  // ════════════════════════════════════════════════════════════════
  const { data: overdueRows } = await supabase
    .from('borrows')
    .select('id, due_date, profiles(email, full_name), books(title, author)')
    .eq('status', 'active')
    .eq('overdue_notified', false)
    .lt('due_date', startOfDay(now).toISOString())   // due_date < วันนี้ตอนเที่ยงคืน

  let overdueSent = 0
  for (const borrow of overdueRows ?? []) {
    const profile = borrow.profiles as unknown as { email: string; full_name: string | null }
    const book = borrow.books as unknown as { title: string; author: string | null }
    const daysOverdue = differenceInDays(now, new Date(borrow.due_date))
    try {
      await sendOverdueEmail({
        to: profile.email,
        name: profile.full_name ?? 'สมาชิก',
        bookTitle: book.title,
        bookAuthor: book.author ?? undefined,
        dueDate: new Date(borrow.due_date),
        daysOverdue,
      })
      // mark overdue_notified + อัปเดต status เป็น overdue
      await supabase
        .from('borrows')
        .update({ overdue_notified: true, status: 'overdue' })
        .eq('id', borrow.id)
      overdueSent++
    } catch (err) {
      console.error(`[Cron/Overdue] failed for borrow ${borrow.id}:`, err)
    }
  }

  console.log(`[Cron/Remind] ${reminderSent} reminder(s), ${overdueSent} overdue(s) sent`)

  return NextResponse.json({
    success: true,
    reminderSent,
    overdueSent,
    runAt: now.toISOString(),
  })
}