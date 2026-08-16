import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { buildProgressiveReport } from '@/lib/report/progressive'

export async function GET(request: NextRequest) {
  const rl = await rateLimit('default', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()

  try {
    const report = await buildProgressiveReport(ctx)

    if (!ctx.couple || !ctx.partner) {
      return NextResponse.json({
        report: null,
        completedBoth: report.completedBoth,
        total: report.total,
      })
    }

    return NextResponse.json({
      report,
      completedBoth: report.completedBoth,
      total: report.total,
    })
  } catch (error) {
    console.error('Get progressive report error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'