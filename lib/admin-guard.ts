import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'

export const ADMIN_ROLES = ['admin', 'super_admin'] as const
export type AdminRole = typeof ADMIN_ROLES[number]

export interface AuthenticatedAdminProfile {
  id: string
  email: string
  full_name: string | null
  role: AdminRole
  is_blacklisted: boolean
}

export type AdminAuthResult =
  | { ok: true; admin: User; profile: AuthenticatedAdminProfile }
  | { ok: false; response: NextResponse }

/**
 * ตรวจสอบว่า request มาจาก admin หรือ super_admin หรือไม่
 * ใช้ใน API routes ฝั่ง admin เพื่อป้องกันการเรียกตรงโดยไม่ผ่าน middleware
 *
 * @returns { ok: true, admin, profile } เมื่อมีสิทธิ์
 * @returns { ok: false, response } เมื่อไม่มีสิทธิ์
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const cookieStore = await cookies()
  const userSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    }
  )

  const {
    data: { user },
  } = await userSupabase.auth.getUser()

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบก่อน' },
        { status: 401 }
      ),
    }
  }

  // ใช้ service client เพื่อ bypass RLS แล้วตรวจ role
  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_blacklisted')
    .eq('id', user.id)
    .single()

  if (!profile?.role || !ADMIN_ROLES.includes(profile.role as AdminRole)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง (ต้องเป็น Admin หรือ Super Admin)' },
        { status: 403 }
      ),
    }
  }

  return {
    ok: true,
    admin: user,
    profile: profile as AuthenticatedAdminProfile,
  }
}

/**
 * ตรวจสอบว่า request มาจาก super_admin หรือไม่
 */
export async function requireSuperAdmin(): Promise<AdminAuthResult> {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck

  if (adminCheck.profile.role !== 'super_admin') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'ไม่มีสิทธิ์ดำเนินการ (เฉพาะ Super Admin เท่านั้น)' },
        { status: 403 }
      ),
    }
  }

  return adminCheck
}
