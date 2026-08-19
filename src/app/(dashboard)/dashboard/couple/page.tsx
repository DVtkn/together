import { headers } from 'next/headers'
import CoupleWidget from '@/components/features/couple-widget'

async function apiFetch(base: string, cookie: string, path: string): Promise<any> {
  const res = await fetch(`${base}${path}`, {
    headers: cookie ? { cookie } : {},
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json().catch(() => null)
}

export default async function CouplePage() {
  const h = await headers()
  const proto = h.get('x-forwarded-proto') || 'http'
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000'
  const base = `${proto}://${host}`
  const cookie = h.get('cookie') || ''

  const [status, analytics] = await Promise.all([
    apiFetch(base, cookie, '/api/couples/status'),
    apiFetch(base, cookie, '/api/couple-analytics'),
  ])

  return (
    <CoupleWidget
      initial={{
        status,
        analytics: analytics && Array.isArray(analytics.dimensions) ? analytics : null,
      }}
    />
  )
}

export const dynamic = 'force-dynamic'