import { headers } from 'next/headers'
import SettingsWidget from '@/components/features/settings-widget'

async function apiFetch(base: string, cookie: string, path: string): Promise<any> {
  const res = await fetch(`${base}${path}`, {
    headers: cookie ? { cookie } : {},
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json().catch(() => null)
}

export default async function SettingsPage() {
  const h = await headers()
  const proto = h.get('x-forwarded-proto') || 'http'
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000'
  const base = `${proto}://${host}`
  const cookie = h.get('cookie') || ''

  const [settingsRes, citiesRes, profileRes, signals, themeRes] = await Promise.all([
    apiFetch(base, cookie, '/api/user/settings'),
    apiFetch(base, cookie, '/api/cities'),
    apiFetch(base, cookie, '/api/user/profile'),
    apiFetch(base, cookie, '/api/signals'),
    apiFetch(base, cookie, '/api/user/theme'),
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