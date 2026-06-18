import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
    loginUrl.searchParams.set('redirect', pathname)   // จำ path ไว้ redirect กลับหลัง login
    return NextResponse.redirect(loginUrl)
  }

  // ── Guard: หน้า admin ──
  if (pathname.startsWith('/admin')) {
    // ยังไม่ login → ไปหน้า login
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Login แล้วแต่ต้องตรวจ role จาก DB
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // ไม่ใช่ admin → เด้งกลับหน้าแรก
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // ── Guard: ถ้า login แล้วพยายามเข้าหน้า /login → redirect ไปหน้าหลัก ──
  if (pathname === '/login' && user) {
    // ดึง role เพื่อ redirect ไปหน้าที่ถูกต้อง
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const destination = profile?.role === 'admin' ? '/admin/dashboard' : '/'
    return NextResponse.redirect(new URL(destination, request.url))
  }

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
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/cron).*)',
  ],
}