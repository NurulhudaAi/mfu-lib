import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const ADMIN_ROLES = ['admin', 'super_admin'] as const
export type AdminRole = typeof ADMIN_ROLES[number]

/**
 * ตรวจสอบว่า request มาจาก admin หรือ super_admin หรือไม่
 * ใช้ใน API routes ฝั่ง admin เพื่อป้องกันการเรียกตรงโดยไม่ผ่าน middleware
 *
 * @returns { ok: true, admin, profile } ถ้ามีสิทธิ์ admin หรือ super_admin
 * @returns { ok: false, response: NextResponse } ถ้าไม่มีสิทธิ์
 */
export async function requireAdmin(): Promise<
  | { ok: true; admin: any; profile: any }
  | { ok: false; response: NextResponse }
> {
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

  if (!profile?.role || !ADMIN_ROLES.includes(profile.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง (ต้องเป็น Admin หรือ Super Admin)' },
        { status: 403 }
      ),
    }
  }

  return { ok: true, admin: user, profile }
}

/**
 * ตรวจสอบว่า request มาจาก super_admin หรือไม่
 */
export async function requireSuperAdmin(): Promise<
  | { ok: true; admin: any; profile: any }
  | { ok: false; response: NextResponse }
> {
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
