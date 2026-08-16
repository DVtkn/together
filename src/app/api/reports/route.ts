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

  try {
    if (!ctx.couple) {
      return NextResponse.json({ report: null })
    }

    const report = await prisma.coupleReport.findFirst({
      where: { coupleId: ctx.couple.id },
      orderBy: { generatedAt: 'desc' },
    })

    if (!report) {
      return NextResponse.json({ report: null })
    }

    return NextResponse.json({
      report: {
        radarData: report.radarData as Record<string, number>,
        riskMarkers: (report.riskMarkers as { count: number; topics: string[] }) || { count: 0, topics: [] },
        strongSides: (report.strongSides as Array<{ title: string; description: string; evidence: string }>) || [],
        growthAreas: (report.growthAreas as Array<{ title: string; description: string; risk: string; action: string }>) || [],
        recommendations: (report.recommendations as Array<{ title: string; description: string; axis: string; difficulty: number; durationMin: number }>) || [],
        constellationState: report.constellationState as { distance: number; sync: number; colorHue: number; intensity: number },
        generatedAt: report.generatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Get reports error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'