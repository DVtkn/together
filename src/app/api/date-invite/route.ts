import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, requireCouple, unauthorized } from '@/lib/api-auth'
import { z } from 'zod'

const createSchema = z.object({
  vibe: z.string().min(1).max(40).optional(),
  vibeEmoji: z.string().min(1).max(8).optional(),
  venueId: z.string().optional(),
  venueName: z.string().min(1).max(120).optional(),
  venueArea: z.string().max(120).optional().nullable(),
  venueEmoji: z.string().max(8).optional().nullable(),
  date: z.string().max(20).optional(),
  time: z.string().max(10).optional(),
})

const toDto = (invite: {
  id: string
  vibe: string | null
  vibeEmoji: string | null
  venueId: string | null
  venueName: string | null
  venueArea: string | null
  venueEmoji: string | null
  date: string | null
  time: string | null
  status: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}) => ({
  id: invite.id,
  vibe: invite.vibe,
  vibeEmoji: invite.vibeEmoji,
  venueId: invite.venueId,
  venueName: invite.venueName,
  venueArea: invite.venueArea,
  venueEmoji: invite.venueEmoji,
  date: invite.date,
  time: invite.time,
  status: invite.status,
  createdBy: invite.createdBy,
  createdAt: invite.createdAt,
  updatedAt: invite.updatedAt,
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

  try {
    if (!ctx.couple) {
      return NextResponse.json({ invites: [] })
    }

    const invites = await prisma.dateInvite.findMany({
      where: { coupleId: ctx.couple.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({ invites: invites.map(toDto) })
  } catch (error) {
    console.error('Get date invites error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
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

  try {
    const body = await request.json()
    const validation = createSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Ошибка валидации' }, { status: 400 })
    }

    const data = validation.data
    const invite = await prisma.dateInvite.create({
      data: {
        id: `inv_${Math.random().toString(36).slice(2, 14)}`,
        coupleId: ctx.couple!.id,
        createdBy: ctx.user.id,
        vibe: data.vibe ?? null,
        vibeEmoji: data.vibeEmoji ?? null,
        venueId: data.venueId ?? null,
        venueName: data.venueName ?? null,
        venueArea: data.venueArea ?? null,
        venueEmoji: data.venueEmoji ?? null,
        date: data.date ?? null,
        time: data.time ?? null,
      },
    })

    return NextResponse.json({ invite: toDto(invite) }, { status: 201 })
  } catch (error) {
    console.error('Create date invite error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
