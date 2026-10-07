import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireAdmin } from '@/lib/admin-guard'
import { sendEmailSchema, validateInput } from '@/lib/validation'

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_123456789')

export async function POST(req: NextRequest) {
  // ── Guard: เฉพาะ admin เท่านั้นที่ส่ง email ผ่าน API นี้ได้ ──
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  // ── Validate input ──
  const body = await req.json()
  const parsed = validateInput(sendEmailSchema, body)
  if (parsed.error) return parsed.error
  const { to, subject, html } = parsed.data

  // ตอน dev ส่งได้แค่อีเมลที่สมัคร Resend เท่านั้น
  const recipient = process.env.NODE_ENV === 'development' 
    ? (process.env.RESEND_TEST_EMAIL || to)  // อีเมลที่สมัคร Resend
    : to

  try {
    await resend.emails.send({
      from: 'Muslim Club Library <onboarding@resend.dev>',
      to: recipient,
      subject,
      html,
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Email error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}