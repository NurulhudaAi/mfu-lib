import { createBrowserClient } from '@supabase/ssr'
import { readBrowserCookies, writeBrowserCookie } from './session-cookie'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy-supabase-url.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-anon-key',
    {
      // Auth cookies are stored as browser-session cookies (cleared when the browser closes)
      cookies: {
        getAll() {
          return readBrowserCookies()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => writeBrowserCookie(name, value, options))
        },
      },
    }
  )
}
