// ✅ BUG FIX #4 (Security): ตัวอย่าง /api/queue/route.ts ที่ verify userId จาก session
// วางไว้ที่ app/api/queue/route.ts

import { createServiceClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const cookieStore = await cookies()

  // ✅ Verify session — ไม่รับ userId จาก body (ป้องกัน spoofing)
  const userSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId, action } = await req.json()
  // ✅ ใช้ user.id จาก session เสมอ — ไม่ใช้ userId จาก request body
  const userId = user.id

  if (!bookId || !action) {
    return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 })
  }

  const supabase = createServiceClient()

  if (action === 'join') {
    // ตรวจสอบว่ายังไม่มีในคิว
    const { data: existing } = await supabase
      .from('queue')
      .select('id')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .maybeSingle()

    if (existing) return NextResponse.json({ error: 'อยู่ในคิวแล้ว' }, { status: 400 })

    // หา position ถัดไป
    const { count } = await supabase
      .from('queue')
      .select('*', { count: 'exact', head: true })
      .eq('book_id', bookId)

    const { error } = await supabase
      .from('queue')
      .insert({ user_id: userId, book_id: bookId, position: (count || 0) + 1 })

    if (error) return NextResponse.json({ error: 'เข้าคิวไม่สำเร็จ' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'leave') {
    // 1. หาตำแหน่งปัจจุบันก่อน
    const { data: existing } = await supabase
      .from('queue')
      .select('position')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .maybeSingle()

    if (!existing) return NextResponse.json({ success: true })

    const { error } = await supabase
      .from('queue')
      .delete()
      .eq('user_id', userId) // ← ใช้ user.id จาก session เสมอ
      .eq('book_id', bookId)

    if (error) return NextResponse.json({ error: 'ยกเลิกคิวไม่สำเร็จ' }, { status: 500 })

    // 2. อัปเดตตำแหน่งคนที่อยู่หลังให้ขยับขึ้นมา
    const { data: remaining } = await supabase
      .from('queue')
      .select('id, position')
      .eq('book_id', bookId)
      .gt('position', existing.position)

    if (remaining && remaining.length > 0) {
      for (const item of remaining) {
        await supabase
          .from('queue')
          .update({ position: item.position - 1 })
          .eq('id', item.id)
      }
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'action ไม่ถูกต้อง' }, { status: 400 })
}