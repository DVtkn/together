import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized, requireCouple } from '@/lib/api-auth'
import { runCoupleAnalysis, isCoupleReady } from '@/lib/ai/analysis'

export async function POST(request: NextRequest) {
  const rl = await rateLimit('ai', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()

  const coupleError = requireCouple(ctx)
  if (coupleError) return coupleError

  const ready = await isCoupleReady(ctx)
  if (!ready) {
    return NextResponse.json({ ok: false, ready: false })
  }

  try {
    const result = await runCoupleAnalysis(ctx)
    return NextResponse.json({
      ok: true,
      fromCache: result.fromCache,
      analysis: {
        summary: result.analysis.summary,
        strengths: result.analysis.strengths,
        weaknesses: result.analysis.weaknesses,
        growthPoints: result.analysis.growthPoints,
        perspectives: result.analysis.perspectives,
        breakupRisks: result.analysis.breakupRisks,
      },
      basedOn: result.keys,
    })
  } catch (error) {
    console.error('Couple analysis error:', error)
    return NextResponse.json({ error: 'Не удалось сформировать анализ. Попробуйте ещё раз.' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'