import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, requireCouple, unauthorized } from '@/lib/api-auth'
import { z } from 'zod'
import { notify, nameOf } from '@/lib/notify'

const memorySchema = z.object({
  caption: z.string().min(1).max(300).transform((s) => s.trim()),
  imageUrl: z.string().url().optional().or(z.literal('')),
  date: z.string().optional().nullable(),
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

  const memories = await prisma.memory.findMany({
    where: { coupleId: ctx.couple!.id },
    orderBy: { createdAt: 'desc' },
    take: 60,
    include: { User: { select: { id: true, name: true, username: true } } },
  })

  return NextResponse.json({
    items: memories.map((m) => ({
      id: m.id,
      caption: m.caption,
      imageUrl: m.imageUrl,
      date: m.date,
      authorId: m.userId,
      authorName: m.User.name ?? m.User.username ?? 'Партнёр',
      createdAt: m.createdAt.toISOString(),
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
  const validation = memorySchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: 'Напишите подпись' }, { status: 422 })
  }

  const memory = await prisma.memory.create({
    data: {
      id: `mem_${Math.random().toString(36).slice(2, 14)}`,
      coupleId: ctx.couple!.id,
      userId: ctx.user.id,
      caption: validation.data.caption,
      imageUrl: validation.data.imageUrl || null,
      date: validation.data.date || null,
    },
  })

  if (ctx.partner) {
    await notify(
      ctx.partner.id,
      'memory_added',
      `${nameOf(ctx.user)} добавил(а) воспоминание`,
      '/dashboard/date#memories'
    )
  }

  return NextResponse.json({
    item: {
      id: memory.id,
      caption: memory.caption,
      imageUrl: memory.imageUrl,
      date: memory.date,
      authorId: memory.userId,
      authorName: ctx.user.name ?? ctx.user.username ?? 'Я',
      createdAt: memory.createdAt.toISOString(),
    },
  }, { status: 201 })
}

export const dynamic = 'force-dynamic'