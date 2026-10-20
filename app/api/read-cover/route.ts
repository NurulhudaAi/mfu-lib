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

    const prompt = `นี่คือรูปถ่ายปกหนังสือ (หรือปกหลัง/หน้าข้อมูลลิขสิทธิ์) 
กรุณาอ่านและวิเคราะห์ข้อมูลทั้งหมดที่ปรากฏบนปก และใช้ฐานข้อมูลค้นหาข้อมูลที่ถูกต้องของหนังสือเล่มนี้อย่างแม่นยำ
ตอบกลับเป็น JSON format เท่านั้น โดยมีโครงสร้างดังนี้:
{
  "title": "ชื่อหนังสือที่ถูกต้อง ชัดเจนที่สุด (ตัดคำโปรโมตหรือคำชมออก)",
  "author": "ชื่อผู้แต่ง ผู้เขียน หรือผู้แปล (ถ้ามี)",
  "publisher": "สำนักพิมพ์ (ถ้ามี หรือที่ตีพิมพ์หนังสือเล่มนี้)",
  "published_year": "ปีที่พิมพ์เป็นตัวเลข 4 หลัก เช่น 2565 หรือ 2022 (ถ้าทราบ)",
  "isbn": "เลข ISBN 10 หรือ 13 หลัก (ถ้ามีปรากฏบนปกหรือในข้อมูล)",
  "category": "หมวดหมู่ที่เหมาะสม เช่น ศาสนาและจิตวิญญาณ, ประวัติศาสตร์, วรรณกรรม, ภาษา, การศึกษา, พัฒนาตนเอง, ทั่วไป",
  "description": "เรื่องย่อสั้นๆ หรือคำอธิบายเนื้อหาของหนังสือเล่มนี้ประมาณ 2-3 ประโยค"
}
ตอบเฉพาะ JSON เท่านั้น ไม่ต้องมีข้อความเกริ่นนำหรือ markdown formatting`

    // Try primary model (gemini-3-flash-preview) then fallback to gemini-flash-lite-latest or gemini-flash-latest
    const modelsToTry = ['gemini-3-flash-preview', 'gemini-flash-lite-latest', 'gemini-flash-latest']
    let candidateText = ''
    let lastError: any = null

    for (const model of modelsToTry) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
                    text: prompt,
                  },
                ],
              }],
              generationConfig: {
                response_mime_type: 'application/json',
                temperature: 0.1,
              },
            }),
          }
        )

        const data = await res.json()
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          candidateText = data.candidates[0].content.parts[0].text.trim()
          break
        } else if (data.error) {
          lastError = data.error
          console.warn(`Model ${model} failed:`, data.error.message)
        }
      } catch (err) {
        lastError = err
        console.warn(`Error calling ${model}:`, err)
      }
    }

    if (!candidateText) {
      throw new Error(lastError?.message || 'ไม่สามารถวิเคราะห์ข้อมูลจากภาพปกได้')
    }

    // Clean JSON response (strip any accidental markdown code fences)
    const cleanedText = candidateText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
    let parsedJson: any = {}
    try {
      parsedJson = JSON.parse(cleanedText)
    } catch {
      // Fallback: extract title with regex if JSON parsing fails
      const titleMatch = cleanedText.match(/"title"\s*:\s*"([^"]+)"/)
      parsedJson = {
        title: titleMatch ? titleMatch[1] : cleanedText.slice(0, 100),
      }
    }

    return NextResponse.json({
      success: true,
      title: parsedJson.title || '',
      author: parsedJson.author || '',
      publisher: parsedJson.publisher || '',
      published_year: parsedJson.published_year || '',
      isbn: parsedJson.isbn || '',
      category: parsedJson.category || '',
      description: parsedJson.description || '',
    })
  } catch (err: any) {
    console.error('read-cover error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการอ่านหน้าปก' },
      { status: 500 }
    )
  }
}