import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { linkRequestSchema } from '@/lib/utils/validation'

// POST /api/couples/link - привязать партнёра по логину (создаёт пару сразу, если оба без пары)
export async function POST(request: NextRequest) {
  const rl = await rateLimit('couples', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()

  if (ctx.couple) {
    return NextResponse.json({ error: 'Вы уже в паре' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const validation = linkRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Укажите логин партнёра' }, { status: 400 })
    }

    const targetUsername = validation.data.targetUsername.trim()
    if (targetUsername === ctx.user.username) {
      return NextResponse.json({ error: 'Нельзя привязать самого себя' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({ where: { username: targetUsername } })
    if (!target) {
      return NextResponse.json({ error: 'Пользователь с таким логином не найден' }, { status: 404 })
    }
    if (target.coupleId) {
      return NextResponse.json({ error: 'Этот пользователь уже в паре' }, { status: 400 })
    }

    const couple = await prisma.couple.create({
      data: {
        id: `cp_${Math.random().toString(36).slice(2, 14)}`,
        partnerAId: ctx.user.id,
        partnerBId: target.id,
        status: 'ACTIVE',
        startedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    await prisma.user.updateMany({
      where: { id: { in: [ctx.user.id, target.id] } },
      data: { coupleId: couple.id },
    })

    return NextResponse.json({ ok: true, couple: { id: couple.id, status: couple.status } })
  } catch (error) {
    console.error('Link couple error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'