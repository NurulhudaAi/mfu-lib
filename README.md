# 📚 MFU Muslim Club Library — ระบบยืม-คืนหนังสือ

ระบบยืม-คืนหนังสือออนไลน์สำหรับชมรมมุสลิม มหาวิทยาลัยแม่ฟ้าหลวง

---

## ✨ ฟีเจอร์

| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| 🔑 Google OAuth | Login ด้วยบัญชี Google |
| 📖 หนังสือใหม่ | แสดง New Arrivals บนหน้าแรก |
| 📢 ประกาศ | Swipe announcement slider |
| 🌏 2 ภาษา | ไทย / English สลับได้ |
| 🌙 Dark/Light Mode | เปลี่ยน theme ได้ |
| 📅 เลือกวันคืน | User ระบุวันคืนหนังสือได้ |
| 📸 รูปหลักฐาน | อัปโหลดรูปเมื่อคืนหนังสือ |
| 📋 ประวัติการยืม | ดู borrow/return history พร้อมรูป |
| ❌ ยกเลิกการยืม | Cancel borrow ก่อนคืน |
| 🔔 จองคิว | Queue ต่อเมื่อหนังสือถูกยืมอยู่ |
| ❌ ยกเลิกจอง | Cancel queue ได้ |
| 💬 Feedback | Tab ส่งความคิดเห็นพร้อมดาว |
| 👨‍💼 Admin Panel | จัดการหนังสือ, ดูการยืม, ประกาศ |

---

## 🚀 วิธีติดตั้ง

### 1. Clone และติดตั้ง

```bash
git clone <your-repo>
cd muslim-library
npm install
```

### 2. สร้าง Supabase Project

1. ไปที่ https://supabase.com → New Project
2. ไปที่ **SQL Editor** → วาง SQL จากไฟล์ `database-schema.sql` → Run

### 3. ตั้งค่า Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com) → Create OAuth credentials
2. Redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
3. ใส่ Client ID และ Secret ใน Supabase → Authentication → Providers → Google

### 4. สร้าง Storage Buckets ใน Supabase

- **book-covers** (Public: ✅)
- **return-proofs** (Public: ❌)

### 5. ตั้งค่า Environment Variables

```bash
cp .env.local.example .env.local
```

แก้ไขค่าใน `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BORROW_DAYS=14
```

### 6. รัน Dev Server

```bash
npm run dev
```

เปิด http://localhost:3000 🎉

### 7. ตั้ง Admin คนแรก

หลัง login ครั้งแรก รัน SQL ใน Supabase:
```sql
update profiles set role = 'admin' where email = 'your.email@gmail.com';
```

---

## 📁 โครงสร้างโปรเจกต์

```
muslim-library/
├── app/
│   ├── page.tsx              # หน้าแรก (hero + new arrivals)
│   ├── login/page.tsx        # หน้า Login
│   ├── books/page.tsx        # หนังสือทั้งหมด
│   ├── books/[id]/page.tsx   # รายละเอียดหนังสือ
│   ├── my-borrows/page.tsx   # การยืมของฉัน
│   ├── return/[id]/page.tsx  # คืนหนังสือ
│   ├── feedback/page.tsx     # Feedback
│   ├── admin/
│   │   ├── dashboard/        # Admin dashboard
│   │   ├── books/            # จัดการหนังสือ
│   │   ├── borrows/          # ดูการยืมทั้งหมด
│   │   ├── announcements/    # จัดการประกาศ
│   │   └── feedback/         # ดู feedback
│   └── api/
│       ├── borrow/           # POST ยืมหนังสือ
│       ├── return/           # POST คืนหนังสือ
│       ├── queue/            # POST join/leave queue
│       ├── cancel-borrow/    # POST ยกเลิกการยืม
│       ├── feedback/         # POST ส่ง feedback
│       └── admin/books/      # CRUD หนังสือ (admin)
├── components/               # Reusable components
├── lib/                      # Utilities & context
├── database-schema.sql       # SQL สำหรับ Supabase
└── .env.local.example        # Template env vars
```

---

## 🌐 Deploy บน Vercel

```bash
npm install -g vercel
vercel
```

ใส่ Environment Variables ใน Vercel Dashboard → Settings → Environment Variables

---

## 🛠 Tech Stack

- **Next.js 14** (App Router)
- **Supabase** (PostgreSQL + Auth + Storage)
- **Tailwind CSS**
- **TypeScript**
- **date-fns**
- **lucide-react**

---

## 📝 หมายเหตุ

- ยืมได้คนละ 1 เล่มต่อครั้ง
- ระยะเวลายืมเริ่มต้น 14 วัน (ปรับได้ใน `.env.local`)
- ต้องอัปโหลดรูปหลักฐานเมื่อคืนหนังสือ
- ผู้ใช้ที่ถูก blacklist ไม่สามารถยืมหรือจองได้
