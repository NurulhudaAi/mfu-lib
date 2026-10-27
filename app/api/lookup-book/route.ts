import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  // ── Guard: เฉพาะ admin / super_admin ──
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  // ── Rate Limit: 20 ครั้ง/นาที per admin ──
  const rl = checkRateLimit(`lookup-book:${auth.admin.id}`, { maxRequests: 20, windowSeconds: 60 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  try {
    const { query, type = 'title' } = await req.json()
    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const trimmedQuery = query.trim()

    // ── 1. ลองค้นหาจาก Google Books API ก่อน (หากมี KEY หรือสามารถเรียกได้) ──
    const googleApiKey = process.env.GOOGLE_BOOKS_API_KEY
    const googleQuery = type === 'isbn'
      ? `isbn:${trimmedQuery.replace(/[-\s]/g, '')}`
      : `intitle:${encodeURIComponent(trimmedQuery)}`

    const googleUrl = googleApiKey
      ? `https://www.googleapis.com/books/v1/volumes?q=${googleQuery}&maxResults=1&key=${googleApiKey}`
      : `https://www.googleapis.com/books/v1/volumes?q=${googleQuery}&maxResults=1`

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3500)
      const gRes = await fetch(googleUrl, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (gRes.ok) {
        const gData = await gRes.json()
        if (gData.items && gData.items.length > 0) {
          return NextResponse.json({
            ...gData,
            source: 'Google Books',
          })
        }
      }
    } catch {
      // หาก Google Books ล่ม, ติด 429 quota, หรือ timeout -> ข้ามไปใช้ Gemini AI Fallback ทันที
    }

    // ── 2. Fallback: ใช้ Gemini AI ในการสืบค้นข้อมูลหนังสือ ──
    const geminiKey = process.env.GEMINI_API_KEY
    if (!geminiKey) {
      return NextResponse.json({
        items: [],
        message: 'ไม่พบข้อมูลหนังสือจาก Google Books และยังไม่ได้ตั้งค่า GEMINI_API_KEY',
      })
    }

    const prompt = `คุณคือบรรณารักษ์ผู้เชี่ยวชาญด้านหนังสือของห้องสมุด
กรุณาสืบค้นข้อมูลที่ถูกต้อง แม่นยำ และครบถ้วนที่สุดของหนังสือเล่มนี้:
ประเภทการค้นหา: ${type === 'isbn' ? 'เลข ISBN' : 'ชื่อหนังสือ'}
คำค้นหา: "${trimmedQuery}"

ตอบกลับเป็น JSON format เท่านั้น โดยมีโครงสร้างดังนี้:
{
  "title": "ชื่อหนังสือที่ถูกต้อง ชัดเจนที่สุด",
  "author": "ชื่อผู้แต่ง ผู้เขียน หรือผู้แปล",
  "publisher": "สำนักพิมพ์ (ถ้าทราบ หรือปล่อยว่างถ้าไม่ทราบ)",
  "published_year": "ปีที่พิมพ์เป็นตัวเลข 4 หลัก เช่น 2565 หรือ 2022 (ถ้าทราบ)",
  "isbn": "เลข ISBN 10 หรือ 13 หลัก (ถ้าทราบ)",
  "category": "หมวดหมู่ที่เหมาะสม เช่น ศาสนาและจิตวิญญาณ, ประวัติศาสตร์, วรรณกรรม, ภาษา, การศึกษา, พัฒนาตนเอง, ทั่วไป",
  "description": "เรื่องย่อสั้นๆ หรือคำอธิบายเนื้อหาของหนังสือเล่มนี้ประมาณ 2-3 ประโยค"
}
ตอบเฉพาะ JSON เท่านั้น ไม่ต้องมีคำเกริ่นนำหรือ markdown code block ใดๆ`

    const modelsToTry = ['gemini-3-flash-preview', 'gemini-flash-lite-latest', 'gemini-flash-latest']
    let candidateText = ''

    for (const model of modelsToTry) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: prompt }],
              }],
            }),
          }
        )

        if (res.ok) {
          const data = await res.json()
          candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
          if (candidateText) break
        }
      } catch {
        // try next model
      }
    }

    if (!candidateText) {
      return NextResponse.json({
        items: [],
        message: 'ไม่สามารถดึงข้อมูลหนังสือได้ในขณะนี้',
      })
    }

    // Clean JSON markdown
    let cleanJson = candidateText.trim()
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    const firstBrace = cleanJson.indexOf('{')
    const lastBrace = cleanJson.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanJson = cleanJson.substring(firstBrace, lastBrace + 1)
    }

    let parsedBook: any = null
    try {
      parsedBook = JSON.parse(cleanJson)
    } catch {
      return NextResponse.json({
        items: [],
        message: 'ไม่สามารถแปลงข้อมูลหนังสือได้',
      })
    }

    // แปลงรูปแบบให้เข้ากับ format ของ Google Books ที่ Frontend รอรับอยู่
    const isbnCleaned = parsedBook.isbn ? String(parsedBook.isbn).replace(/[-\s]/g, '') : ''
    const volumeInfo: any = {
      title: parsedBook.title || trimmedQuery,
      authors: parsedBook.author ? [parsedBook.author] : [],
      publisher: parsedBook.publisher || '',
      publishedDate: parsedBook.published_year ? String(parsedBook.published_year) : '',
      description: parsedBook.description || '',
      categories: parsedBook.category ? [parsedBook.category] : [],
      industryIdentifiers: isbnCleaned ? [
        {
          type: isbnCleaned.length === 13 ? 'ISBN_13' : 'ISBN_10',
          identifier: isbnCleaned,
        },
      ] : [],
      imageLinks: isbnCleaned ? {
        thumbnail: `https://covers.openlibrary.org/b/isbn/${isbnCleaned}-M.jpg?default=false`,
        large: `https://covers.openlibrary.org/b/isbn/${isbnCleaned}-L.jpg?default=false`,
      } : undefined,
    }

    return NextResponse.json({
      items: [
        {
          volumeInfo,
        },
      ],
      source: 'AI (Gemini)',
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

