import { createServiceClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-guard'
import { NextResponse } from 'next/server'
import { updateUserSchema, validateInput } from '@/lib/validation'

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const supabase = createServiceClient()
  const { userId } = await params

  // ── Validate UUID format ──
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(userId)) {
    return NextResponse.json({ error: 'รหัสผู้ใช้ไม่ถูกต้อง' }, { status: 400 })
  }

  // ── Validate input ──
  const rawBody = await request.json()
  const parsed = validateInput(updateUserSchema, rawBody)
  if (parsed.error) return parsed.error
  const body = parsed.data

  // Protect role switching - must use email invite flow
  if ('role' in body && body.role === 'admin') {
    return NextResponse.json(
      { error: 'ไม่อนุญาตให้เปลี่ยนบทบาทแอดมินผ่านหน้านี้ กรุณาใช้ระบบเชิญด้วยอีเมล' },
      { status: 400 }
    )
  }

  // Blacklist validation
  if (body.is_blacklisted === true) {
    const reason = body.reason?.trim() || body.blacklist_reason?.trim()
    if (!reason) {
      return NextResponse.json(
        { error: 'จำเป็นต้องระบุเหตุผลในการระงับสิทธิ์ (Blacklist)' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        is_blacklisted: true,
        blacklist_reason: reason,
      })
      .eq('id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Optional log
    try {
      await supabase.from('blacklist_log').insert({
        user_id: userId,
        action: 'added',
        reason,
        admin_id: auth.admin.id,
      })
    } catch (_) {}

    return NextResponse.json({ success: true })
  }

  if (body.is_blacklisted === false) {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_blacklisted: false,
        blacklist_reason: null,
      })
      .eq('id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Optional log
    try {
      await supabase.from('blacklist_log').insert({
        user_id: userId,
        action: 'removed',
        reason: body.reason || 'ปลดการระงับสิทธิ์',
        admin_id: auth.admin.id,
      })
    } catch (_) {}

    return NextResponse.json({ success: true })
  }

  // Other profile updates — only allow safe fields
  const safeFields: Record<string, any> = {}
  if (body.full_name !== undefined) safeFields.full_name = body.full_name
  if (body.role !== undefined && body.role !== 'admin') safeFields.role = body.role

  if (Object.keys(safeFields).length === 0) {
    return NextResponse.json({ error: 'ไม่มีข้อมูลที่ต้องอัปเดต' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update(safeFields)
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}