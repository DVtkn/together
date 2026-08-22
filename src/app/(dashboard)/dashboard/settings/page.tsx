import { headers } from 'next/headers'
import SettingsWidget from '@/components/features/settings-widget'
import type { City } from '@/lib/hooks'
import type { ProfileResponse } from '@/lib/hooks'

interface SettingsInitial {
  settingsRes: { settings?: Record<string, unknown>; couple: { id: string; status: string; partnerA: { name: string | null; id: string }; partnerB: { name: string | null; id: string }; relationshipStart: string | null } | null } | null
  citiesRes: { cities: City[] } | null
  profileRes: { user: ProfileResponse | null; couple?: { partnerName: string | null } | null } | null
  signals: Array<{ id: string; emoji: string; meaning: string; suggestedReply: string }>
  theme: 'aurora' | 'night'
}

async function apiFetch<T>(base: string, cookie: string, path: string): Promise<T | null> {
  const res = await fetch(`${base}${path}`, {
    headers: cookie ? { cookie } : {},
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json().catch(() => null) as T | null
}

export default async function SettingsPage() {
  const h = await headers()
  const proto = h.get('x-forwarded-proto') || 'http'
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000'
  const base = `${proto}://${host}`
  const cookie = h.get('cookie') || ''

  const [settingsRes, citiesRes, profileRes, signals, themeRes] = await Promise.all([
    apiFetch<SettingsInitial['settingsRes']>(base, cookie, '/api/user/settings'),
    apiFetch<{ cities: City[] }>(base, cookie, '/api/cities'),
    apiFetch<ProfileResponse>(base, cookie, '/api/user/profile'),
    apiFetch<{ signals: SettingsInitial['signals'] }>(base, cookie, '/api/signals'),
    apiFetch<{ theme: 'aurora' | 'night' }>(base, cookie, '/api/user/theme'),
  ])

  return (
    <SettingsWidget
      initial={{
        settingsRes: settingsRes && typeof settingsRes === 'object' ? settingsRes : null,
        citiesRes: citiesRes && typeof citiesRes === 'object' ? citiesRes : null,
        profileRes: profileRes && typeof profileRes === 'object' ? profileRes : null,
        signals: signals?.signals ?? [],
        theme: themeRes?.theme === 'night' ? 'night' : 'aurora',
      }}
    />
  )
}

export const dynamic = 'force-dynamic'