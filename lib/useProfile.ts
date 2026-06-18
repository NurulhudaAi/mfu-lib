'use client'
import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: 'user' | 'admin'
  is_blacklisted: boolean
  blacklist_reason: string | null
  created_at: string
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    const initProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          console.log('No authenticated session')
          if (mounted) setProfile(null)
          if (mounted) setLoading(false)
          return
        }

        console.log('Fetching profile for user:', session.user.id)

        // Call API with auth token
        const response = await fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          console.log('Profile loaded/created:', data)
          if (mounted) setProfile(data as Profile)
        } else {
          console.error('Failed to fetch profile:', response.status, await response.text())
          if (mounted) setProfile(null)
        }
      } catch (error) {
        console.error('Error in initProfile:', error)
        if (mounted) setProfile(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        initProfile()
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setProfile(null)
          setLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  return { profile, loading, isAdmin: profile?.role === 'admin' }
}
