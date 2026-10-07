import { createServiceClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { cancelBorrowSchema, validateInput } from '@/lib/validation'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: Request) {
  // --- Auth verify: ตรวจสอบ session จริงจาก cookie ---
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

  // ── Rate Limit: 5 ครั้ง/นาที ──
  const rl = checkRateLimit(`cancel-borrow:${user.id}`, { maxRequests: 5, windowSeconds: 60 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  // ── Validate input ──
  const body = await request.json()
  const parsed = validateInput(cancelBorrowSchema, body)
  if (parsed.error) return parsed.error
  const { borrowId } = parsed.data

  // ใช้ userId จาก session เท่านั้น (ไม่รับจาก client)
  const userId = user.id
  const supabase = createServiceClient()

  const { data: borrow } = await supabase
    .from('borrows').select('*, books(available_copies, total_copies)').eq('id', borrowId).single()

  // ตรวจสอบว่า borrow เป็นของ user คนนี้จริง (ป้องกัน IDOR)
  if (!borrow || borrow.user_id !== userId) {
    return NextResponse.json({ error: 'ไม่พบข้อมูลการยืม' }, { status: 404 })
  }

  if (borrow.status !== 'active') {
    return NextResponse.json({ error: 'ไม่สามารถยกเลิกได้' }, { status: 400 })
  }

  // Update borrow status → 'returned' — DB trigger จะ increment available_copies
  const { error: updateError } = await supabase.from('borrows').update({
    status: 'returned',
    returned_at: new Date().toISOString(),
    notes: 'ยกเลิกโดยผู้ใช้',
  }).eq('id', borrowId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Safety fallback: ตอนนี้ใช้ DB Trigger จัดการแล้ว ไม่ต้อง manual update

  // Notify next in queue
  const { data: firstQueue } = await supabase
    .from('queue')
    .select('id')
    .eq('book_id', borrow.book_id)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (firstQueue) {
    await supabase.from('queue').update({ notified: true }).eq('id', firstQueue.id)
  }

  return NextResponse.json({ success: true })
}
