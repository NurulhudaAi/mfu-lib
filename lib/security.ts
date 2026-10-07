/**
 * Security Helpers — ฟังก์ชันช่วยสำหรับ security layer ต่าง ๆ
 */
import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * ดึง IP จาก request headers (ใช้กับ Vercel / reverse proxy)
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return '127.0.0.1'
}

/**
 * ตรวจสอบว่า user ถูก blacklist หรือไม่
 * ใช้ service client bypass RLS
 *
 * @returns null ถ้าไม่ถูก blacklist, NextResponse ถ้าถูก blacklist
 */
export async function checkBlacklist(userId: string): Promise<NextResponse | null> {
  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_blacklisted, blacklist_reason')
    .eq('id', userId)
    .single()

  if (profile?.is_blacklisted) {
    return NextResponse.json(
      {
        error: 'บัญชีของคุณถูกระงับสิทธิ์การใช้งาน',
        reason: profile.blacklist_reason || undefined,
      },
      { status: 403 }
    )
  }
  return null
}

/**
 * Security headers ที่ควรแนบไปกับ response (ใช้ใน middleware)
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  }
}
