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
  startedAt: string | null
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

export function useProfile() {
  return useSWR<ProfileResponse>('/api/user/profile')
}

export function useSettings() {
  return useSWR<{ settings?: Record<string, unknown>; couple: CoupleData | null }>('/api/user/settings')
}

export function useCities() {
  return useSWR<{ cities: City[] }>('/api/cities')
}

export function useCouple() {
  const { data: settings } = useSettings()
  return settings?.couple ?? null
}