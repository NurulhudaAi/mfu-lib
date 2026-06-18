'use client'
import { createClient } from '@/lib/supabase'
import { useEffect, useState, useMemo } from 'react'

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
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let mounted = true

    const initProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          if (mounted) setProfile(null)
          if (mounted) setLoading(false)
          return
        }

        // Call API with auth token
        const response = await fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (mounted) setProfile(data as Profile)
        } else {
          if (mounted) setProfile(null)
        }
      } catch (error) {
        if (mounted) setProfile(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
