/**
 * Rate Limiter — ป้องกัน abuse/spam บน API routes
 *
 * ใช้ in-memory sliding window counter (เหมาะกับ single-instance / Vercel serverless)
 * สำหรับ production scale ใหญ่ ควรเปลี่ยนเป็น Redis (Upstash) แทน
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// ลบ entry ที่หมดอายุทุก 60 วินาที
const CLEANUP_INTERVAL = 60_000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}

interface RateLimitOptions {
  /** จำนวน request สูงสุดที่อนุญาตใน window */
  maxRequests: number
  /** ขนาด window เป็นวินาที */
  windowSeconds: number
}

interface RateLimitResult {
  /** ผ่านหรือไม่ */
  allowed: boolean
  /** จำนวน request ที่เหลือ */
  remaining: number
  /** เวลา reset (unix ms) */
  resetAt: number
}

/**
 * ตรวจสอบ rate limit สำหรับ key ที่กำหนด
 *
 * @param key — ใช้ IP หรือ userId เป็น key
 * @param options — maxRequests + windowSeconds
 * @returns RateLimitResult
 *
 * @example
 * ```ts
 * const result = checkRateLimit(`borrow:${user.id}`, { maxRequests: 5, windowSeconds: 60 })
 * if (!result.allowed) {
 *   return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 * }
 * ```
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  cleanup()

  const now = Date.now()
  const windowMs = options.windowSeconds * 1000
  const entry = store.get(key)

  // ถ้าไม่มี entry หรือ window หมดอายุแล้ว → สร้างใหม่
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: options.maxRequests - 1, resetAt }
  }

  // ยังอยู่ใน window → เพิ่ม count
  entry.count++
  if (entry.count > options.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return {
    allowed: true,
    remaining: options.maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * สร้าง NextResponse 429 พร้อม Retry-After header
 */
export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
  return new Response(
    JSON.stringify({ error: 'คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.max(retryAfter, 1)),
        'X-RateLimit-Reset': String(resetAt),
      },
    }
  )
}
