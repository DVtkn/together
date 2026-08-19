import { headers } from 'next/headers'
import DailyWidget from '@/components/features/daily-widget'

async function apiFetch(base: string, cookie: string, path: string): Promise<any> {
  const res = await fetch(`${base}${path}`, {
    headers: cookie ? { cookie } : {},
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json().catch(() => null)
}

export default async function DailyPage() {
  const h = await headers()
  const proto = h.get('x-forwarded-proto') || 'http'
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000'
  const base = `${proto}://${host}`
  const cookie = h.get('cookie') || ''

  const [m, p, d, pul, ch, wm, rt] = await Promise.all([
    apiFetch(base, cookie, '/api/mood'),
    apiFetch(base, cookie, '/api/user/profile'),
    apiFetch(base, cookie, '/api/dashboard'),
    apiFetch(base, cookie, '/api/pulse'),
    apiFetch(base, cookie, '/api/challenges'),
    apiFetch(base, cookie, '/api/warmth?limit=3'),
    apiFetch(base, cookie, '/api/rituals'),
  ])

  return (
    <DailyWidget
      initial={{
        name: d?.user?.name?.split(' ')[0] ?? '',
        partnerName: p?.couple?.partnerName ?? 'Партнёр',
        myMood: m?.mine ?? null,
        partnerMood: m?.partner ?? null,
        pulse: pul,
        challenges: ch?.challenges ?? [],
        warmth: wm?.entries ?? [],
        rituals: rt?.items ?? [],
      }}
    />
  )
}

export const dynamic = 'force-dynamic'