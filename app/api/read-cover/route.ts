import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { base64, mediaType } = await req.json()

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
                  mime_type: mediaType || 'image/jpeg',
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