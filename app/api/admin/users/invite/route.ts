import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-guard'
import { inviteAdminSchema, validateInput } from '@/lib/validation'

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  // ── Validate input ──
  const body = await req.json()
  const parsed = validateInput(inviteAdminSchema, body)
  if (parsed.error) return parsed.error
  const { email } = parsed.data

  const supabase = createServiceClient()

  // Find user by email
  const { data: user, error: findError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .ilike('email', email)
    .maybeSingle()

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 })
  }

  if (!user) {
    return NextResponse.json(
      {
        error:
          'ไม่พบบัญชีผู้ใช้นี้ในระบบ กรุณาให้ผู้ใช้เข้าสู่ระบบด้วย Google อย่างน้อย 1 ครั้ง เพื่อสร้างโปรไฟล์ก่อนแต่งตั้งเป็นผู้ดูแล',
      },
      { status: 404 }
    )
  }

  if (user.role === 'admin') {
    return NextResponse.json(
      { error: `ผู้ใช้ ${user.email} มีบทบาทเป็นผู้ดูแลระบบ (Admin) อยู่แล้ว` },
      { status: 400 }
    )
  }

  // Update role to admin
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `แต่งตั้ง ${user.full_name || user.email} เป็นผู้ดูแลระบบสำเร็จแล้ว`,
    user: { ...user, role: 'admin' },
  })
}
