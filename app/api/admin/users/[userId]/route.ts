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

  const isSuperAdmin = auth.profile?.role === 'super_admin'

  // ตรวจสอบสิทธิ์การเปลี่ยนบทบาท (Role)
  if ('role' in body && body.role !== undefined) {
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'เฉพาะ Super Admin เท่านั้นที่สามารถเปลี่ยนบทบาทผู้ใช้ได้' },
        { status: 403 }
      )
    }

    if (!['user', 'admin', 'super_admin'].includes(body.role)) {
      return NextResponse.json({ error: 'บทบาทผู้ใช้ไม่ถูกต้อง' }, { status: 400 })
    }

    // ป้องกัน Super Admin คนเดียวลดสิทธิ์ตนเอง
    if (userId === auth.admin.id && body.role !== 'super_admin') {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'super_admin')

      if ((count || 0) <= 1) {
        return NextResponse.json(
          { error: 'ไม่สามารถลดสิทธิ์ตนเองได้ เนื่องจากเป็น Super Admin คนเดียวในระบบ' },
          { status: 400 }
        )
      }
    }
  }

  // ป้องกันการ Blacklist แอดมินหรือ Super Admin
  const { data: target } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (target && ['admin', 'super_admin'].includes(target.role) && body.is_blacklisted === true) {
    return NextResponse.json(
      { error: 'ไม่สามารถระงับสิทธิ์ (Blacklist) ผู้ดูแลระบบได้' },
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
  if (body.role !== undefined && isSuperAdmin) safeFields.role = body.role

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