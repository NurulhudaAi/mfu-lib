import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { readCoverSchema, validateInput } from '@/lib/validation'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  // ── Guard: เฉพาะ admin (เพราะใช้ Gemini API ที่มีค่าใช้จ่าย) ──
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  // ── Rate Limit: 10 ครั้ง/นาที per admin ──
  const rl = checkRateLimit(`read-cover:${auth.admin.id}`, { maxRequests: 10, windowSeconds: 60 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  try {
    // ── Validate input ──
    const body = await req.json()
    const parsed = validateInput(readCoverSchema, body)
    if (parsed.error) return parsed.error
    const { base64, mediaType } = parsed.data

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mediaType,
                  data: base64,
                },
              },
              {
                text: 'นี่คือรูปปกหนังสือ ตอบเฉพาะชื่อหนังสือเท่านั้น ไม่ต้องมีคำอธิบายเพิ่มเติม',
              },
            ],
          }],
        }),
      }
    )

    const data = await res.json()
    console.log('Gemini response:', JSON.stringify(data).slice(0, 500))
    const title = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
    console.log('title:', title)

    return NextResponse.json({ title })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ title: '', error: String(err) }, { status: 500 })
  }
}