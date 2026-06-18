import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Create anon client to verify auth
    const anonSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user }, error: userError } = await anonSupabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Use service role to bypass RLS and get/create profile
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Try to get existing profile with service role (bypasses RLS)
    const { data: existingProfile, error: fetchError } = await serviceSupabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // If profile exists, return it
    if (existingProfile && !fetchError) {
      return NextResponse.json(existingProfile)
    }

    // If profile doesn't exist, create it
    const { data: newProfile, error: createError } = await serviceSupabase
      .from('profiles')
      .insert([{
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        avatar_url: user.user_metadata?.avatar_url || null,
        role: 'user',
        is_blacklisted: false,
        blacklist_reason: null,
      }])
      .select()
      .single()

    if (createError) {
      // If duplicate key error, try to fetch it again
      if (createError.code === '23505') {
        const { data: profile } = await serviceSupabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profile) {
          return NextResponse.json(profile)
        }
      }

      console.error('Error creating profile:', createError)
      return NextResponse.json({ error: 'Failed to create profile', details: createError }, { status: 500 })
    }

    return NextResponse.json(newProfile)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



