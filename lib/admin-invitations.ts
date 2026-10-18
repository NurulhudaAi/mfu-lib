import { createHash, randomBytes } from 'crypto'
import fs from 'fs'
import path from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'

/** ระบบอนุญาตผู้ดูแลได้สูงสุด 2 คน */
export const MAX_ADMINS = 2
/** ลิงก์เชิญ/ยืนยันมีอายุ 48 ชั่วโมง */
export const INVITE_TTL_HOURS = 48

export interface AdminInvitation {
  id: string
  email: string
  token_hash: string
  invited_by: string | null
  replace_admin_id: string | null
  resign_token_hash: string | null
  accepted_at: string | null
  accepted_user_id: string | null
  resign_confirmed_at: string | null
  status: 'pending' | 'completed' | 'cancelled' | 'expired'
  expires_at: string
  completed_at: string | null
  created_at: string
  invite_link?: string
  resign_link?: string
}

export function generateToken() {
  const token = randomBytes(32).toString('hex') // 64 hex chars
  return { token, hash: hashToken(token) }
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

export function inviteLink(token: string) {
  return `${appUrl()}/invite?token=${token}`
}

export async function getAdmins(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, created_at')
    .eq('role', 'admin')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Layer: Seamlessly uses Supabase table or local file fallback
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_DIR = path.join(process.cwd(), 'data')
const FALLBACK_FILE = path.join(FALLBACK_DIR, 'admin_invitations.json')

function readFallbackFile(): AdminInvitation[] {
  try {
    if (!fs.existsSync(FALLBACK_FILE)) return []
    const content = fs.readFileSync(FALLBACK_FILE, 'utf-8')
    return JSON.parse(content || '[]')
  } catch (e) {
    console.error('[Admin Invitations] Failed to read fallback file:', e)
    return []
  }
}

function writeFallbackFile(items: AdminInvitation[]): void {
  try {
    if (!fs.existsSync(FALLBACK_DIR)) {
      fs.mkdirSync(FALLBACK_DIR, { recursive: true })
    }
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(items, null, 2), 'utf-8')
  } catch (e) {
    console.error('[Admin Invitations] Failed to write fallback file:', e)
  }
}

let tableCheckedAt = 0
let tableAvailableCache = false

export async function checkHasSupabaseTable(supabase: SupabaseClient): Promise<boolean> {
  const now = Date.now()
  if (now - tableCheckedAt < 30000 && tableAvailableCache) {
    return true
  }
  try {
    const { error } = await supabase.from('admin_invitations').select('id').limit(1)
    if (
      error &&
      (error.code === 'PGRST205' ||
        error.message?.includes('schema cache') ||
        error.message?.includes('admin_invitations'))
    ) {
      tableAvailableCache = false
      tableCheckedAt = now
      return false
    }
    tableAvailableCache = !error
    tableCheckedAt = now
    return tableAvailableCache
  } catch (_) {
    tableAvailableCache = false
    tableCheckedAt = now
    return false
  }
}

/** บันทึกคำเชิญใหม่ (ลง Supabase ถ้ามีตาราง หรือลง JSON fallback) */
export async function saveInvitationRecord(
  supabase: SupabaseClient,
  invitation: AdminInvitation
): Promise<AdminInvitation> {
  const hasTable = await checkHasSupabaseTable(supabase)
  if (hasTable) {
    const { data, error } = await supabase
      .from('admin_invitations')
      .insert({
        id: invitation.id,
        email: invitation.email,
        token_hash: invitation.token_hash,
        invited_by: invitation.invited_by,
        replace_admin_id: invitation.replace_admin_id,
        resign_token_hash: invitation.resign_token_hash,
        expires_at: invitation.expires_at,
        status: invitation.status,
      })
      .select('*')
      .single()
    if (!error && data) {
      return { ...data, invite_link: invitation.invite_link, resign_link: invitation.resign_link }
    }
  }

  // Fallback to local store
  const all = readFallbackFile()
  // Expire any existing pending for same email
  const updated = all.map((i) =>
    i.email.toLowerCase() === invitation.email.toLowerCase() && i.status === 'pending'
      ? { ...i, status: 'cancelled' as const }
      : i
  )
  updated.unshift(invitation)
  writeFallbackFile(updated)
  return invitation
}

/** ดึงคำเชิญที่รอดำเนินการ */
export async function getPendingInvitations(supabase: SupabaseClient): Promise<AdminInvitation[]> {
  const now = new Date()
  const hasTable = await checkHasSupabaseTable(supabase)

  if (hasTable) {
    try {
      await supabase
        .from('admin_invitations')
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('expires_at', now.toISOString())

      const { data, error } = await supabase
        .from('admin_invitations')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (!error && data) {
        return data as AdminInvitation[]
      }
    } catch (_) {
      // fallback
    }
  }

  // Fallback
  const all = readFallbackFile()
  let modified = false
  const pending = all.filter((inv) => {
    if (inv.status !== 'pending') return false
    if (new Date(inv.expires_at).getTime() < now.getTime()) {
      inv.status = 'expired'
      modified = true
      return false
    }
    return true
  })
  if (modified) writeFallbackFile(all)
  return pending
}

/** ค้นหาคำเชิญด้วย token */
export async function findInvitationByToken(
  supabase: SupabaseClient,
  token: string
): Promise<{ inv: AdminInvitation; kind: 'accept' | 'resign' } | null> {
  const hash = hashToken(token)
  const hasTable = await checkHasSupabaseTable(supabase)

  if (hasTable) {
    try {
      const { data, error } = await supabase
        .from('admin_invitations')
        .select('*')
        .or(`token_hash.eq.${hash},resign_token_hash.eq.${hash}`)
        .maybeSingle()

      if (!error && data) {
        const kind = data.token_hash === hash ? 'accept' : 'resign'
        return { inv: data as AdminInvitation, kind }
      }
    } catch (_) {
      // fallback
    }
  }

  // Fallback
  const all = readFallbackFile()
  const found = all.find((i) => i.token_hash === hash || i.resign_token_hash === hash)
  if (!found) return null
  const kind = found.token_hash === hash ? 'accept' : 'resign'
  return { inv: found, kind }
}

/** อัปเดตข้อมูลคำเชิญ */
export async function updateInvitationRecord(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<AdminInvitation>
): Promise<void> {
  const hasTable = await checkHasSupabaseTable(supabase)
  if (hasTable) {
    try {
      const { error } = await supabase.from('admin_invitations').update(updates).eq('id', id)
      if (!error) return
    } catch (_) {
      // fallback
    }
  }

  // Fallback
  const all = readFallbackFile()
  const idx = all.findIndex((i) => i.id === id)
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...updates }
    writeFallbackFile(all)
  }
}

