import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, requireCouple, unauthorized } from '@/lib/api-auth'
import { z } from 'zod'
import { emitEvent } from '@/lib/story'

const visitedSchema = z.object({
  note: z.string().max(500).optional(),
  photoUrl: z.string().url().max(1000).optional().or(z.literal('')),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit('default', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
  }
  const ctx = await getApiContext()
  if (!ctx) return unauthorized()
  const noCouple = requireCouple(ctx)
  if (noCouple) return noCouple

  const { id } = await params
  const invite = await prisma.dateInvite.findFirst({
    where: { id, coupleId: ctx.couple!.id },
  })
  if (!invite) {
    return NextResponse.json({ error: 'Свидание не найдено' }, { status: 404 })
  }

  const body = await request.json()
  const validation = visitedSchema.safeParse(body)
  const note = validation.success && validation.data.note ? validation.data.note : undefined
  const photoUrl = validation.success && validation.data.photoUrl ? validation.data.photoUrl : undefined

  const memory = await prisma.dateMemory.create({
    data: {
      id: `dm_${Math.random().toString(36).slice(2, 14)}`,
      coupleId: ctx.couple!.id,
      venueName: invite.venueName ?? `${invite.vibeEmoji ?? ''} ${invite.vibe ?? 'Свидание'}`.trim(),
      date: new Date(),
      photoUrl,
      note,
    },
  })

  await emitEvent(ctx.couple!.id, 'date_visited', `Сходили на свидание: ${invite.venueName ?? 'без места'}`, {
    memoryId: memory.id,
    venueName: invite.venueName,
  })

  if (ctx.partner) {
    await prisma.dateInvite.update({ where: { id: invite.id }, data: { status: 'CONFIRMED' } })
  }

  return NextResponse.json({ ok: true, memory }, { status: 201 })
}

export const dynamic = 'force-dynamic'