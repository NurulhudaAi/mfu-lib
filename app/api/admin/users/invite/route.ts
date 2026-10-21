import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServiceClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-guard'
import { inviteAdminSchema, validateInput } from '@/lib/validation'
import {
  MAX_ADMINS,
  INVITE_TTL_HOURS,
  generateToken,
  inviteLink,
  getAdmins,
  getPendingInvitations,
  saveInvitationRecord,
  cancelInvitation,
  friendlyDbError,
  AdminInvitation,
} from '@/lib/admin-invitations'
import { sendAdminInviteEmail, sendAdminResignEmail } from '@/lib/resend'

/**
 * GET  — รายชื่อแอดมินปัจจุบัน + คำเชิญที่รอดำเนินการ
 */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const supabase = createServiceClient()
  try {
    const [admins, pending] = await Promise.all([getAdmins(supabase), getPendingInvitations(supabase)])
    return NextResponse.json({ admins, pending, maxAdmins: MAX_ADMINS })
  } catch (e: any) {
    return NextResponse.json({ error: friendlyDbError(e?.message || 'โหลดข้อมูลไม่สำเร็จ') }, { status: 500 })
  }
}

/**
 * POST — ส่งคำเชิญเป็นแอดมินทางอีเมล
 *   - ถ้ามีแอดมิน < 2 คน: เชิญเพิ่มได้เลย
 *   - ถ้ามีครบ 2 คน: ต้องระบุ replaceAdminId (แอดมินที่จะออก) → แอดมินเดิมต้องยืนยันทางอีเมลด้วย
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => ({}))
  const parsed = validateInput(inviteAdminSchema, body)
  if (parsed.error) return parsed.error
  const { email, replaceAdminId } = parsed.data

  const supabase = createServiceClient()

  try {
    const [admins, pending] = await Promise.all([getAdmins(supabase), getPendingInvitations(supabase)])

    // ถ้ามีคำเชิญที่รอดำเนินการสำหรับอีเมลเดียวกัน ให้ยกเลิกอันเดิมและออกคำเชิญใหม่ได้ทันที
    const sameEmailPending = pending.find((p) => p.email?.toLowerCase() === email.toLowerCase())
    if (sameEmailPending) {
      await cancelInvitation(supabase, sameEmailPending.id)
    } else if (pending.length > 0) {
      return NextResponse.json(
        { error: `มีคำเชิญของ ${pending[0].email} รอดำเนินการอยู่ กรุณายกเลิกคำเชิญเดิมก่อนส่งใหม่` },
        { status: 409 }
      )
    }

    if (admins.some((a) => a.email?.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json({ error: `${email} เป็นผู้ดูแลระบบอยู่แล้ว` }, { status: 400 })
    }

    const replaceAdmin = replaceAdminId ? admins.find((a) => a.id === replaceAdminId) : null
    if (replaceAdminId && !replaceAdmin) {
      return NextResponse.json({ error: 'ไม่พบผู้ดูแลที่ต้องการแทนที่' }, { status: 400 })
    }
    if (admins.length >= MAX_ADMINS && !replaceAdmin) {
      return NextResponse.json(
        { error: `ระบบมีผู้ดูแลครบ ${MAX_ADMINS} คนแล้ว กรุณาเลือกผู้ดูแลที่จะออกเพื่อแทนที่` },
        { status: 400 }
      )
    }

    // ข้อมูลผู้เชิญ (แสดงในอีเมล)
    const inviter = admins.find((a) => a.id === auth.admin.id)
    const inviterName = inviter?.full_name || inviter?.email || 'ผู้ดูแลระบบ'

    const invite = generateToken()
    const resign = replaceAdmin ? generateToken() : null
    const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000)
    const generatedInviteLink = inviteLink(invite.token)
    const generatedResignLink = resign ? inviteLink(resign.token) : null

    const record: AdminInvitation = {
      id: randomUUID(),
      email,
      token_hash: invite.hash,
      invited_by: auth.admin.id,
      replace_admin_id: replaceAdmin?.id ?? null,
      resign_token_hash: resign?.hash ?? null,
      accepted_at: null,
      accepted_user_id: null,
      resign_confirmed_at: null,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
      completed_at: null,
      created_at: new Date().toISOString(),
      invite_link: generatedInviteLink,
      resign_link: generatedResignLink || undefined,
    }

    const saved = await saveInvitationRecord(supabase, record)

    // ตรวจสอบชื่อผู้ถูกเชิญหากมีบัญชีอยู่แล้วในระบบ
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .ilike('email', email.trim())
      .maybeSingle()

    // ── ส่งอีเมล ──
    const inviteRes = await sendAdminInviteEmail({
      to: email,
      name: targetProfile?.full_name || null,
      inviterName,
      replacingName: replaceAdmin ? replaceAdmin.full_name || replaceAdmin.email : null,
      link: generatedInviteLink,
      expiresAt,
    })

    let resignRes: { error?: any; wasRedirectedToTestEmail?: boolean } | null = null
    if (replaceAdmin && resign && generatedResignLink) {
      resignRes = await sendAdminResignEmail({
        to: replaceAdmin.email,
        name: replaceAdmin.full_name || replaceAdmin.email,
        newAdminEmail: email,
        inviterName,
        link: generatedResignLink,
        expiresAt,
      })
    }

    const emailError = inviteRes?.error || resignRes?.error
    const emailSent = !emailError
    const wasRedirected = Boolean(inviteRes?.wasRedirectedToTestEmail || resignRes?.wasRedirectedToTestEmail)

    return NextResponse.json({
      success: true,
      message: emailSent
        ? (replaceAdmin
            ? `ส่งคำเชิญถึง ${email} และคำขอยืนยันถึง ${replaceAdmin.email} แล้ว`
            : `ส่งคำเชิญถึง ${email} เรียบร้อยแล้ว`)
        : `สร้างคำเชิญสำเร็จแล้ว (ระบบไม่สามารถส่งอีเมลอัตโนมัติได้: ${emailError?.message || 'ข้อจำกัดระบบอีเมล'}) คุณสามารถคัดลอกลิงก์คำเชิญด้านล่างส่งให้ผู้ดูแลใหม่ได้ทันที`,
      inviteLink: generatedInviteLink,
      resignLink: generatedResignLink,
      wasRedirectedToTestEmail: wasRedirected,
      testEmail: process.env.RESEND_TEST_EMAIL || '6631501067@lamduan.mfu.ac.th',
      emailSent,
    })
  } catch (e: any) {
    return NextResponse.json({ error: friendlyDbError(e?.message || 'เกิดข้อผิดพลาด') }, { status: 500 })
  }
}

/**
 * DELETE ?id=<invitationId> — ยกเลิกคำเชิญที่รอดำเนินการ
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const id = req.nextUrl.searchParams.get('id') || ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'รหัสคำเชิญไม่ถูกต้อง' }, { status: 400 })
  }

  const supabase = createServiceClient()
  try {
    await cancelInvitation(supabase, id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: friendlyDbError(err?.message || 'ยกเลิกไม่สำเร็จ') }, { status: 500 })
  }
}
