/**
 * Input Validation Schemas — ใช้ Zod สำหรับ validate + sanitize ทุก API input
 *
 * ป้องกัน:
 * - SQL injection (ผ่าน RLS + parameterized queries อยู่แล้ว แต่ validate เพิ่มเป็น defense-in-depth)
 * - XSS (trim + length limit)
 * - Invalid data types
 * - Unexpected fields
 */
import { z } from 'zod'

// ── UUID validator (ใช้บ่อยสำหรับ IDs) ──
const uuid = z.string().uuid('รหัสไม่ถูกต้อง')

// ── Sanitize string: trim + ลบ null bytes ──
const safeString = (maxLen: number) =>
  z
    .string()
    .transform((s) => s.replace(/\0/g, '').trim())
    .pipe(z.string().max(maxLen, `ข้อความยาวเกิน ${maxLen} ตัวอักษร`))

const optionalSafeString = (maxLen: number) =>
  z
    .string()
    .transform((s) => s.replace(/\0/g, '').trim())
    .pipe(z.string().max(maxLen, `ข้อความยาวเกิน ${maxLen} ตัวอักษร`))
    .optional()
    .nullable()

// ════════════════════════════════════════════════════════════
// User API Schemas
// ════════════════════════════════════════════════════════════

/** POST /api/borrow */
export const borrowSchema = z.object({
  bookId: uuid,
})

/** POST /api/queue */
export const queueSchema = z.object({
  bookId: uuid,
  action: z.enum(['join', 'leave'], {
    error: "action ต้องเป็น 'join' หรือ 'leave'",
  }),
})

/** POST /api/cancel-borrow */
export const cancelBorrowSchema = z.object({
  borrowId: uuid,
})

/** POST /api/feedback */
export const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5, 'คะแนนต้องอยู่ระหว่าง 1-5'),
  message: safeString(500),
  category: z.enum(['general', 'book_request', 'system', 'service']).default('general'),
})

/** POST /api/return (FormData — validate after parsing) */
export const returnSchema = z.object({
  borrowId: uuid,
  returnDate: z
    .string()
    .refine((s) => !s || !isNaN(Date.parse(s)), 'วันที่ไม่ถูกต้อง')
    .optional()
    .nullable(),
  notes: optionalSafeString(500),
})

// ════════════════════════════════════════════════════════════
// Admin API Schemas
// ════════════════════════════════════════════════════════════

/** POST /api/admin/announcements */
export const createAnnouncementSchema = z.object({
  title: safeString(200),
  title_en: optionalSafeString(200),
  body: safeString(2000),
  body_en: optionalSafeString(2000),
  type: z.enum(['info', 'warning', 'success']).default('info'),
  is_active: z.boolean().default(true),
})

/** PATCH /api/admin/announcements/[id] */
export const updateAnnouncementSchema = z.object({
  title: safeString(200).optional(),
  title_en: optionalSafeString(200),
  body: safeString(2000).optional(),
  body_en: optionalSafeString(2000),
  type: z.enum(['info', 'warning', 'success']).optional(),
  is_active: z.boolean().optional(),
})

/** POST /api/admin/users/invite */
export const inviteAdminSchema = z.object({
  email: z
    .string()
    .email('อีเมลไม่ถูกต้อง')
    .transform((s) => s.trim().toLowerCase()),
})

/** PATCH /api/admin/users/[userId] */
export const updateUserSchema = z.object({
  is_blacklisted: z.boolean().optional(),
  reason: optionalSafeString(500),
  blacklist_reason: optionalSafeString(500),
  role: z.enum(['user', 'admin']).optional(),
  full_name: optionalSafeString(100),
})

/** POST /api/admin/books (FormData fields) */
export const createBookFieldsSchema = z.object({
  title: safeString(300),
  author: optionalSafeString(200),
  isbn: optionalSafeString(20),
  description: optionalSafeString(5000),
  category: optionalSafeString(100),
  publisher: optionalSafeString(200),
  published_year: z.coerce.number().int().min(1000).max(2100).optional().nullable(),
  total_copies: z.coerce.number().int().min(1).max(9999).default(1),
  is_featured: z.preprocess((v) => v === 'true' || v === true, z.boolean().default(false)),
  is_active: z.preprocess((v) => v !== 'false' && v !== false, z.boolean().default(true)),
  cover_url: optionalSafeString(2000),
})

/** POST /api/send-email */
export const sendEmailSchema = z.object({
  to: z.string().email('อีเมลไม่ถูกต้อง'),
  subject: safeString(200),
  html: safeString(50000),
})

/** POST /api/read-cover */
export const readCoverSchema = z.object({
  base64: z.string().min(1, 'ไม่พบข้อมูลรูปภาพ').max(10_000_000, 'รูปภาพใหญ่เกินไป'),
  mediaType: z
    .enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
    .default('image/jpeg'),
})

// ════════════════════════════════════════════════════════════
// Helper: parse + return error response
// ════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'

/**
 * ใช้ validate input แล้ว return parsed data หรือ error response
 *
 * @example
 * ```ts
 * const parsed = validateInput(borrowSchema, body)
 * if (parsed.error) return parsed.error
 * const { bookId } = parsed.data
 * ```
 */
export function validateInput<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { data: z.infer<T>; error?: never } | { data?: never; error: NextResponse } {
  const result = schema.safeParse(data)
  if (!result.success) {
    const firstError = result.error.issues[0]
    return {
      error: NextResponse.json(
        {
          error: firstError?.message || 'ข้อมูลไม่ถูกต้อง',
          details: result.error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      ),
    }
  }
  return { data: result.data }
}
