'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useApp } from '@/lib/app-context'
import Link from 'next/link'
import Script from 'next/script'

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '309780930434-920f7tjlrdd3hq6q1g4mea6jairfs6pm.apps.googleusercontent.com'

declare global {
  interface Window {
    google?: any
  }
}

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, locale, theme } = useApp()

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [gisLoaded, setGisLoaded] = useState(false)
  const googleBtnRef = useRef<HTMLDivElement>(null)

  const redirectPath = searchParams.get('redirect') || '/'

  // Clean stale Supabase session cookies if present
  function cleanStaleCookies() {
    document.cookie.split(';').forEach((c) => {
      if (c.trim().startsWith('sb-')) {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
      }
    })
  }

  // Handle JWT ID token returned directly from Google Identity Services
  async function handleCredentialResponse(response: any) {
    if (!response?.credential) return
    setLoading(true)
    setErrorMessage(null)

    try {
      cleanStaleCookies()

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      })

      if (error) {
        throw error
      }

      if (data?.session) {
        router.push(redirectPath)
        router.refresh()
      } else {
        throw new Error('Authentication failed: no session created')
      }
    } catch (err: any) {
      console.error('Direct Google Sign-in error:', err)
      setErrorMessage(err.message || 'Login failed. Please try again.')
      setLoading(false)
    }
  }

  // Initialize Google Identity Services
  function initGoogleIdentity() {
    if (typeof window === 'undefined' || !window.google?.accounts?.id) return

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      })

      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: 320,
        })
      }

      // Display One Tap prompt on page load
      window.google.accounts.id.prompt()
      setGisLoaded(true)
    } catch (err) {
      console.error('Failed to initialize Google Identity Services:', err)
    }
  }

  useEffect(() => {
    if (window.google?.accounts?.id) {
      initGoogleIdentity()
    }
  }, [theme])

  // Fallback OAuth sign-in if GIS is not rendered yet
  async function handleFallbackOAuth() {
    if (loading) return

    // Try Google prompt if script is loaded
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt()
      return
    }

    setLoading(true)
    setErrorMessage(null)
    cleanStaleCookies()

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`,
      },
    })
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initGoogleIdentity}
      />

      <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-[#0a0a0c] px-4">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Card */}
          <div className="bg-white dark:bg-[#121214] rounded-3xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-8 sm:p-9 text-center">
            {/* Logo & Title */}
            <div className="w-16 h-16 rounded-2xl bg-white p-1.5 flex items-center justify-center mx-auto mb-5 shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <img
                src="/logo.jpg"
                alt="Muslim Club Logo"
                className="w-full h-full object-contain"
              />
            </div>

            <h1 className="font-bold text-2xl tracking-tight text-neutral-900 dark:text-white">
              {t('loginTitle')}
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 mb-8">
              MFU Muslim Club Library
            </p>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs text-left">
                {errorMessage}
              </div>
            )}

            {/* Google Direct Sign-In Container */}
            <div className="min-h-[46px] flex flex-col items-center justify-center">
              {/* Native Google One Tap / Button Container */}
              <div
                ref={googleBtnRef}
                className={`w-full flex justify-center ${gisLoaded ? 'block' : 'hidden'}`}
              />

              {/* Fallback Custom Button if GIS is loading */}
              {!gisLoaded && (
                <button
                  type="button"
                  onClick={handleFallbackOAuth}
                  disabled={loading}
                  className={`w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black rounded-2xl transition-all font-bold text-sm shadow-md ${
                    loading ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin shrink-0"></span>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      className="shrink-0"
                    >
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  <span>
                    {loading
                      ? t('loading') || 'Loading...'
                      : t('loginWithGoogle')}
                  </span>
                </button>
              )}
            </div>

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
    </>
  )
}
