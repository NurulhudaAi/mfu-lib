import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import './globals.css'
import { AppProvider } from '@/lib/app-context'
import { Sarabun, Playfair_Display } from 'next/font/google'
import { PREF_COOKIE_LOCALE, PREF_COOKIE_THEME } from '@/lib/session-cookie'

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
  verification: {
    google: 'fa8rXDrs-lEyh0Lsb75XLZeoTcSfXPBPyk1qzWVsuW4',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0c' },
  ],
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // อ่านการตั้งค่าจาก cookie ฝั่ง server → ธีม/ภาษาถูกต้องตั้งแต่ render แรก (ไม่กระพริบ)
  const cookieStore = await cookies()
  const initialTheme = cookieStore.get(PREF_COOKIE_THEME)?.value === 'light' ? 'light' : 'dark'
  const initialLocale = cookieStore.get(PREF_COOKIE_LOCALE)?.value === 'en' ? 'en' : 'th'

  return (
    <html 
      lang={initialLocale} 
      className={`${initialTheme === 'dark' ? 'dark' : ''} ${sarabun.variable} ${playfair.variable}`} 
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
      <body 
        className="font-sans antialiased bg-white dark:bg-[#0a0a0c] text-neutral-900 dark:text-neutral-100 min-h-screen"
        suppressHydrationWarning
      >
        <AppProvider initialLocale={initialLocale} initialTheme={initialTheme}>
          <AppShell>
            {children}
          </AppShell>
        </AppProvider>
      </body>
    </html>
  )
}
