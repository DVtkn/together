import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, requireCouple, unauthorized } from '@/lib/api-auth'
import { notify } from '@/lib/notify'
import { z } from 'zod'

const messageSchema = z.object({
  content: z.string().min(1).max(2000).transform((s) => s.trim()),
})

export async function GET(request: NextRequest) {
  const rl = await rateLimit('default', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 229, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()
  const noCouple = requireCouple(ctx)
  if (noCouple) return noCouple

  const { searchParams } = new URL(request.url)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50))

  const messages = await prisma.coupleMessage.findMany({
    where: { coupleId: ctx.couple!.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { User: { select: { id: true, name: true, username: true } } },
  })

  const items = messages.reverse().map((m) => ({
    id: m.id,
    content: m.content,
    senderId: m.senderId,
    senderName: m.User.name ?? m.User.username ?? 'Партнёр',
    createdAt: m.createdAt.toISOString(),
    isSova: m.senderId === 'sova',
  }))

  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const rl = await rateLimit('default', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 229, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()
  const noCouple = requireCouple(ctx)
  if (noCouple) return noCouple

  const body = await request.json()
  const validation = messageSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 })
  }

  const content = validation.data.content
  const isSova = content.startsWith('[Сова]') || false

  const message = await prisma.coupleMessage.create({
    data: {
      id: `cm_${Math.random().toString(36).slice(2, 14)}`,
      coupleId: ctx.couple!.id,
      senderId: isSova ? 'sova' : ctx.user.id,
      content: isSova ? content.replace(/^\[Сова\]\s*/, '') : content,
    },
  })

  if (!isSova && ctx.partner) {
    await notify(ctx.partner.id, 'couple_message', 'В чате пары новое сообщение', '/dashboard/ai')
  }

  return NextResponse.json({
    item: {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      senderName: isSova ? 'Сова' : (ctx.user.name ?? ctx.user.username ?? 'Я'),
      createdAt: message.createdAt.toISOString(),
      isSova: message.senderId === 'sova',
    },
  }, { status: 201 })
}

export const dynamic = 'force-dynamic'