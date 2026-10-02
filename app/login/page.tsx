'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/app-context'
import { BookOpen } from 'lucide-react'
import logoImg from '@/public/logo.jpg'
import Link from 'next/link'

export default function LoginPage() {
  const supabase = createClient()
  const { t, locale } = useApp()
  const [loading, setLoading] = useState(false)

  async function signInWithGoogle() {
    if (loading) return
    setLoading(true)

    // Clear any stale Supabase cookies to prevent PKCE mismatch
    document.cookie.split(";").forEach((c) => {
      if (c.trim().startsWith("sb-")) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      }
    });

    const searchParams = new URLSearchParams(window.location.search)
    const redirect = searchParams.get('redirect') || '/'

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-[#0a0a0c] px-4 transition-colors duration-300">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Card */}
        <div className="bg-white dark:bg-[#121214] rounded-3xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-8 sm:p-9 text-center">
          {/* Logo & Title */}
          <div className="w-16 h-16 rounded-2xl bg-white p-1.5 flex items-center justify-center mx-auto mb-5 shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <img src="/logo.jpg" alt="Muslim Club Logo" className="w-full h-full object-contain" />
          </div>

          <h1 className="font-bold text-2xl tracking-tight text-neutral-900 dark:text-white">
            {t('loginTitle')}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 mb-8">
            MFU Muslim Club Library
          </p>

          {/* Google button */}
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black rounded-2xl transition-all font-bold text-sm shadow-md ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin shrink-0"></span>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" className="shrink-0">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span>{loading ? t('loading') || 'Loading...' : t('loginWithGoogle')}</span>
          </button>

          <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800">
            <Link
              href="/"
              className="text-xs font-semibold text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors"
            >
              ← {locale === 'th' ? 'กลับหน้าหลัก' : 'Back to Home'}
            </Link>
          </div>
        </div>

        <p className="text-center text-[11px] text-neutral-400 dark:text-neutral-600 mt-6">
          © 2026 MFU Muslim Club Library
        </p>
      </div>
    </div>
  )
}
