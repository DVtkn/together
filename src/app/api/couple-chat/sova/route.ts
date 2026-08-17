import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, requireCouple, unauthorized } from '@/lib/api-auth'
import { getAIResponse, buildMessages } from '@/lib/ai/provider'

export async function POST(request: NextRequest) {
  const rl = await rateLimit('ai', request.headers.get('x-forwarded-for') || 'anon')
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

  const partnerName = ctx.partner?.name ?? ctx.partner?.username ?? 'Партнёр'
  const myName = ctx.user.name ?? ctx.user.username ?? 'Я'

  const SYSTEM = `Ты — Сова, ИИ-психолог, подключённая к чату пары в приложении Loop.
Собеседники: ${myName} и ${partnerName}.
СТРОГО: 1) отвечай ТОЛЬКО на русском; 2) простой текст без markdown: без #, **; 3) до 90 слов; 4) тон тёплый, нейтральный к обоим, без диагнозов; 5) один вопрос за раз.
Ты видишь диалог пары. Реагируй коротко и полезно: заметь чувства обоих, дай совет или задай мягкий вопрос, если это уместно. Если диалог в порядке — просто поддержите.`

  const lastMessages = await prisma.coupleMessage.findMany({
    where: { coupleId: ctx.couple!.id },
    orderBy: { createdAt: 'desc' },
    take: 12,
    include: { User: { select: { id: true, name: true, username: true } } },
  })

  if (lastMessages.length === 0) {
    return NextResponse.json({ error: 'В чате ещё нет сообщений' }, { status: 400 })
  }

  const history = lastMessages.reverse().map((m) => {
    const sender = m.senderId === 'sova' ? 'Сова' : (m.User?.name ?? m.User?.username ?? 'Партнёр')
    return { role: 'user' as const, content: `${sender}: ${m.content}` }
  })

  const messages = buildMessages(SYSTEM, history)
  const aiResponse = await getAIResponse(messages)

  const content = aiResponse.content.trim()
  if (!content) {
    return NextResponse.json({ error: 'Сова не ответила' }, { status: 500 })
  }

  const message = await prisma.coupleMessage.create({
    data: {
      id: `cm_${Math.random().toString(36).slice(2, 14)}`,
      coupleId: ctx.couple!.id,
      senderId: 'sova',
      content,
    },
  })

  return NextResponse.json({
    item: {
      id: message.id,
      content: message.content,
      senderId: 'sova',
      senderName: 'Сова',
      createdAt: message.createdAt.toISOString(),
      isSova: true,
    },
  }, { status: 201 })
}

export const dynamic = 'force-dynamic'
