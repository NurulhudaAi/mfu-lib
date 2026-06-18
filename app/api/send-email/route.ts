import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { to, subject, html } = await req.json()

  // ตอน dev ส่งได้แค่อีเมลที่สมัคร Resend เท่านั้น
  const recipient = process.env.NODE_ENV === 'development' 
    ? process.env.RESEND_TEST_EMAIL  // อีเมลที่สมัคร Resend
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