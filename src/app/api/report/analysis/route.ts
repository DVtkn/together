import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'

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

  if (!ctx.couple) {
    return NextResponse.json({ analysis: null })
  }

  const analysis = await prisma.coupleAnalysis.findFirst({
    where: { coupleId: ctx.couple.id },
    orderBy: { createdAt: 'desc' },
  })

  if (!analysis) {
    return NextResponse.json({ analysis: null })
  }

  return NextResponse.json({
    analysis: {
      id: analysis.id,
      summary: analysis.summary,
      strengths: (analysis.strengths as Array<{ title: string; text: string }>) || [],
      weaknesses: (analysis.weaknesses as Array<{ title: string; text: string }>) || [],
      growthPoints: (analysis.growthPoints as Array<{ title: string; text: string; action: string }>) || [],
      perspectives: analysis.perspectives,
      breakupRisks: (analysis.breakupRisks as Array<{ risk: string; cause: string; prevention: string }>) || [],
      basedOn: analysis.basedOn,
      createdAt: analysis.createdAt.toISOString(),
    },
  })
}

export const dynamic = 'force-dynamic'