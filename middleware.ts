import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

// Service role client สำหรับ query profiles (bypass RLS ที่มี recursion)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

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