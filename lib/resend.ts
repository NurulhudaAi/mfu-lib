// lib/resend.ts
import { Resend } from 'resend'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_123456789')

// ถ้ายังไม่มี custom domain → ใช้ onboarding@resend.dev (ส่งได้เฉพาะ email ที่ verify แล้ว)
// เมื่อมี domain แล้วเปลี่ยนเป็น: 'ห้องสมุดชมรมมุสลิม <library@yourdomain.com>'
const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ── shared HTML wrapper ──────────────────────────────────────────────────────
function wrap(content: string) {
  return `
    <!DOCTYPE html>
    <html lang="th">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',sans-serif;">
      <div style="max-width:520px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#14532d 0%,#166534 100%);padding:24px 32px;">
          <p style="margin:0;color:#86efac;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">MFU Muslim Club</p>
          <h1 style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:700;">ห้องสมุดชมรมมุสลิม</h1>
        </div>
        <!-- Body -->
        <div style="padding:28px 32px;">
          ${content}
        </div>
        <!-- Footer -->
        <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #f3f4f6;">
          <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;">
            อีเมลนี้ส่งอัตโนมัติ กรุณาอย่าตอบกลับ<br>
            MFU Muslim Club Library · Mae Fah Luang University
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

function btn(href: string, label: string, color = '#166534') {
  return `
    <a href="${href}"
      style="display:inline-block;margin-top:20px;padding:12px 28px;background:${color};color:#fff;font-weight:600;font-size:14px;border-radius:10px;text-decoration:none;">
      ${label}
    </a>
  `
}

function bookCard(title: string, author?: string) {
  return `
    <div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:8px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;font-size:16px;font-weight:700;color:#14532d;">${title}</p>
      ${author ? `<p style="margin:6px 0 0;font-size:13px;color:#6b7280;">โดย ${author}</p>` : ''}
    </div>
  `
}

// ════════════════════════════════════════════════════════════════════════════
// 1. ยืนยันการยืม (ส่งทันทีหลัง borrow สำเร็จ)
// ════════════════════════════════════════════════════════════════════════════
export async function sendBorrowConfirmEmail({
  to, name, bookTitle, bookAuthor, dueDate,
}: {
  to: string
  name: string
  bookTitle: string
  bookAuthor?: string
  dueDate: Date
}) {
  const dueDateStr = format(dueDate, 'EEEE dd MMMM yyyy', { locale: th })

  const html = wrap(`
    <p style="margin:0 0 4px;font-size:15px;color:#374151;">สวัสดีคุณ <strong>${name}</strong> 👋</p>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">คุณยืมหนังสือสำเร็จแล้ว</p>

    ${bookCard(bookTitle, bookAuthor)}

    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:4px;">
      <tr>
        <td style="padding:8px 0;color:#6b7280;width:120px;">📅 กำหนดคืน</td>
        <td style="padding:8px 0;font-weight:600;color:#14532d;">${dueDateStr}</td>
      </tr>
    </table>

    <div style="background:#fef3c7;border-radius:8px;padding:12px 16px;margin-top:16px;">
      <p style="margin:0;font-size:13px;color:#92400e;">
        ⚠️ กรุณาคืนหนังสือตามกำหนด หากคืนล่าช้าอาจถูกพิจารณาเพิ่มใน blacklist
      </p>
    </div>

    ${btn(`${APP_URL}/my-borrows`, '📋 ดูประวัติการยืม')}
  `)

  return resend.emails.send({
    from: FROM,
    to,
    subject: `✅ ยืนยันการยืม: ${bookTitle}`,
    html,
  })
}

// ════════════════════════════════════════════════════════════════════════════
// 2. แจ้งเตือน 1 วันก่อนครบกำหนด (Cron ส่งทุกวัน)
// ════════════════════════════════════════════════════════════════════════════
export async function sendReminderEmail({
  to, name, bookTitle, bookAuthor, dueDate,
}: {
  to: string
  name: string
  bookTitle: string
  bookAuthor?: string
  dueDate: Date
}) {
  const dueDateStr = format(dueDate, 'EEEE dd MMMM yyyy', { locale: th })

  const html = wrap(`
    <p style="margin:0 0 4px;font-size:15px;color:#374151;">สวัสดีคุณ <strong>${name}</strong></p>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">
      หนังสือของคุณจะ<strong style="color:#d97706;">ครบกำหนดคืนพรุ่งนี้</strong> 📅
    </p>

    <div style="background:#fffbeb;border-left:4px solid #d97706;border-radius:8px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;font-size:16px;font-weight:700;color:#92400e;">${bookTitle}</p>
      ${bookAuthor ? `<p style="margin:6px 0 0;font-size:13px;color:#6b7280;">โดย ${bookAuthor}</p>` : ''}
      <p style="margin:10px 0 0;font-size:13px;color:#d97706;font-weight:600;">⏰ กำหนดคืน: ${dueDateStr}</p>
    </div>

    <p style="font-size:14px;color:#374151;margin:0;">
      กรุณาคืนหนังสือให้ตรงเวลาโดยไปที่แอปแล้วกด "คืนหนังสือ" พร้อมแนบรูปหลักฐาน
    </p>

    ${btn(`${APP_URL}/my-borrows`, '📥 คืนหนังสือเลย', '#d97706')}
  `)

  return resend.emails.send({
    from: FROM,
    to,
    subject: `⏰ แจ้งเตือน: พรุ่งนี้ครบกำหนดคืน "${bookTitle}"`,
    html,
  })
}

// ════════════════════════════════════════════════════════════════════════════
// 3. แจ้งเตือนเกินกำหนด (Overdue — ส่ง Cron ทุกวัน)
// ════════════════════════════════════════════════════════════════════════════
export async function sendOverdueEmail({
  to, name, bookTitle, bookAuthor, dueDate, daysOverdue,
}: {
  to: string
  name: string
  bookTitle: string
  bookAuthor?: string
  dueDate: Date
  daysOverdue: number
}) {
  const dueDateStr = format(dueDate, 'dd MMMM yyyy', { locale: th })

  const html = wrap(`
    <p style="margin:0 0 4px;font-size:15px;color:#374151;">สวัสดีคุณ <strong>${name}</strong></p>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">
      หนังสือของคุณ<strong style="color:#dc2626;">เกินกำหนดคืนแล้ว ${daysOverdue} วัน</strong> กรุณาคืนโดยด่วน
    </p>

    <div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:8px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;font-size:16px;font-weight:700;color:#991b1b;">${bookTitle}</p>
      ${bookAuthor ? `<p style="margin:6px 0 0;font-size:13px;color:#6b7280;">โดย ${bookAuthor}</p>` : ''}
      <p style="margin:10px 0 0;font-size:13px;color:#dc2626;font-weight:600;">
        📅 ควรคืนตั้งแต่: ${dueDateStr} (เกิน ${daysOverdue} วัน)
      </p>
    </div>

    <div style="background:#fef2f2;border-radius:8px;padding:12px 16px;margin-top:4px;">
      <p style="margin:0;font-size:13px;color:#991b1b;">
        ⚠️ หากไม่คืนหนังสือ อาจถูกระงับสิทธิ์การยืมและเพิ่มใน blacklist
      </p>
    </div>

    ${btn(`${APP_URL}/my-borrows`, '📥 คืนหนังสือทันที', '#dc2626')}
  `)

  return resend.emails.send({
    from: FROM,
    to,
    subject: `🚨 เกินกำหนดคืน ${daysOverdue} วัน: "${bookTitle}"`,
    html,
  })
}

// ════════════════════════════════════════════════════════════════════════════
// 4. แจ้งเตือนคิวถึงแล้ว (ส่งทันทีหลังคืนหนังสือสำเร็จ)
// ════════════════════════════════════════════════════════════════════════════
export async function sendQueueNotifyEmail({
  to, name, bookTitle, bookAuthor, bookId,
}: {
  to: string
  name: string
  bookTitle: string
  bookAuthor?: string
  bookId: string
}) {
  const html = wrap(`
    <p style="margin:0 0 4px;font-size:15px;color:#374151;">สวัสดีคุณ <strong>${name}</strong> 🎉</p>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">
      หนังสือที่คุณจองคิวไว้<strong style="color:#16a34a;">พร้อมให้ยืมแล้ว!</strong>
    </p>

    ${bookCard(bookTitle, bookAuthor)}

    <div style="background:#f0fdf4;border-radius:8px;padding:12px 16px;margin-top:4px;">
      <p style="margin:0;font-size:13px;color:#166534;">
        ⏳ กรุณายืมภายใน <strong>24 ชั่วโมง</strong> มิฉะนั้นคิวจะส่งต่อให้คนถัดไป
      </p>
    </div>

    ${btn(`${APP_URL}/books/${bookId}`, '📚 ยืมหนังสือเลย')}
  `)

  return resend.emails.send({
    from: FROM,
    to,
    subject: `🎉 หนังสือที่คุณรอว่างแล้ว: "${bookTitle}"`,
    html,
  })
}

// ════════════════════════════════════════════════════════════════════════════
// 5. ยืนยันการคืน
// ════════════════════════════════════════════════════════════════════════════
export async function sendReturnConfirmEmail({
  to, name, bookTitle, returnedAt,
}: {
  to: string
  name: string
  bookTitle: string
  returnedAt: Date
}) {
  const returnedStr = format(returnedAt, 'dd MMMM yyyy HH:mm น.', { locale: th })

  const html = wrap(`
    <p style="margin:0 0 4px;font-size:15px;color:#374151;">สวัสดีคุณ <strong>${name}</strong></p>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">บันทึกการคืนหนังสือเรียบร้อยแล้ว ✅</p>

    ${bookCard(bookTitle)}

    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr>
        <td style="padding:8px 0;color:#6b7280;width:120px;">🕐 คืนเมื่อ</td>
        <td style="padding:8px 0;font-weight:600;color:#374151;">${returnedStr}</td>
      </tr>
    </table>

    <p style="font-size:14px;color:#6b7280;margin-top:16px;">
      ขอบคุณที่ใช้บริการห้องสมุดชมรมมุสลิม 🙏
    </p>

    ${btn(`${APP_URL}/books`, '📚 ดูหนังสือเพิ่มเติม')}
  `)

  return resend.emails.send({
    from: FROM,
    to,
    subject: `✅ คืนหนังสือสำเร็จ: "${bookTitle}"`,
    html,
  })
}
