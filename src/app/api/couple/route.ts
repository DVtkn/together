import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized, requireCouple } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { emitEvent } from '@/lib/story'
import { parseRuDate } from '@/lib/dates'

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

  let body: { relationshipStart?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Неверная дата' }, { status: 400 })
  }

  const raw = (body.relationshipStart ?? '').trim()
  const d = parseRuDate(raw)
  if (!d) {
    return NextResponse.json({ error: 'Введите дату в формате ДД.ММ.ГГГГ' }, { status: 400 })
  }
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  if (d > now) {
    return NextResponse.json({ error: 'Дата не может быть в будущем' }, { status: 400 })
  }
  if (d.getFullYear() < 1950) {
    return NextResponse.json({ error: 'Дата не может быть раньше 1950 года' }, { status: 400 })
  }

  const updated = await prisma.couple.update({
    where: { id: couple.id },
    data: { relationshipStart: d },
  })

  emitEvent(couple.id, 'anniversary', 'Дата начала отношений обновлена', { relationshipStart: raw })

  return NextResponse.json({ ok: true, relationshipStart: updated.relationshipStart?.toISOString() ?? null })
}

export const dynamic = 'force-dynamic'
export const revalidate = 0