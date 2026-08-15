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
      return NextResponse.json({ challenges: [] })
    }

    const challenges = await prisma.challenge.findMany({
      where: { coupleId: ctx.couple.id },
      include: { ChallengeCompletion: true },
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
    })

    const list = challenges.map((ch) => {
      const completedByCurrent = ch.ChallengeCompletion.some((c) => c.userId === ctx.user.id)
      const completedByPartner = ctx.partner
        ? ch.ChallengeCompletion.some((c) => c.userId === ctx.partner!.id)
        : false

      let status = ch.status
      if (status === 'PENDING' || status === 'ACTIVE') {
        if (completedByCurrent && completedByPartner) status = 'COMPLETED'
        else status = 'ACTIVE'
      }

      return {
        id: ch.id,
        weekNumber: ch.weekNumber,
        year: ch.year,
        title: ch.title,
        description: ch.description,
        instruction: ch.instruction,
        examplePhrase: ch.examplePhrase,
        axis: ch.axis,
        difficulty: ch.difficulty,
        durationMin: ch.durationMin,
        status,
        completedByCurrent,
        completedByPartner,
        createdAt: ch.createdAt.toISOString(),
        completedAt: ch.completedAt?.toISOString() ?? null,
      }
    })

    return NextResponse.json({ challenges: list })
  } catch (error) {
    console.error('Get challenges error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'