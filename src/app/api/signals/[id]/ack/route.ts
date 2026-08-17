import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, requireCouple, unauthorized } from '@/lib/api-auth'
import { notify, nameOf } from '@/lib/notify'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await rateLimit('default', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
  }
  const ctx = await getApiContext()
  if (!ctx) return unauthorized()
  const noCouple = requireCouple(ctx)
  if (noCouple) return noCouple

  const { id } = await params
  const action = (await request.json().catch(() => ({}))).action as string | undefined
  if (action !== 'accept' && action !== 'later') {
    return NextResponse.json({ error: 'Нужен action: accept | later' }, { status: 400 })
  }

  const signal = await prisma.signal.findFirst({
    where: { id, coupleId: ctx.couple!.id },
  })
  if (!signal) {
    return NextResponse.json({ error: 'Сигнал не найден' }, { status: 404 })
  }

  await prisma.signal.update({
    where: { id: signal.id },
    data: { ackedAt: new Date() },
  })

  const sigHref = `/dashboard/ai?signal=${encodeURIComponent(signal.emoji)}&meaning=${encodeURIComponent(signal.meaning)}&id=${signal.id}`
  const notifs = await prisma.notification.findMany({
    where: { userId: ctx.user.id, type: 'signal_received', read: false },
    take: 10,
    orderBy: { createdAt: 'desc' },
  })
  const target = notifs.find((n) => n.href?.includes(`id=${signal.id}`))
  if (target) {
    await prisma.notification.update({ where: { id: target.id }, data: { read: true } })
  }

  if (action === 'accept' && ctx.partner) {
    await notify(ctx.partner.id, 'signal_accepted', `${nameOf(ctx.user)} откликается на ваш сигнал ${signal.emoji} — «${signal.meaning}» 🤍`, '/dashboard')
  }

  return NextResponse.json({ ok: true })
}

export const dynamic = 'force-dynamic'