import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

// Service role client สำหรับ query profiles (bypass RLS ที่มี recursion)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ── Security Headers ──
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return '127.0.0.1'
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

  // ── แนบ Security Headers ทุก response ──
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }

  // ── Rate Limiting สำหรับ API routes (ยกเว้น cron ที่มี CRON_SECRET) ──
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/cron')) {
    const ip = getClientIP(request)
    const result = checkRateLimit(`api:${ip}`, {
      maxRequests: 30,
      windowSeconds: 60,
    })
    if (!result.allowed) {
      return rateLimitResponse(result.resetAt)
    }
  }

  // ── สร้าง Supabase client ที่อ่าน/เขียน cookie ได้ ──
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          // ── แนบ Security Headers อีกครั้งหลังสร้าง response ใหม่ ──
          for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
            response.headers.set(key, value)
          }
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ── ดึง session (refresh token อัตโนมัติ) ──
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── Guard: หน้าที่ต้อง login ──
  const requiresAuth = pathname.startsWith('/my-borrows') || pathname.startsWith('/return/')
  if (requiresAuth && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Guard: ตรวจ blacklist สำหรับหน้าที่ต้องใช้สิทธิ์ ──
  if (requiresAuth && user) {
    const serviceClient = getServiceClient()
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('is_blacklisted')
      .eq('id', user.id)
      .single()

    if (profile?.is_blacklisted) {
      // Redirect ไปหน้าแรกพร้อม query param แจ้งเตือน
      const blockedUrl = new URL('/', request.url)
      blockedUrl.searchParams.set('blocked', 'true')
      return NextResponse.redirect(blockedUrl)
    }
  }

  // ── Guard: หน้า admin ──
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // ใช้ service role เพื่อ bypass RLS (แก้ปัญหา infinite recursion ใน profiles policy)
    const serviceClient = getServiceClient()
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Removed guard for /login to prevent trapping users if their client-side session is out of sync with the server-side cookie.

  return response
}

export const config = {
  matcher: [
    /*
     * match ทุก path ยกเว้น:
     * - _next/static  (static files)
     * - _next/image   (image optimization)
     * - favicon.ico
     * - public files (png, jpg, svg, ฯลฯ)
     * - api/cron      (Vercel Cron — ใช้ CRON_SECRET แทน session)
     * - auth/callback (OAuth callback)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/cron|auth/callback).*)',
  ],
}