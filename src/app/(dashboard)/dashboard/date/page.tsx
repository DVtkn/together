import { headers } from 'next/headers'
import DateWidget from '@/components/features/date-widget'
import type { ProfileResponse } from '@/lib/hooks'

interface Invite {
  id: string
  vibe: string | null
  vibeEmoji: string | null
  venueId: string | null
  venueName: string | null
  venueArea: string | null
  venueEmoji: string | null
  date: string | null
  time: string | null
  status: 'PENDING' | 'PROPOSED' | 'CONFIRMED' | 'DECLINED'
  createdBy: string
  createdAt: string
}

interface DateMemory {
  id: string
  venueName: string
  date: string
  photoUrl: string | null
  note: string | null
}

async function apiFetch<T>(base: string, cookie: string, path: string): Promise<T | null> {
  const res = await fetch(`${base}${path}`, {
    headers: cookie ? { cookie } : {},
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json().catch(() => null) as T | null
}

export default async function DatePage() {
  const h = await headers()
  const proto = h.get('x-forwarded-proto') || 'http'
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000'
  const base = `${proto}://${host}`
  const cookie = h.get('cookie') || ''

  const [profile, invites, events] = await Promise.all([
    apiFetch<ProfileResponse>(base, cookie, '/api/user/profile'),
    apiFetch<{ invites: Invite[] }>(base, cookie, '/api/date-invite'),
    apiFetch<{ memories: DateMemory[] }>(base, cookie, '/api/couple-events'),
  ])

  return (
    <DateWidget
      initial={{
        me: profile?.user ? { id: profile.user.id ?? '', name: profile.user.name } : null,
        partnerName: profile?.couple?.partnerName ?? 'партнёр',
        hasCouple: Boolean(profile?.couple?.partnerName),
        invites: invites?.invites ?? [],
        memories: events?.memories ?? [],
      }}
    />
  )
}

export const dynamic = 'force-dynamic'