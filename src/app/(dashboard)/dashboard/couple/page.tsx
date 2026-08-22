import { headers } from 'next/headers'
import CoupleWidget from '@/components/features/couple-widget'

interface Status {
  couple: null | { id: string; status: string; partnerName: string | null; relationshipStart: string | null }
  outgoing: null | { id: string; toUsername: string }
  incoming: null | { id: string; fromUsername: string }
  assessments: Array<{ key: string; title: string; emoji: string; me: boolean; partner: boolean; both: boolean }>
  report: null | {
    compatibility: number | null
    completedBoth: number
    total: number
    openedAxes: number
    axes: Array<{ key: string; name: string; value: number | null }>
  }
  synastry: null | { score: number; hasBirthDates: boolean }
}

interface AnalyticsData {
  compatibility: number | null
  dimensions: Array<{ key: string; title: string; emoji: string; me: number; partner: number; align: number; level: number; score: number }>
  strengths: Array<{ key: string; title: string; emoji: string; score: number; text: string }>
  weaknesses: Array<{ key: string; title: string; emoji: string; score: number; text: string; reason: string }>
  risks: Array<{ key: string; title: string; emoji: string; risk: string; prevention: string }>
  perspectives: string
  partnerPending: boolean
}

async function apiFetch<T>(base: string, cookie: string, path: string): Promise<T | null> {
  const res = await fetch(`${base}${path}`, {
    headers: cookie ? { cookie } : {},
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json().catch(() => null) as T | null
}

export default async function CouplePage() {
  const h = await headers()
  const proto = h.get('x-forwarded-proto') || 'http'
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000'
  const base = `${proto}://${host}`
  const cookie = h.get('cookie') || ''

  const [status, analytics] = await Promise.all([
    apiFetch<Status>(base, cookie, '/api/couples/status'),
    apiFetch<AnalyticsData>(base, cookie, '/api/couple-analytics'),
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