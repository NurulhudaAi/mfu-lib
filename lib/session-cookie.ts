/**
 * Session-cookie helpers
 *
 * Supabase SSR forces `maxAge = 400 days` on every auth cookie it writes.
 * We strip `maxAge` / `expires` from non-empty cookies so the browser treats
 * them as *session cookies* → the user is signed out when the browser closes.
 *
 * Deletions (empty value / maxAge 0) are left untouched so sign-out still works.
 */

export type CookieOpts = Record<string, any> | undefined

export function toSessionCookieOptions(value: string, options: CookieOpts): CookieOpts {
  if (!options) return options
  const isDeletion = value === '' || options.maxAge === 0
  if (isDeletion) return options
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { maxAge, expires, ...rest } = options
  return rest
}

// ── Preference cookies (persistent, readable by SSR to avoid flashes) ──
export const PREF_COOKIE_LOCALE = 'mfu_locale'
export const PREF_COOKIE_THEME = 'mfu_theme'
const ONE_YEAR = 60 * 60 * 24 * 365

/** Client-side: write a persistent preference cookie */
export function setPrefCookie(name: string, value: string) {
  if (typeof document === 'undefined') return
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${secure}`
}

/** Client-side: parse document.cookie into a list */
export function readBrowserCookies(): { name: string; value: string }[] {
  if (typeof document === 'undefined' || !document.cookie) return []
  return document.cookie.split(';').map((part) => {
    const idx = part.indexOf('=')
    const name = part.slice(0, idx).trim()
    const raw = part.slice(idx + 1).trim()
    let value = raw
    try { value = decodeURIComponent(raw) } catch { /* keep raw */ }
    return { name, value }
  }).filter((c) => c.name)
}

/** Client-side: write a cookie honouring Supabase options (as a session cookie) */
export function writeBrowserCookie(name: string, value: string, options: CookieOpts) {
  if (typeof document === 'undefined') return
  const opts = toSessionCookieOptions(value, options) || {}
  let str = `${name}=${encodeURIComponent(value)}`
  str += `; Path=${opts.path || '/'}`
  if (opts.maxAge !== undefined) str += `; Max-Age=${opts.maxAge}`
  if (opts.domain) str += `; Domain=${opts.domain}`
  str += `; SameSite=${opts.sameSite ? String(opts.sameSite).replace(/^./, (c) => c.toUpperCase()) : 'Lax'}`
  if (opts.secure || location.protocol === 'https:') str += '; Secure'
  document.cookie = str
}
