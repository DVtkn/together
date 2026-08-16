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

  const { searchParams } = new URL(request.url)
  const daysParam = Number(searchParams.get('days') ?? '7')
  const days = Number.isInteger(daysParam) && daysParam >= 1 && daysParam <= 90 ? daysParam : 7
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - (days - 1))

  try {
    const where: { createdAt: { gte: Date }; userId?: { in: string[] } } = {
      createdAt: { gte: since },
    }

    const userIds = [ctx.user.id]
    if (ctx.partner) userIds.push(ctx.partner.id)
    where.userId = { in: userIds }

    const entries = await prisma.moodEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    const byUser = new Map<string, Array<{ emoji: string; text: string | null; createdAt: Date }>>()
    for (const e of entries) {
      const list = byUser.get(e.userId) ?? []
      list.push({ emoji: e.emoji, text: e.text, createdAt: e.createdAt })
      byUser.set(e.userId, list)
    }

    return NextResponse.json({
      days,
      history: {
        mine: byUser.get(ctx.user.id) ?? [],
        partner: ctx.partner ? (byUser.get(ctx.partner.id) ?? []) : [],
      },
    })
  } catch (error) {
    console.error('Get mood history error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
