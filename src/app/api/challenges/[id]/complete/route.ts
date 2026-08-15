import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { id } = await params
    const challenge = await prisma.challenge.findUnique({ where: { id } })
    if (!challenge || challenge.coupleId !== ctx.couple?.id) {
      return NextResponse.json({ error: 'Челлендж не найден' }, { status: 404 })
    }

    await prisma.challengeCompletion.upsert({
      where: {
        challengeId_userId: {
          challengeId: id,
          userId: ctx.user.id,
        },
      },
      create: {
        id: `cc_${Math.random().toString(36).slice(2, 14)}`,
        challengeId: id,
        userId: ctx.user.id,
      },
      update: {},
    })

    const completions = await prisma.challengeCompletion.findMany({ where: { challengeId: id } })
    const partnerId = ctx.partner?.id ?? null
    const completedByPartner = partnerId ? completions.some((c) => c.userId === partnerId) : false
    const completedByCurrent = completions.some((c) => c.userId === ctx.user.id)

    if (completedByCurrent && completedByPartner && challenge.status !== 'COMPLETED') {
      await prisma.challenge.update({
        where: { id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })
    }

    return NextResponse.json({ ok: true, completedByCurrent, completedByPartner })
  } catch (error) {
    console.error('Complete challenge error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'