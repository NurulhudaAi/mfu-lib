import { createServiceClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { feedbackSchema, validateInput } from '@/lib/validation'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { getClientIP } from '@/lib/security'

export async function POST(request: Request) {
  // ── Rate Limit: 3 ครั้ง/นาที per IP (feedback ส่งไม่บ่อย) ──
  const ip = getClientIP(request)
  const rl = checkRateLimit(`feedback:${ip}`, { maxRequests: 3, windowSeconds: 60 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  // ── Validate input ──
  const body = await request.json()
  const parsed = validateInput(feedbackSchema, body)
  if (parsed.error) return parsed.error
  const { rating, message, category } = parsed.data

  const cookieStore = await cookies()
  const userSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await userSupabase.auth.getUser()

  const supabase = createServiceClient()

  const { error } = await supabase.from('feedback').insert({
    user_id: user?.id || null,
    rating,
    message,
    category,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
