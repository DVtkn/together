import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, requireCouple, unauthorized } from '@/lib/api-auth'
import { notify, nameOf } from '@/lib/notify'
import { sendPushToUserFireAndForget } from '@/lib/push'
import { signalCreateSchema } from '@/lib/utils/validation'
import { validationError } from '@/lib/utils/http'

const DEFAULT_SIGNALS = [
  { emoji: '🤗', meaning: 'Обними меня', suggestedReply: 'Иду. Крепко обнимаю 🤗' },
  { emoji: '🕊️', meaning: 'Мне неспокойно', suggestedReply: 'Я рядом. Расскажи, что случилось 🕊️' },
  { emoji: '⏸️', meaning: 'Нужна пауза', suggestedReply: 'Хорошо, я подожду. Дай знать, когда будешь готов(а) 🤍' },
]

async function ensureDefaultSignals(coupleId: string) {
  const count = await prisma.signal.count({ where: { coupleId } })
  if (count === 0) {
    await prisma.signal.createMany({
      data: DEFAULT_SIGNALS.map((s) => ({ coupleId, ...s })),
    })
  }
}

export async function GET(request: NextRequest) {
  const rl = await rateLimit('default', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
  }
  const ctx = await getApiContext()
  if (!ctx) return unauthorized()
  const noCouple = requireCouple(ctx)
  if (noCouple) return noCouple

  await ensureDefaultSignals(ctx.couple!.id)
  const signals = await prisma.signal.findMany({
    where: { coupleId: ctx.couple!.id },
    orderBy: { id: 'asc' },
  })

  const lastSent = await prisma.signalEvent.findFirst({
    where: { coupleId: ctx.couple!.id, fromId: ctx.user.id },
    orderBy: { sentAt: 'desc' },
    include: { signal: true },
  })

  const incoming = await prisma.signalEvent.findFirst({
    where: { coupleId: ctx.couple!.id, fromId: { not: ctx.user.id }, answeredAt: null },
    orderBy: { sentAt: 'desc' },
    include: { signal: true },
  })

  return NextResponse.json({
    signals: signals.map((s) => ({
      id: s.id,
      emoji: s.emoji,
      meaning: s.meaning,
      suggestedReply: s.suggestedReply,
    })),
    lastSent: lastSent
      ? {
          signalId: lastSent.signalId,
          emoji: lastSent.signal.emoji,
          meaning: lastSent.signal.meaning,
          at: lastSent.sentAt.toISOString(),
          answered: lastSent.answeredAt != null,
        }
      : null,
    incoming: incoming
      ? {
          signalId: incoming.signalId,
          emoji: incoming.signal.emoji,
          meaning: incoming.signal.meaning,
          suggestedReply: incoming.signal.suggestedReply,
          at: incoming.sentAt.toISOString(),
        }
      : null,
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

  const body = await request.json()
  const validation = signalCreateSchema.safeParse(body)
  if (!validation.success) {
    return validationError('Заполните эмодзи, смысл и мягкий ответ')
  }

  const { emoji, meaning, suggestedReply } = validation.data

  const signal = await prisma.signal.create({
    data: {
      id: `sig_${Math.random().toString(36).slice(2, 14)}`,
      coupleId: ctx.couple!.id,
      emoji,
      meaning,
      suggestedReply,
    },
  })

  return NextResponse.json({ signal }, { status: 201 })
}

export const dynamic = 'force-dynamic'