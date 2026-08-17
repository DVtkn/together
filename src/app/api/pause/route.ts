import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, requireCouple, unauthorized } from '@/lib/api-auth'
import { notify, nameOf } from '@/lib/notify'
import { sendPushToUser } from '@/lib/push'

const PAUSE_MINUTES = 20
const RETURN_QUESTIONS = [
  'Как тебе было в эти минуты тишины?',
  'Что ты хотел(а) сказать, когда нажал(а) на стоп?',
  'Что мне сделать, чтобы тебе было спокойнее?',
]

export async function GET(request: NextRequest) {
  const rl = await rateLimit('default', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
  }
  const ctx = await getApiContext()
  if (!ctx) return unauthorized()
  const noCouple = requireCouple(ctx)
  if (noCouple) return noCouple

  const session = await prisma.pauseSession.findUnique({
    where: { coupleId: ctx.couple!.id },
  })

  if (!session) {
    return NextResponse.json({ active: false, endsAt: null, secondsLeft: 0 })
  }

  const now = Date.now()
  const endsAt = session.endsAt.getTime()
  if (session.active && endsAt <= now) {
    await prisma.pauseSession.update({
      where: { id: session.id },
      data: { active: false },
    })
    const partnerId = session.startedBy === ctx.user.id ? ctx.partner?.id : ctx.user.id
    if (partnerId) {
      const q = RETURN_QUESTIONS[new Date(session.endsAt).getDate() % RETURN_QUESTIONS.length]
      await notify(partnerId, 'pause_ended', `20 минут прошло. ${q}`, '/dashboard/daily')
      await sendPushToUser(partnerId, {
        title: '⏸️ Пауза закончилась',
        body: `20 минут прошло. ${q}`,
        url: '/dashboard/daily',
      })
    }
    return NextResponse.json({ active: false, endsAt: null, secondsLeft: 0 })
  }

  return NextResponse.json({
    active: session.active,
    endsAt: session.endsAt.toISOString(),
    secondsLeft: Math.max(0, Math.floor((endsAt - now) / 1000)),
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

  const endsAt = new Date(Date.now() + PAUSE_MINUTES * 60 * 1000)
  const existing = await prisma.pauseSession.findUnique({
    where: { coupleId: ctx.couple!.id },
  })

  const session = existing
    ? await prisma.pauseSession.update({
        where: { id: existing.id },
        data: { endsAt, active: true, startedBy: ctx.user.id },
      })
    : await prisma.pauseSession.create({
        data: {
          id: `ps_${Math.random().toString(36).slice(2, 14)}`,
          coupleId: ctx.couple!.id,
          startedBy: ctx.user.id,
          endsAt,
          active: true,
        },
      })

  if (ctx.partner) {
    const text = `${nameOf(ctx.user)} нажал(а) стоп-слово. Пауза на 20 минут.`
    await notify(ctx.partner.id, 'pause_started', text, '/dashboard/daily#pause')
    await sendPushToUser(ctx.partner.id, {
      title: '🛑 Пауза',
      body: `${nameOf(ctx.user)} взял(а) паузу на 20 минут. Дышите.`,
      url: '/dashboard/daily#pause',
    })
  }

  return NextResponse.json({ active: true, endsAt: session.endsAt.toISOString(), secondsLeft: PAUSE_MINUTES * 60 })
}

export async function DELETE(request: NextRequest) {
  const rl = await rateLimit('default', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
  }
  const ctx = await getApiContext()
  if (!ctx) return unauthorized()
  const noCouple = requireCouple(ctx)
  if (noCouple) return noCouple

  const existing = await prisma.pauseSession.findUnique({
    where: { coupleId: ctx.couple!.id },
  })
  if (existing) {
    await prisma.pauseSession.update({
      where: { id: existing.id },
      data: { active: false },
    })
  }

  return NextResponse.json({ active: false, endsAt: null, secondsLeft: 0 })
}

export const dynamic = 'force-dynamic'