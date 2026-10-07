// app/api/return/route.ts
import { createServiceClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { sendQueueNotifyEmail, sendReturnConfirmEmail } from '@/lib/resend'
import { returnSchema, validateInput } from '@/lib/validation'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const supabase = createServiceClient()

  // ── ดึง user จาก session ──
  const cookieStore = await cookies()
  const userSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 })
  }

  // ── Rate Limit: 5 ครั้ง/นาที ──
  const rl = checkRateLimit(`return:${user.id}`, { maxRequests: 5, windowSeconds: 60 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  // ── อ่าน FormData ──
  const formData = await request.formData()
  const borrowId   = formData.get('borrowId') as string
  const photo      = formData.get('photo') as File | null
  const returnDate = formData.get('returnDate') as string | null   // optional override
  const notes      = (formData.get('notes') as string | null) || null

  // ── Validate input ──
  const parsed = validateInput(returnSchema, { borrowId, returnDate, notes })
  if (parsed.error) return parsed.error

  if (!photo) {
    return NextResponse.json({ error: 'กรุณาแนบรูปหลักฐานการคืนหนังสือ' }, { status: 400 })
  }

  // ── Validate file type & size ──
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(photo.type)) {
    return NextResponse.json({ error: 'รองรับเฉพาะไฟล์ JPG, PNG, WebP' }, { status: 400 })
  }
  const maxSize = 10 * 1024 * 1024 // 10 MB
  if (photo.size > maxSize) {
    return NextResponse.json({ error: 'ไฟล์ใหญ่เกินไป (สูงสุด 10 MB)' }, { status: 400 })
  }

  // ── ตรวจสอบ borrow เป็นของ user คนนี้จริง ──
  const { data: borrow } = await supabase
    .from('borrows')
    .select('*, books(id, title, author, available_copies), profiles(email, full_name)')
    .eq('id', parsed.data.borrowId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!borrow) {
    return NextResponse.json({ error: 'ไม่พบรายการยืม หรือคืนไปแล้ว' }, { status: 404 })
  }

  const borrowProfile = borrow.profiles as unknown as { email: string; full_name: string | null }
  const borrowBook = borrow.books as unknown as { id: string; title: string; author: string | null; available_copies: number | null }

  // ── Upload รูปหลักฐาน ──
  const ext = photo.type === 'image/png' ? 'png' : 'jpg'
  const fileName = `${user.id}/${parsed.data.borrowId}-${Date.now()}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('return-proofs')
    .upload(fileName, photo, { contentType: photo.type, upsert: false })

  if (uploadError) {
    console.error('[Storage] upload error:', uploadError)
    return NextResponse.json({ error: 'อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 })
  }

  // ── Signed URL สำหรับแสดงผลในหน้า admin ──
  const { data: signedUrlData } = await supabase.storage
    .from('return-proofs')
    .createSignedUrl(fileName, 60 * 60 * 24 * 365)  // 1 ปี

  // ── อัปเดต borrow status ──
  const actualReturnDate = parsed.data.returnDate ? new Date(parsed.data.returnDate) : new Date()
  const isOverdue = actualReturnDate > new Date(borrow.due_date)

  await supabase
    .from('borrows')
    .update({
      status: isOverdue ? 'overdue' : 'returned',
      returned_at: actualReturnDate.toISOString(),
      return_proof_url: fileName,
      proof_signed_url: signedUrlData?.signedUrl ?? null,
      notes: parsed.data.notes?.trim() || null,
    })
    .eq('id', parsed.data.borrowId)

  // DB trigger `update_book_availability()` จัดการเพิ่ม available_copies อัตโนมัติเมื่อ status เปลี่ยนจาก active ไป returned/overdue

  // ── ส่ง email ยืนยันการคืน ──
  sendReturnConfirmEmail({
    to: borrowProfile.email,
    name: borrowProfile.full_name ?? 'สมาชิก',
    bookTitle: borrowBook.title,
    returnedAt: actualReturnDate,
  }).catch(err => console.error('[Email] sendReturnConfirmEmail failed:', err))

  // ── แจ้งเตือนคนที่ 1 ในคิว ──
  // ── เพิ่ม available_copies กลับ (ตอนนี้ใช้ DB Trigger update_book_availability จัดการแทนแล้ว) ──
  const { data: firstInQueue } = await supabase
    .from('queue')
    .select('id, profiles(email, full_name)')
    .eq('book_id', borrowBook.id)
    .eq('notified', false)           // ยังไม่เคยแจ้ง
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (firstInQueue) {
    const queueProfile = (Array.isArray(firstInQueue.profiles) ? firstInQueue.profiles[0] : firstInQueue.profiles) as { email?: string; full_name?: string } | null
    if (queueProfile) {
      // mark ว่าแจ้งแล้ว (ก่อนส่ง email เพื่อป้องกัน double-notify)
      await supabase
        .from('queue')
        .update({ notified: true, notified_at: new Date().toISOString() })
        .eq('id', firstInQueue.id)

      sendQueueNotifyEmail({
        to: queueProfile.email || (firstInQueue.profiles as any)?.email,
        name: queueProfile.full_name ?? 'สมาชิก',
        bookTitle: borrowBook.title,
        bookAuthor: borrowBook.author ?? undefined,
        bookId: borrowBook.id,
      }).catch(err => console.error('[Email] sendQueueNotifyEmail failed:', err))
    }
  }

  return NextResponse.json({ success: true })
}