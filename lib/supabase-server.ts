import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy-supabase-url.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-service-key'
  )
}

export async function createSessionClient() {
  const cookieStore = await cookies()  // ✅ เพิ่ม await
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy-supabase-url.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-anon-key',
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
}