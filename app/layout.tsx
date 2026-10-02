import type { Metadata } from 'next'
import './globals.css'
import { AppProvider } from '@/lib/app-context'
import { Sarabun, Playfair_Display } from 'next/font/google'

// นำเข้า Navbar และ BottomNav
import AppShell from '@/components/AppShell'

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link 
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@100;200;300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="font-sans antialiased bg-white dark:bg-[#0a0a0c] text-neutral-900 dark:text-neutral-100 transition-colors duration-300 min-h-screen">
        <AppProvider>
          <AppShell>
            {children}
          </AppShell>
        </AppProvider>
      </body>
    </html>
  )
}
