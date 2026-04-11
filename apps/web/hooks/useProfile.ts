'use client'

import { useQuery } from '@tanstack/react-query'
import { useSupabase } from './useSupabase'

type ProfilePreferences = {
  id: string
  preferred_unit: 'lbs' | 'kg'
}

export function useProfile() {
  const supabase = useSupabase()

  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) return null

      const { data, error } = await supabase
        .from('profiles')
        .select('id, preferred_unit')
        .eq('id', user.id)
        .maybeSingle()

      if (error) throw error
      return data as ProfilePreferences | null
    },
    staleTime: 5 * 60 * 1000,
  })
}