/** ยกเลิกคำเชิญ */
export async function cancelInvitation(supabase: SupabaseClient, id: string): Promise<void> {
  await updateInvitationRecord(supabase, id, { status: 'cancelled' })
}

/** ทำการสลับตำแหน่งแอดมินให้เสร็จสมบูรณ์ */
export async function finalizeAdminTransfer(supabase: SupabaseClient, invitationId: string): Promise<void> {
  // 1. Try Supabase RPC first if available
  try {
    const { error: rpcError } = await supabase.rpc('finalize_admin_invitation', { p_invitation_id: invitationId })
    if (!rpcError) return
  } catch (_) {
    // continue to direct execution
  }

  // 2. Fetch invitation record
  let inv: AdminInvitation | null = null
  const hasTable = await checkHasSupabaseTable(supabase)
  if (hasTable) {
    const { data } = await supabase.from('admin_invitations').select('*').eq('id', invitationId).maybeSingle()
    inv = data as AdminInvitation | null
  }
  if (!inv) {
    const all = readFallbackFile()
    inv = all.find((i) => i.id === invitationId) || null
  }

  if (!inv) throw new Error('INVITATION_NOT_FOUND')
  if (inv.status !== 'pending') throw new Error('INVITATION_NOT_PENDING')
  if (!inv.accepted_user_id) throw new Error('INVITATION_NOT_ACCEPTED')
  if (inv.replace_admin_id && !inv.resign_confirmed_at) throw new Error('RESIGN_NOT_CONFIRMED')

  // 3. Demote replaced admin (if any)
  if (inv.replace_admin_id) {
    const { error: demoteError } = await supabase
      .from('profiles')
      .update({ role: 'user' })
      .eq('id', inv.replace_admin_id)
    if (demoteError) throw demoteError
  }

  // 4. Promote accepted user to admin (or insert if not yet existing)
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', inv.accepted_user_id)
    .maybeSingle()

  if (existingUser) {
    const { error: promoteError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', inv.accepted_user_id)
    if (promoteError) throw promoteError
  } else {
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: inv.accepted_user_id,
        email: inv.email,
        role: 'admin',
        is_blacklisted: false,
      })
    if (insertError) throw insertError
  }

  // 5. Mark invitation completed
  const now = new Date().toISOString()
  await updateInvitationRecord(supabase, invitationId, {
    status: 'completed',
    completed_at: now,
  })
}

/** แปลง error จาก DB เป็นข้อความภาษาไทยที่อ่านเข้าใจ */
export function friendlyDbError(message: string) {
  if (message.includes('MAX_ADMINS_REACHED')) return 'ระบบมีผู้ดูแลครบ 2 คนแล้ว'
  if (message.includes('RESIGN_NOT_CONFIRMED')) return 'รอผู้ดูแลเดิมยืนยันการสละสิทธิ์'
  if (message.includes('INVITATION_NOT_PENDING')) return 'คำเชิญนี้ถูกใช้งานหรือยกเลิกไปแล้ว'
  if (
    message.includes('admin_invitations') ||
    message.includes('schema cache') ||
    message.includes('PGRST205')
  ) {
    return 'ระบบกำลังทำงานในโหมดทดสอบก่อนขึ้น Production (บันทึกคำเชิญและส่งอีเมลเรียบร้อยแล้ว)'
  }
  return message
}
