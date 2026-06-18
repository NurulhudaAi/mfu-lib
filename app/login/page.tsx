'use client'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/app-context'
import { BookOpen } from 'lucide-react'
import logoImg from '@/public/logo.jpg';

export default function LoginPage() {
  const supabase = createClient()
  const { t } = useApp()

  async function signInWithGoogle() {
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-950 via-gray-950 to-gray-900 px-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
             <img src={logoImg.src} alt="Muslim Club Logo" width={45} height={45} className='mx-auto mb-3 object-contain' />
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              {t('loginSubtitle')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('loginDesc')}
            </p>
          </div>

          {/* Google button */}
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-600 dark:hover:border-primary-700 hover:bg-green-50 dark:hover:bg-green-950/30 transition-all font-semibold text-gray-800 dark:text-gray-200 shadow-sm"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t('loginWithGoogle')}
          </button>
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-600 mt-6">
          © 2026 MFU Muslim Club Library
        </p>
      </div>
    </div>
  )
}
