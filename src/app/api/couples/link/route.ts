import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { linkRequestSchema } from '@/lib/utils/validation'
import { notify } from '@/lib/notify'

// POST /api/couples/link - создать запрос на создание пары (инвайт по логину)
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
    const username = String(body.username ?? body.targetUsername ?? '')
    const validation = linkRequestSchema.safeParse({ username })
    if (!validation.success) {
      return NextResponse.json({ error: 'Укажите логин партнёра' }, { status: 422 })
    }

    const targetUsername = validation.data.username.trim()
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

    const duplicate = await prisma.coupleLinkRequest.findFirst({
      where: {
        fromUserId: ctx.user.id,
        toUserId: target.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    })
    if (duplicate) {
      return NextResponse.json({ error: 'Запрос уже отправлен' }, { status: 400 })
    }

    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)
    const requestRecord = await prisma.coupleLinkRequest.create({
      data: {
        id: `lr_${Math.random().toString(36).slice(2, 14)}`,
        fromUserId: ctx.user.id,
        toUserId: target.id,
        status: 'PENDING',
        expiresAt,
        updatedAt: new Date(),
      },
    })

    await notify(
      target.id,
      'couple_requested',
      `@${ctx.user.username} приглашает вас стать парой`,
      '/dashboard/couple'
    )

    return NextResponse.json(
      { ok: true, request: { id: requestRecord.id, toUsername: targetUsername, expiresAt: expiresAt.toISOString() } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Link couple error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'