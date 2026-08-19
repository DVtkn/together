import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { z } from 'zod'
import { notify, nameOf } from '@/lib/notify'
import { emitEvent } from '@/lib/story'
import { sendPushToUserFireAndForget } from '@/lib/push'

const patchSchema = z.object({
  vibe: z.string().min(1).max(40).optional(),
  vibeEmoji: z.string().min(1).max(8).optional(),
  venueId: z.string().optional(),
  venueName: z.string().min(1).max(120).optional(),
  venueArea: z.string().max(120).optional().nullable(),
  venueEmoji: z.string().max(8).optional().nullable(),
  date: z.string().max(20).optional(),
  time: z.string().max(10).optional(),
  status: z.enum(['PENDING', 'PROPOSED', 'CONFIRMED', 'DECLINED']).optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit('default', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()

  const { id } = await params

  try {
    const existing = await prisma.dateInvite.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Приглашение не найдено' }, { status: 404 })
    }

    if (ctx.couple && existing.coupleId !== ctx.couple.id) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
    }

    const body = await request.json()
    const validation = patchSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Ошибка валидации' }, { status: 422 })
    }

    const data = validation.data
    const invite = await prisma.dateInvite.update({
      where: { id },
      data: {
        vibe: data.vibe ?? undefined,
        vibeEmoji: data.vibeEmoji ?? undefined,
        venueId: data.venueId ?? undefined,
        venueName: data.venueName ?? undefined,
        venueArea: data.venueArea ?? undefined,
        venueEmoji: data.venueEmoji ?? undefined,
        date: data.date ?? undefined,
        time: data.time ?? undefined,
        status: data.status ?? undefined,
      },
    })

    if (invite.status === 'PROPOSED' && invite.createdBy && invite.createdBy !== ctx.user.id) {
      const when = [invite.date, invite.time].filter(Boolean).join(' ')
      const body = `${nameOf(ctx.user)} выбрала: ${invite.venueName ?? 'место'}${when ? `, ${when}` : ''}`
      await notify(
        invite.createdBy,
        'date_planned',
        body,
        '/dashboard/date'
      )
      sendPushToUserFireAndForget(invite.createdBy, {
        title: '🗓️ Свидание спланировано',
        body,
        url: '/dashboard/date',
      })
    }

    if (invite.status === 'CONFIRMED' && ctx.couple) {
      await emitEvent(ctx.couple.id, 'first_date', `Свидание: ${invite.venueName ?? 'без места'}`, {
        inviteId: invite.id,
        venueName: invite.venueName,
        venueId: invite.venueId,
        date: invite.date,
        time: invite.time,
      })
    }

    return NextResponse.json({
      invite: {
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
      },
    })
  } catch (error) {
    console.error('Update date invite error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
