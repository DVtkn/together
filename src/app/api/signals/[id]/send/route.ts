import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, requireCouple, unauthorized } from '@/lib/api-auth'
import { notify, nameOf } from '@/lib/notify'
import { sendPushToUserFireAndForget } from '@/lib/push'

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
  const signal = await prisma.signal.findFirst({
    where: { id, coupleId: ctx.couple!.id },
  })
  if (!signal) {
    return NextResponse.json({ error: 'Сигнал не найден' }, { status: 404 })
  }

  await prisma.signalEvent.create({
    data: {
      id: `se_${Math.random().toString(36).slice(2, 14)}`,
      coupleId: ctx.couple!.id,
      signalId: signal.id,
      fromId: ctx.user.id,
      sentAt: new Date(),
    },
  })

  if (ctx.partner) {
    const text = `${nameOf(ctx.user)} послал(а) сигнал ${signal.emoji} — «${signal.meaning}»`
    const replyHref = `/dashboard/ai?reply=${encodeURIComponent(signal.suggestedReply)}&signal=${encodeURIComponent(signal.emoji)}&meaning=${encodeURIComponent(signal.meaning)}&id=${signal.id}`
    await notify(ctx.partner.id, 'signal_received', text, replyHref)
  }

  return NextResponse.json({ ok: true, signal: { emoji: signal.emoji, meaning: signal.meaning, suggestedReply: signal.suggestedReply } })
}

export const dynamic = 'force-dynamic'