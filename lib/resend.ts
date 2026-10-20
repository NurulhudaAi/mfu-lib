import { Resend } from 'resend'
import nodemailer from 'nodemailer'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_123456789')

// ตรวจสอบว่ามีการตั้งค่า SMTP (เช่น Gmail App Password) หรือไม่
// หากมี: ส่งผ่าน Nodemailer ได้ทุกอีเมลโดยไม่มีข้อจำกัด Sandbox
const smtpTransport =
  process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        service: process.env.SMTP_SERVICE || 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : null

// ถ้ายังไม่มี custom domain → ใช้ onboarding@resend.dev (ส่งได้เฉพาะ email ที่ verify แล้ว)
// เมื่อมี domain แล้วเปลี่ยนเป็น: 'ห้องสมุดชมรมมุสลิม <library@yourdomain.com>'
const FROM = process.env.SMTP_FROM || process.env.RESEND_FROM_EMAIL || (process.env.SMTP_USER ? `"ห้องสมุดชมรมมุสลิม" <${process.env.SMTP_USER}>` : 'onboarding@resend.dev')
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
        <div style="background:#09090b;padding:24px 32px;">
          <p style="margin:0;color:#a1a1aa;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">MFU Muslim Club</p>
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

function btn(href: string, label: string, color = '#09090b') {
  return `
    <a href="${href}"
      style="display:inline-block;margin-top:20px;padding:12px 28px;background:${color};color:#fff;font-weight:600;font-size:14px;border-radius:10px;text-decoration:none;">
      ${label}
    </a>
  `
}

function bookCard(title: string, author?: string) {
  return `
    <div style="background:#fafafa;border-left:3px solid #09090b;border-radius:8px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;font-size:16px;font-weight:700;color:#09090b;">${title}</p>
      ${author ? `<p style="margin:6px 0 0;font-size:13px;color:#6b7280;">โดย ${author}</p>` : ''}
    </div>
  `
}

/**
 * ส่งอีเมลอย่างปลอดภัย รองรับโหมดทดสอบก่อนขึ้น Production (เมื่อยังไม่ได้ Verify Domain)
 * หาก Resend ปฏิเสธเนื่องจากผู้รับไม่ใช่ที่อยู่อีเมลที่ลงทะเบียนไว้ ระบบจะส่งต่อเข้า RESEND_TEST_EMAIL
 * พร้อมแนบแบนเนอร์แจ้งเตือน เพื่อให้ผู้พัฒนายังคงทดสอบโฟลว์การรับอีเมลได้ 100%
 */
