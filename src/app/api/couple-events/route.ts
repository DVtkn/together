import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, requireCouple, unauthorized } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const rl = await rateLimit('default', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
  }
  const ctx = await getApiContext()
  if (!ctx) return unauthorized()
  const noCouple = requireCouple(ctx)
  if (noCouple) return noCouple

  const [events, memories] = await Promise.all([
    prisma.coupleEvent.findMany({
      where: { coupleId: ctx.couple!.id },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.dateMemory.findMany({
      where: { coupleId: ctx.couple!.id },
      orderBy: { date: 'desc' },
    }),
  ])

  const relationshipAnchor = ctx.couple!.relationshipStart ?? ctx.couple!.createdAt

  if (events.length === 0 && relationshipAnchor) {
    await prisma.coupleEvent.createMany({
      data: [
        { id: `ce_${Math.random().toString(36).slice(2, 14)}`, coupleId: ctx.couple!.id, type: 'couple_created', title: 'Пара создана', createdAt: relationshipAnchor },
        { id: `ce_${Math.random().toString(36).slice(2, 14)}`, coupleId: ctx.couple!.id, type: 'anniversary', title: 'Старт истории пары', createdAt: relationshipAnchor },
      ],
    })
    events.push(
      { id: `ce_fallback1`, coupleId: ctx.couple!.id, type: 'couple_created', title: 'Пара создана', meta: null, createdAt: relationshipAnchor },
      { id: `ce_fallback2`, coupleId: ctx.couple!.id, type: 'anniversary', title: 'Старт истории пары', meta: null, createdAt: relationshipAnchor }
    )
  }

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      meta: e.meta,
      createdAt: e.createdAt.toISOString(),
    })),
    memories: memories.map((m) => ({
      id: m.id,
      venueName: m.venueName,
      date: m.date.toISOString(),
      photoUrl: m.photoUrl,
      note: m.note,
      createdAt: m.createdAt.toISOString(),
    })),
  })
}

export const dynamic = 'force-dynamic'