import { createServiceClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { rating, message, category } = await request.json()

  if (!message || !rating) {
    return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 })
  }

  if (message.length > 500) {
    return NextResponse.json({ error: 'ข้อความยาวเกินไป (สูงสุด 500 ตัวอักษร)' }, { status: 400 })
  }

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
