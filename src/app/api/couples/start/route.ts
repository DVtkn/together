import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized, requireCouple } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { emitEvent } from '@/lib/story'
import { z } from 'zod'

const startSchema = z.object({
  startedAt: z.string().min(1).max(40),
})

export async function PATCH(request: NextRequest) {
  const rl = await rateLimit('default', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()
  const guard = requireCouple(ctx)
  if (guard) return guard
  const couple = ctx.couple!
  const partner = ctx.partner!

  let body: { startedAt?: string } = {}
  try {
    body = startSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Неверная дата' }, { status: 400 })
  }

  const started = new Date(body.startedAt!)
  if (isNaN(started.getTime())) {
    return NextResponse.json({ error: 'Неверная дата' }, { status: 400 })
  }

  const updated = await prisma.couple.update({
    where: { id: couple.id },
    data: { startedAt: started },
  })

  emitEvent(couple.id, 'anniversary', 'Дата начала пары обновлена', { startedAt: body.startedAt })

  return NextResponse.json({ ok: true, startedAt: updated.startedAt?.toISOString() ?? null })
}

export const dynamic = 'force-dynamic'
export const revalidate = 0