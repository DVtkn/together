'use client'

import useSWR from 'swr'

export interface ProfileUser {
  id?: string
  name: string | null
  email: string
  username?: string
  dateOfBirth?: string | null
  city?: { id: string; slug: string; name: string; emoji: string } | null
}

export interface CoupleData {
  id: string
  partnerA: { id: string; name: string | null }
  partnerB: { id: string; name: string | null }
  status: string
  relationshipStart: string | null
}

export interface ProfileResponse {
  user: ProfileUser | null
  couple?: { partnerName: string | null } | null
}

export interface City {
  id: string
  slug: string
  name: string
  emoji: string
}

export interface UserSettings {
  name?: string
  email?: string
  cityId?: string | null
  notifications?: boolean
  [key: string]: unknown
}

export function useProfile(fallbackData?: ProfileResponse) {
  return useSWR<ProfileResponse>('/api/user/profile', { fallbackData })
}

export function useSettings(fallbackData?: { settings?: Record<string, unknown>; couple: CoupleData | null }) {
  return useSWR<{ settings?: Record<string, unknown>; couple: CoupleData | null }>('/api/user/settings', { fallbackData })
}

export function useCities(fallbackData?: { cities: City[] }) {
  return useSWR<{ cities: City[] }>('/api/cities', { fallbackData })
}

export function useCouple() {
  const { data: settings } = useSettings()
  return settings?.couple ?? null
}