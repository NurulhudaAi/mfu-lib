import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * ตรวจสอบว่า request มาจาก admin หรือไม่
 * ใช้ใน API routes ฝั่ง admin เพื่อป้องกันการเรียกตรงโดยไม่ผ่าน middleware
 *
 * @returns { ok: true } ถ้าเป็น admin
 * @returns { ok: false, response: NextResponse } ถ้าไม่ใช่ admin (ส่ง response กลับได้เลย)
 */
export async function requireAdmin(): Promise<
  | { ok: true }
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
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      ),
    }
  }

  return { ok: true }
}
