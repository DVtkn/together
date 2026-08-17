import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, requireCouple, unauthorized } from '@/lib/api-auth'
import { z } from 'zod'
import { notify, nameOf } from '@/lib/notify'

const ritualSchema = z.object({
  title: z.string().min(2).max(80).transform((s) => s.trim()),
  emoji: z.string().min(1).max(4).default('🕊️'),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([0, 1, 2, 3, 4, 5, 6]),
})

const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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

  const today = todayKey()
  const rituals = await prisma.ritual.findMany({
    where: { coupleId: ctx.couple!.id, active: true },
    orderBy: { createdAt: 'asc' },
    include: {
      RitualCompletion: {
        where: { date: today },
        select: { userId: true, date: true },
      },
    },
  })

  const partnerId = ctx.couple!.partnerAId === ctx.user.id ? ctx.couple!.partnerBId : ctx.couple!.partnerAId

  return NextResponse.json({
    items: rituals.map((r) => ({
      id: r.id,
      title: r.title,
      emoji: r.emoji,
      daysOfWeek: r.daysOfWeek,
      mine: r.RitualCompletion.some((c) => c.userId === ctx.user.id),
      partner: r.RitualCompletion.some((c) => c.userId === partnerId),
      partnerDone: r.RitualCompletion.some((c) => c.userId === partnerId),
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
  const validation = ritualSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: 'Проверьте поля ритуала' }, { status: 400 })
  }

  const ritual = await prisma.ritual.create({
    data: {
      id: `rit_${Math.random().toString(36).slice(2, 14)}`,
      coupleId: ctx.couple!.id,
      title: validation.data.title,
      emoji: validation.data.emoji,
      daysOfWeek: validation.data.daysOfWeek,
    },
  })

  if (ctx.partner) {
    await notify(
      ctx.partner.id,
      'ritual_added',
      `${nameOf(ctx.user)} добавил(а) ритуал «${ritual.title}»`,
      '/dashboard/daily#rituals'
    )
  }

  return NextResponse.json({
    item: { id: ritual.id, title: ritual.title, emoji: ritual.emoji, daysOfWeek: ritual.daysOfWeek, mine: false, partner: false },
  }, { status: 201 })
}

export const dynamic = 'force-dynamic'