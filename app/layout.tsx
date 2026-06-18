import type { Metadata } from 'next'
import './globals.css'
import { AppProvider } from '@/lib/app-context'
import { Sarabun, Playfair_Display } from 'next/font/google'

// นำเข้า Navbar และ BottomNav
// import Navbar from '@/components/Navbar' // ⚠️ ปรับตำแหน่ง Path ให้ตรงกับโฟลเดอร์จริงของคุณ
import BottomNav from '@/components/BottomNav' // ⚠️ ปรับตำแหน่ง Path ให้ตรงกับโฟลเดอร์จริงของคุณ

// ตั้งค่าคอนฟิกฟอนต์ Sarabun
const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sarabun',
  display: 'swap',
})

// ตั้งค่าคอนฟิกฟอนต์ Playfair Display
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MFU Muslim Library | ห้องสมุดชมรมมุสลิม มฟล',
  description: 'Book borrowing system for MFU Muslim Club | ระบบยืม-คืนหนังสือ ชมรมมุสลิม มฟล.',
  icons: { icon: '/logo.jpg' }, 
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html 
      lang="th" 
      className={`dark ${sarabun.variable} ${playfair.variable}`} 
      suppressHydrationWarning 
      data-scroll-behavior="smooth"
    >
      {/* เพิ่ม pb-24 เพื่อดันเนื้อหาท้ายเว็บขึ้นมา ไม่ให้บาร์ลอยด้านล่างบังเนื้อหา */}
      <body className="font-sans antialiased bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300 min-h-screen md:pb-6 pb-24">
        <AppProvider>
          {/* 1. Navbar บนสำหรับแสดงโลโก้ สลับภาษา ธีม และโปรไฟล์ */}
          {/* <Navbar /> */}

          {/* เนื้อหาหลักของแต่ละหน้าจอ */}
          <main>
            {children}
          </main>

          {/* 2. แท็บทางลัดลอยได้ด้านล่างสุดของหน้าจอ */}
          <BottomNav />
        </AppProvider>
      </body>
    </html>
  )
}
