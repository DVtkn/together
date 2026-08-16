import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, requireCouple, unauthorized } from '@/lib/api-auth'
import { z } from 'zod'
import { notify, nameOf } from '@/lib/notify'

const letterSchema = z.object({
  title: z.string().min(1).max(120).transform((s) => s.trim()),
  content: z.string().min(1).max(5000).transform((s) => s.trim()),
})

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
  const noCouple = requireCouple(ctx)
  if (noCouple) return noCouple

  const letters = await prisma.letter.findMany({
    where: { coupleId: ctx.couple!.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      Sender: { select: { id: true, name: true, username: true } },
    },
  })

  return NextResponse.json({
    items: letters.map((l) => ({
      id: l.id,
      title: l.title,
      content: l.content,
      fromUserId: l.fromUserId,
      fromName: l.Sender.name ?? l.Sender.username ?? 'Партнёр',
      isMine: l.fromUserId === ctx.user.id,
      read: Boolean(l.readAt),
      readAt: l.readAt?.toISOString() ?? null,
      createdAt: l.createdAt.toISOString(),
    })),
  })
}

export async function POST(request: NextRequest) {
  const rl = await rateLimit('default', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()
  const noCouple = requireCouple(ctx)
  if (noCouple) return noCouple

  const body = await request.json()
  const validation = letterSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: 'Напишите письмо' }, { status: 400 })
  }

  const letter = await prisma.letter.create({
    data: {
      id: `lt_${Math.random().toString(36).slice(2, 14)}`,
      coupleId: ctx.couple!.id,
      fromUserId: ctx.user.id,
      toUserId: ctx.partner!.id,
      title: validation.data.title,
      content: validation.data.content,
    },
  })

  if (ctx.partner) {
    await notify(
      ctx.partner.id,
      'letter_sent',
      `${nameOf(ctx.user)} написал(а) вам письмо 💌`,
      '/dashboard/letters'
    )
  }

  return NextResponse.json({
    item: {
      id: letter.id,
      title: letter.title,
      content: letter.content,
      fromUserId: letter.fromUserId,
      fromName: ctx.user.name ?? ctx.user.username ?? 'Я',
      isMine: true,
      read: false,
      readAt: null,
      createdAt: letter.createdAt.toISOString(),
    },
  }, { status: 201 })
}

export const dynamic = 'force-dynamic'