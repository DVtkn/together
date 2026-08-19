import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, requireCouple, unauthorized } from '@/lib/api-auth'
import { notify, nameOf } from '@/lib/notify'

const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params
  const ritual = await prisma.ritual.findUnique({ where: { id } })
  if (!ritual || ritual.coupleId !== ctx.couple!.id) {
    return NextResponse.json({ error: 'Ритуал не найден' }, { status: 404 })
  }

  const today = todayKey()
  const existing = await prisma.ritualCompletion.findUnique({
    where: { ritualId_userId_date: { ritualId: id, userId: ctx.user.id, date: today } },
  })

  let mine = false
  if (existing) {
    await prisma.ritualCompletion.delete({ where: { id: existing.id } })
  } else {
    await prisma.ritualCompletion.create({
      data: {
        id: `rc_${Math.random().toString(36).slice(2, 14)}`,
        ritualId: id,
        userId: ctx.user.id,
        date: today,
      },
    })
    mine = true
    if (ctx.partner) {
      await notify(
        ctx.partner.id,
        'ritual_done',
        `${nameOf(ctx.user)} выполнил(а) ритуал «${ritual.title}»`,
        '/dashboard#challenges'
      )
    }
  }

  return NextResponse.json({ ok: true, mine })
}

export const dynamic = 'force-dynamic'