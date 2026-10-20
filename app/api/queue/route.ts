// app/api/queue/route.ts
import { createServiceClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { queueSchema, validateInput } from '@/lib/validation'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { checkBlacklist } from '@/lib/security'

export async function POST(req: Request) {
  const cookieStore = await cookies()

  // Verify authenticated session from cookies to prevent spoofing
  const userSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate Limit: 10 requests / minute
  const rl = checkRateLimit(`queue:${user.id}`, { maxRequests: 10, windowSeconds: 60 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  // Blacklist check
  const blocked = await checkBlacklist(user.id)
  if (blocked) return blocked

  // Validate input
  const body = await req.json()
  const parsed = validateInput(queueSchema, body)
  if (parsed.error) return parsed.error
  const { bookId, action } = parsed.data

  // Always use user.id from verified session
  const userId = user.id

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

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies()
    const userSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await userSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Queue ID is required' }, { status: 400 })

    const supabase = createServiceClient()

    // 1. Fetch queue item
    const { data: queueItem } = await supabase
      .from('queue')
      .select('id, book_id, user_id, position')
      .eq('id', id)
      .maybeSingle()

    if (!queueItem) {
      return NextResponse.json({ success: true, message: 'Queue item already removed' })
    }

    // 2. Check permission (admin or item owner)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    if (!isAdmin && queueItem.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Delete queue item
    const { error: deleteError } = await supabase
      .from('queue')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete queue item' }, { status: 500 })
    }

    // 4. Shift subsequent positions down
    const { data: remaining } = await supabase
      .from('queue')
      .select('id, position')
      .eq('book_id', queueItem.book_id)
      .gt('position', queueItem.position)

    if (remaining && remaining.length > 0) {
      for (const item of remaining) {
        await supabase
          .from('queue')
          .update({ position: item.position - 1 })
          .eq('id', item.id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}