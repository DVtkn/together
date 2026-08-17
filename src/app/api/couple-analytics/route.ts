import { NextResponse } from 'next/server'
import { getApiContext, requireCouple, unauthorized } from '@/lib/api-auth'
import { buildAnalytics } from '@/lib/report/analytics'

export async function GET() {
  const ctx = await getApiContext()
  if (!ctx) return unauthorized()
  const noCouple = requireCouple(ctx)
  if (noCouple) return noCouple

  const analytics = await buildAnalytics(ctx)
  return NextResponse.json(analytics)
}

export const dynamic = 'force-dynamic'