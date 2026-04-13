'use client'

import { useQuery } from '@tanstack/react-query'
import type { StrengthProfileSex } from '@/types/domain'
import { useSupabase } from './useSupabase'

type ProfilePreferences = {
  id: string
  preferred_unit: 'lbs' | 'kg'
  strength_profile_sex: StrengthProfileSex | null
  strength_profile_age_years: number | null
  strength_profile_bodyweight_lbs: number | null
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
        .select('id, preferred_unit, strength_profile_sex, strength_profile_age_years, strength_profile_bodyweight_lbs')
        .eq('id', user.id)
        .maybeSingle()

      if (error) throw error
      return data as ProfilePreferences | null
    },
    staleTime: 5 * 60 * 1000,
  })
}