import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createSessionClient } from '@/lib/supabase-server'
import { inviteTokenSchema, validateInput } from '@/lib/validation'
import {
  MAX_ADMINS,
  findInvitationByToken,
  updateInvitationRecord,
  finalizeAdminTransfer,
  getAdmins,
  friendlyDbError,
} from '@/lib/admin-invitations'

async function currentUser() {
  const session = await createSessionClient()
  const { data: { user } } = await session.auth.getUser()
  return user
}

/**
 * GET ?token= — ข้อมูลคำเชิญสำหรับแสดงในหน้า /invite
 */
export async function GET(req: NextRequest) {
  const parsed = validateInput(inviteTokenSchema, { token: req.nextUrl.searchParams.get('token') })
  if (parsed.error) return parsed.error

  const supabase = createServiceClient()

  try {
    const found = await findInvitationByToken(supabase, parsed.data.token)
    if (!found) return NextResponse.json({ error: 'ไม่พบคำเชิญ หรือลิงก์ไม่ถูกต้อง' }, { status: 404 })
    const { inv, kind } = found
    const user = await currentUser()

    const ids = [inv.invited_by, inv.replace_admin_id].filter(Boolean)
    const { data: people } = ids.length
      ? await supabase.from('profiles').select('id, email, full_name').in('id', ids)
      : { data: [] as any[] }
    const byId = (id: string | null) => (people || []).find((p: any) => p.id === id) || null

    const expired = inv.status === 'pending' && new Date(inv.expires_at).getTime() < Date.now()
    const isRightUser =
      !!user &&
      (kind === 'accept'
        ? user.email?.toLowerCase() === inv.email.toLowerCase()
        : user.id === inv.replace_admin_id)

    return NextResponse.json({
      kind,
      status: expired ? 'expired' : inv.status,
      email: inv.email,
      expiresAt: inv.expires_at,
      inviter: byId(inv.invited_by),
      replacing: byId(inv.replace_admin_id),
      acceptedAt: inv.accepted_at,
      resignConfirmedAt: inv.resign_confirmed_at,
      currentEmail: user?.email ?? null,
      isRightUser,
    })
  } catch (e: any) {
    return NextResponse.json({ error: friendlyDbError(e?.message || 'เกิดข้อผิดพลาด') }, { status: 500 })
  }
}

/**
 * POST { token } — ยืนยันคำเชิญ (ผู้ได้รับเชิญ) หรือยืนยันสละสิทธิ์ (แอดมินเดิม)
 * เมื่อครบทุกเงื่อนไข → finalizeAdminTransfer() ทำงานแบบ atomic
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const parsed = validateInput(inviteTokenSchema, body)
  if (parsed.error) return parsed.error

  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 })

  const supabase = createServiceClient()

  try {
    const found = await findInvitationByToken(supabase, parsed.data.token)
    if (!found) return NextResponse.json({ error: 'ไม่พบคำเชิญ หรือลิงก์ไม่ถูกต้อง' }, { status: 404 })
    const { inv, kind } = found

    if (inv.status !== 'pending') {
      return NextResponse.json({ error: 'คำเชิญนี้ถูกใช้งาน ยกเลิก หรือหมดอายุแล้ว' }, { status: 410 })
    }
    if (new Date(inv.expires_at).getTime() < Date.now()) {
      await updateInvitationRecord(supabase, inv.id, { status: 'expired' })
      return NextResponse.json({ error: 'ลิงก์หมดอายุแล้ว กรุณาขอคำเชิญใหม่' }, { status: 410 })
    }

    const now = new Date().toISOString()
    let next = { ...inv }

    if (kind === 'accept') {
      if (user.email?.toLowerCase() !== inv.email.toLowerCase()) {
        return NextResponse.json(
          { error: `คำเชิญนี้สำหรับ ${inv.email} — กรุณาเข้าสู่ระบบด้วยอีเมลนั้น` },
          { status: 403 }
        )
      }
      let { data: profile } = await supabase
        .from('profiles')
        .select('is_blacklisted, role')
        .eq('id', user.id)
        .maybeSingle()
      if (!profile) {
        const { data: createdProfile } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email || inv.email,
            full_name: user.user_metadata?.full_name || inv.email.split('@')[0],
            avatar_url: user.user_metadata?.avatar_url || null,
            role: 'user',
            is_blacklisted: false,
          })
          .select('is_blacklisted, role')
          .single()
        if (createdProfile) {
          profile = createdProfile
        }
      }
      if (profile?.is_blacklisted) {
        return NextResponse.json({ error: 'บัญชีนี้ถูกระงับสิทธิ์ ไม่สามารถเป็นผู้ดูแลได้' }, { status: 403 })
      }
      if (!inv.accepted_at) {
        await updateInvitationRecord(supabase, inv.id, { accepted_at: now, accepted_user_id: user.id })
        next = { ...next, accepted_at: now, accepted_user_id: user.id }
      }
    } else {
      if (user.id !== inv.replace_admin_id) {
        return NextResponse.json({ error: 'ลิงก์นี้สำหรับผู้ดูแลที่ถูกแทนที่เท่านั้น' }, { status: 403 })
      }
      if (!inv.resign_confirmed_at) {
        await updateInvitationRecord(supabase, inv.id, { resign_confirmed_at: now })
        next = { ...next, resign_confirmed_at: now }
      }
    }

    const ready = !!next.accepted_user_id && (!next.replace_admin_id || !!next.resign_confirmed_at)
    if (!ready) {
      return NextResponse.json({
        status: kind === 'accept' ? 'waiting_resign' : 'waiting_accept',
      })
    }

    // กันกรณีช่องแอดมินเต็มระหว่างรอ (เพิ่มแบบไม่แทนที่)
    if (!next.replace_admin_id) {
      const admins = await getAdmins(supabase)
      if (admins.length >= MAX_ADMINS) {
        return NextResponse.json({ error: `ระบบมีผู้ดูแลครบ ${MAX_ADMINS} คนแล้ว` }, { status: 409 })
      }
    }

    // สลับตำแหน่งแอดมิน
    await finalizeAdminTransfer(supabase, inv.id)

    return NextResponse.json({ status: 'completed' })
  } catch (e: any) {
    return NextResponse.json({ error: friendlyDbError(e?.message || 'เกิดข้อผิดพลาด') }, { status: 500 })
  }
}