async function safeSendEmail(params: {
  from: string
  to: string
  subject: string
  html: string
}) {
  try {
    if (smtpTransport) {
      const info = await smtpTransport.sendMail({
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      })
      return { data: { id: info.messageId }, error: null, wasRedirectedToTestEmail: false, originalTo: params.to }
    }

    const primary = await resend.emails.send(params)
    if (!primary.error) {
      return { data: primary.data, error: null, wasRedirectedToTestEmail: false, originalTo: params.to }
    }

    const errMsg = primary.error.message || ''
    const isDomainRestriction =
      errMsg.includes('only send testing emails to your own email address') ||
      errMsg.includes('validation_error') ||
      primary.error.name === 'validation_error'

    if (isDomainRestriction) {
      const testEmail = process.env.RESEND_TEST_EMAIL || '6631501067@lamduan.mfu.ac.th'
      console.warn(`[Resend Sandbox] Recipient ${params.to} is unverified. Forwarding to test email: ${testEmail}`)

      const testBanner = `
        <div style="background:#fffbeb;border:1px solid #f59e0b;border-radius:10px;padding:14px 18px;margin-bottom:20px;font-size:13px;color:#92400e;line-height:1.6;">
          <strong style="color:#b45309;">[Sandbox Mode] Pre-production Test</strong><br>
          อีเมลนี้ตั้งใจส่งถึง: <strong style="color:#09090b;">${esc(params.to)}</strong><br>
          <span style="font-size:12px;color:#78350f;">(เนื่องจากยังไม่ได้ผูก Custom Domain ใน Resend ระบบจึงส่งเข้ากล่องจดหมายทดสอบของคุณ เพื่อให้กดทดสอบยืนยันได้จริง)</span>
        </div>
      `
      const modifiedHtml = params.html.replace('<!-- Body -->\n        <div style="padding:28px 32px;">', `<!-- Body -->\n        <div style="padding:28px 32px;">\n${testBanner}`)

      const fallback = await resend.emails.send({
        from: params.from,
        to: testEmail,
        subject: `[ส่งถึง: ${params.to}] ${params.subject}`,
        html: modifiedHtml,
      })

      if (fallback.error) {
        return { data: null, error: fallback.error, wasRedirectedToTestEmail: false, originalTo: params.to }
      }

      return {
        data: fallback.data,
        error: null,
        wasRedirectedToTestEmail: true,
        originalTo: params.to,
        testEmail,
      }
    }

    return { data: null, error: primary.error, wasRedirectedToTestEmail: false, originalTo: params.to }
  } catch (err: any) {
    return { data: null, error: err, wasRedirectedToTestEmail: false, originalTo: params.to }
  }
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
    <p style="margin:0 0 4px;font-size:15px;color:#374151;">Assalamu'alaikum คุณ <strong>${name}</strong> </p>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">คุณยืมหนังสือสำเร็จแล้ว</p>

    ${bookCard(bookTitle, bookAuthor)}

    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:4px;">
      <tr>
        <td style="padding:8px 0;color:#6b7280;width:120px;">กำหนดคืน</td>
        <td style="padding:8px 0;font-weight:600;color:#09090b;">${dueDateStr}</td>
      </tr>
    </table>

    <div style="background:#fef3c7;border-radius:8px;padding:12px 16px;margin-top:16px;">
      <p style="margin:0;font-size:13px;color:#92400e;">
        กรุณาคืนหนังสือตามกำหนด หากคืนล่าช้าอาจถูกพิจารณาเพิ่มใน blacklist
      </p>
    </div>

    ${btn(`${APP_URL}/my-borrows`, 'ดูประวัติการยืม')}
  `)

  return safeSendEmail({
    from: FROM,
    to,
    subject: `ยืนยันการยืม: ${bookTitle}`,
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
    <p style="margin:0 0 4px;font-size:15px;color:#374151;">Assalamu'alaikum คุณ <strong>${name}</strong></p>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">
      หนังสือของคุณจะ<strong style="color:#d97706;">ครบกำหนดคืนพรุ่งนี้</strong>     </p>

    <div style="background:#fffbeb;border-left:4px solid #06afd9ff;border-radius:8px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;font-size:16px;font-weight:700;color:#92400e;">${bookTitle}</p>
      ${bookAuthor ? `<p style="margin:6px 0 0;font-size:13px;color:#6b7280;">โดย ${bookAuthor}</p>` : ''}
      <p style="margin:10px 0 0;font-size:13px;color:#d97706;font-weight:600;">กำหนดคืน: ${dueDateStr}</p>
    </div>

    <p style="font-size:14px;color:#374151;margin:0;">
      กรุณาคืนหนังสือให้ตรงเวลาโดยไปที่แอปแล้วกด "คืนหนังสือ" พร้อมแนบรูปหลักฐาน
    </p>

    ${btn(`${APP_URL}/my-borrows`, 'คืนหนังสือเลย', '#0626d9ff')}
  `)

  return safeSendEmail({
    from: FROM,
    to,
    subject: `แจ้งเตือน: พรุ่งนี้ครบกำหนดคืน "${bookTitle}"`,
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
    <p style="margin:0 0 4px;font-size:15px;color:#374151;">Assalamu'alaikum คุณ <strong>${name}</strong></p>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">
      หนังสือของคุณ<strong style="color:#dc2626;">เกินกำหนดคืนแล้ว ${daysOverdue} วัน</strong> กรุณาคืนโดยด่วน
    </p>

    <div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:8px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;font-size:16px;font-weight:700;color:#991b1b;">${bookTitle}</p>
      ${bookAuthor ? `<p style="margin:6px 0 0;font-size:13px;color:#6b7280;">โดย ${bookAuthor}</p>` : ''}
      <p style="margin:10px 0 0;font-size:13px;color:#dc2626;font-weight:600;">
        ควรคืนตั้งแต่: ${dueDateStr} (เกิน ${daysOverdue} วัน)
      </p>
    </div>

    <div style="background:#fef2f2;border-radius:8px;padding:12px 16px;margin-top:4px;">
      <p style="margin:0;font-size:13px;color:#991b1b;">
        หากไม่คืนหนังสือ อาจถูกระงับสิทธิ์การยืมและเพิ่มใน blacklist
      </p>
    </div>

    ${btn(`${APP_URL}/my-borrows`, 'คืนหนังสือทันที', '#dc2626')}
  `)

  return safeSendEmail({
    from: FROM,
    to,
    subject: `เกินกำหนดคืน ${daysOverdue} วัน: "${bookTitle}"`,
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
    <p style="margin:0 0 4px;font-size:15px;color:#374151;">Assalamu'alaikum คุณ <strong>${name}</strong> </p>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">
      หนังสือที่คุณจองคิวไว้<strong style="color:#16a34a;">พร้อมให้ยืมแล้ว!</strong>
    </p>

    ${bookCard(bookTitle, bookAuthor)}

    <div style="background:#f0fdf4;border-radius:8px;padding:12px 16px;margin-top:4px;">
      <p style="margin:0;font-size:13px;color:#166534;">
        กรุณายืมภายใน <strong>24 ชั่วโมง</strong> มิฉะนั้นคิวจะส่งต่อให้คนถัดไป
      </p>
    </div>

    ${btn(`${APP_URL}/books/${bookId}`, 'ยืมหนังสือเลย')}
  `)

  return safeSendEmail({
    from: FROM,
    to,
    subject: `หนังสือที่คุณรอว่างแล้ว: "${bookTitle}"`,
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
    <p style="margin:0 0 4px;font-size:15px;color:#374151;">Assalamu'alaikum คุณ <strong>${name}</strong></p>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">บันทึกการคืนหนังสือเรียบร้อยแล้ว </p>

    ${bookCard(bookTitle)}

    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr>
        <td style="padding:8px 0;color:#6b7280;width:120px;">คืนเมื่อ</td>
        <td style="padding:8px 0;font-weight:600;color:#374151;">${returnedStr}</td>
      </tr>
    </table>

    <p style="font-size:14px;color:#6b7280;margin-top:16px;">
      ขอบคุณที่ใช้บริการห้องสมุดชมรมมุสลิม     </p>

    ${btn(`${APP_URL}/books`, 'ดูหนังสือเพิ่มเติม')}
  `)

  return safeSendEmail({
    from: FROM,
    to,
    subject: `คืนหนังสือสำเร็จ: "${bookTitle}"`,
    html,
  })
}

// ── escape ข้อความจากผู้ใช้ก่อนแทรกลง HTML ──
function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

// ════════════════════════════════════════════════════════════════════════════
// 6. เชิญเป็นผู้ดูแลระบบ (ต้องกดยืนยันจากลิงก์)
// ════════════════════════════════════════════════════════════════════════════
export async function sendAdminInviteEmail({
  to, inviterName, replacingName, link, expiresAt,
}: {
  to: string
  inviterName: string
  replacingName?: string | null
  link: string
  expiresAt: Date
}) {
  const expiresStr = format(expiresAt, 'dd MMMM yyyy HH:mm น.', { locale: th })

  const html = wrap(`
    <p style="margin:0 0 4px;font-size:15px;color:#374151;">Assalamu'alaikum คุณ <strong>${name}</strong></p>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">
      <strong style="color:#09090b;">${esc(inviterName)}</strong> เชิญคุณเป็น<strong style="color:#09090b;">ผู้ดูแลระบบ (Admin)</strong> ของห้องสมุดชมรมมุสลิม
    </p>

    <div style="background:#fafafa;border-left:3px solid #09090b;border-radius:8px;padding:16px 20px;margin:20px 0;font-size:13px;color:#374151;line-height:1.7;">
      ระบบมีผู้ดูแลได้สูงสุด 2 คน
      ${replacingName ? `<br>คุณจะเข้าแทนที่ <strong>${esc(replacingName)}</strong> (ต้องได้รับการยืนยันจากผู้ดูแลเดิมด้วย)` : ''}
      <br>กรุณาเข้าสู่ระบบด้วย Google ด้วยอีเมล <strong>${esc(to)}</strong> เพื่อยืนยัน
    </div>

    ${btn(link, 'ยอมรับคำเชิญ')}

    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">ลิงก์หมดอายุ ${expiresStr} · หากคุณไม่ได้คาดหวังอีเมลนี้ สามารถเพิกเฉยได้</p>
  `)

  return safeSendEmail({
    from: FROM,
    to,
    subject: 'คำเชิญเป็นผู้ดูแลระบบ — ห้องสมุดชมรมมุสลิม',
    html,
  })
}

// ════════════════════════════════════════════════════════════════════════════
// 7. ยืนยันการสละสิทธิ์ผู้ดูแล (ส่งให้แอดมินเดิมเมื่อถูกแทนที่)
// ════════════════════════════════════════════════════════════════════════════
export async function sendAdminResignEmail({
  to, name, newAdminEmail, inviterName, link, expiresAt,
}: {
  to: string
  name: string
  newAdminEmail: string
  inviterName: string
  link: string
  expiresAt: Date
}) {
  const expiresStr = format(expiresAt, 'dd MMMM yyyy HH:mm น.', { locale: th })

  const html = wrap(`
    <p style="margin:0 0 4px;font-size:15px;color:#374151;">Assalamu'alaikum คุณ <strong>${esc(name)}</strong></p>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">
      <strong style="color:#09090b;">${esc(inviterName)}</strong> ขอให้คุณส่งมอบสิทธิ์ผู้ดูแลระบบให้กับ
      <strong style="color:#09090b;">${esc(newAdminEmail)}</strong>
    </p>

    <div style="background:#fafafa;border-left:3px solid #09090b;border-radius:8px;padding:16px 20px;margin:20px 0;font-size:13px;color:#374151;line-height:1.7;">
      เมื่อคุณยืนยัน และผู้ดูแลคนใหม่ยอมรับคำเชิญแล้ว
      <br>บัญชีของคุณจะกลับเป็น<strong>สมาชิกทั่วไป</strong>โดยอัตโนมัติ
    </div>

    ${btn(link, 'ยืนยันการสละสิทธิ์')}

    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">ลิงก์หมดอายุ ${expiresStr} · หากไม่ยืนยัน คุณจะยังคงเป็นผู้ดูแลต่อไป</p>
  `)

  return safeSendEmail({
    from: FROM,
    to,
    subject: 'ยืนยันการส่งมอบสิทธิ์ผู้ดูแลระบบ — ห้องสมุดชมรมมุสลิม',
    html,
  })
}

// ════════════════════════════════════════════════════════════════════════════
// 8. แจ้งผลการส่งมอบสิทธิ์ผู้ดูแลระบบสำเร็จ (ส่งให้ทั้งคนใหม่และคนเดิม)
// ════════════════════════════════════════════════════════════════════════════
export async function sendAdminTransferSuccessEmail({
  to,
  name,
  roleType,
  newAdminEmail,
}: {
  to: string
  name: string
  roleType: 'new_admin' | 'resigned_admin'
  newAdminEmail?: string
}) {
  const isNewAdmin = roleType === 'new_admin'

  const html = wrap(`
    <p style="margin:0 0 4px;font-size:15px;color:#374151;">Assalamu'alaikum คุณ <strong>${esc(name)}</strong></p>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">
      ${
        isNewAdmin
          ? 'ยินดีต้อนรับ! คุณได้รับการแต่งตั้งเป็น<strong style="color:#09090b;">ผู้ดูแลระบบ (Admin)</strong> ของห้องสมุดชมรมมุสลิมเรียบร้อยแล้ว'
          : `การส่งมอบสิทธิ์ผู้ดูแลระบบให้กับ <strong style="color:#09090b;">${esc(newAdminEmail || '')}</strong> เสร็จสมบูรณ์แล้ว`
      }
    </p>

    <div style="background:#fafafa;border-left:3px solid #09090b;border-radius:8px;padding:16px 20px;margin:20px 0;font-size:13px;color:#374151;line-height:1.7;">
      ${
        isNewAdmin
          ? 'คุณสามารถเข้าถึงหน้าแดชบอร์ด จัดการหนังสือ จัดการการยืม-คืน ประกาศข่าวสาร และจัดการผู้ดูแลระบบได้ทันที'
          : 'บัญชีของคุณได้เปลี่ยนกลับเป็น<strong>สมาชิกทั่วไป</strong>เรียบร้อยแล้ว ขอขอบคุณสำหรับการปฏิบัติหน้าที่ผู้ดูแลระบบที่ผ่านมา'
      }
    </div>

    ${btn(isNewAdmin ? `${APP_URL}/admin/dashboard` : APP_URL, isNewAdmin ? 'เข้าสู่แดชบอร์ดผู้ดูแล' : 'ไปยังหน้าหลัก')}
  `)

  return safeSendEmail({
    from: FROM,
    to,
    subject: isNewAdmin
      ? 'คุณได้รับสิทธิ์ผู้ดูแลระบบเรียบร้อยแล้ว — ห้องสมุดชมรมมุสลิม'
      : 'การส่งมอบสิทธิ์ผู้ดูแลระบบเสร็จสมบูรณ์ — ห้องสมุดชมรมมุสลิม',
    html,
  })
}

