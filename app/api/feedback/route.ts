import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { userId, rating, message, category } = await request.json()

  if (!message || !rating) {
    return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { error } = await supabase.from('feedback').insert({
    user_id: userId || null,
    rating,
    message,
    category,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
