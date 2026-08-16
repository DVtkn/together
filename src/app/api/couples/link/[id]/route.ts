import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { linkAnswerSchema } from '@/lib/utils/validation'

// PATCH /api/couples/link/[id] - принять или отклонить входящий запрос
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit('couples', request.headers.get('x-forwarded-for') || 'anon')
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
    const body = await request.json()
    const validation = linkAnswerSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Укажите accept: true или false' }, { status: 400 })
    }

    const requestRecord = await prisma.coupleLinkRequest.findUnique({
      where: { id },
      include: {
        User_CoupleLinkRequest_fromUserIdToUser: { select: { id: true } },
      },
    })

    if (!requestRecord || requestRecord.toUserId !== ctx.user.id) {
      return NextResponse.json({ error: 'Запрос не найден' }, { status: 404 })
    }
    if (requestRecord.status !== 'PENDING') {
      return NextResponse.json({ error: 'Запрос уже обработан' }, { status: 400 })
    }
    if (requestRecord.expiresAt <= new Date()) {
      await prisma.coupleLinkRequest.update({ where: { id }, data: { status: 'EXPIRED', updatedAt: new Date() } })
      return NextResponse.json({ error: 'Запрос истёк' }, { status: 400 })
    }
    if (ctx.couple) {
      return NextResponse.json({ error: 'Вы уже в паре' }, { status: 400 })
    }

    const { accept } = validation.data

    if (accept) {
      const fromUser = await prisma.user.findUnique({ where: { id: requestRecord.fromUserId } })
      if (!fromUser) {
        return NextResponse.json({ error: 'Отправитель не найден' }, { status: 404 })
      }
      if (fromUser.coupleId) {
        await prisma.coupleLinkRequest.update({ where: { id }, data: { status: 'REJECTED', updatedAt: new Date() } })
        return NextResponse.json({ error: 'Отправитель уже в паре' }, { status: 400 })
      }

      const couple = await prisma.couple.create({
        data: {
          id: `cp_${Math.random().toString(36).slice(2, 14)}`,
          partnerAId: requestRecord.fromUserId,
          partnerBId: ctx.user.id,
          status: 'ACTIVE',
          startedAt: new Date(),
          updatedAt: new Date(),
        },
      })

      await prisma.user.updateMany({
        where: { id: { in: [requestRecord.fromUserId, ctx.user.id] } },
        data: { coupleId: couple.id },
      })

      await prisma.coupleLinkRequest.update({ where: { id }, data: { status: 'ACCEPTED', updatedAt: new Date() } })

      return NextResponse.json({ ok: true, couple: { id: couple.id, status: couple.status } })
    }

    await prisma.coupleLinkRequest.update({ where: { id }, data: { status: 'REJECTED', updatedAt: new Date() } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Answer link request error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

// DELETE /api/couples/link/[id] - отменить исходящий запрос
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit('couples', request.headers.get('x-forwarded-for') || 'anon')
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
    const requestRecord = await prisma.coupleLinkRequest.findUnique({ where: { id } })

    if (!requestRecord || requestRecord.fromUserId !== ctx.user.id) {
      return NextResponse.json({ error: 'Запрос не найден' }, { status: 404 })
    }
    if (requestRecord.status !== 'PENDING') {
      return NextResponse.json({ error: 'Запрос уже обработан' }, { status: 400 })
    }

    await prisma.coupleLinkRequest.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Cancel link request error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'