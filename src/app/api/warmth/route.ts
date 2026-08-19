import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, requireCouple, unauthorized } from '@/lib/api-auth'
import { notify, nameOf } from '@/lib/notify'
import { sendPushToUserFireAndForget } from '@/lib/push'
import { z } from 'zod'

const warmthSchema = z.object({
  text: z.string().min(2, 'Слишком коротко').max(500),
})

export async function GET(request: NextRequest) {
  const rl = await rateLimit('default', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
  }
  const ctx = await getApiContext()
  if (!ctx) return unauthorized()
  const noCouple = requireCouple(ctx)
  if (noCouple) return noCouple

  const { searchParams } = new URL(request.url)
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '5', 10) || 5))

  const entries = await prisma.warmthEntry.findMany({
    where: { coupleId: ctx.couple!.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { User: { select: { id: true, name: true, username: true } } },
  })

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      text: e.text,
      fromName: e.User.name ?? e.User.username ?? 'Партнёр',
      fromId: e.User.id,
      createdAt: e.createdAt.toISOString(),
    })),
  })
}

export async function POST(request: NextRequest) {
  const rl = await rateLimit('default', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
  }
  const ctx = await getApiContext()
  if (!ctx) return unauthorized()
  const noCouple = requireCouple(ctx)
  if (noCouple) return noCouple

  const body = await request.json()
  const validation = warmthSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues[0]?.message || 'Ошибка валидации' }, { status: 422 })
  }

  const entry = await prisma.warmthEntry.create({
    data: {
      id: `we_${Math.random().toString(36).slice(2, 14)}`,
      coupleId: ctx.couple!.id,
      fromUserId: ctx.user.id,
      text: validation.data.text,
    },
  })

  if (ctx.partner) {
    const text = `${nameOf(ctx.user)} сказал(а) тёплое слово: «${validation.data.text}»`
    await notify(ctx.partner.id, 'warmth_added', text, '/dashboard#partner')
    sendPushToUserFireAndForget(ctx.partner.id, {
      title: '💌 Тёплое слово',
      body: `${nameOf(ctx.user)}: «${validation.data.text}»`,
      url: '/dashboard#partner',
    })
  }

  return NextResponse.json({ ok: true, entry: { id: entry.id, text: entry.text } }, { status: 201 })
}

export const dynamic = 'force-dynamic'