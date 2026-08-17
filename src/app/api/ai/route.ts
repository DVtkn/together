import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { buildMessages, safeParseResponse, getAIResponse, SYSTEM_PROMPT } from '@/lib/ai/provider'

export async function GET(request: NextRequest) {
  const rl = await rateLimit('ai', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()

  if (!ctx.couple) {
    return NextResponse.json({ conversations: [] })
  }

  const conversations = await prisma.aIConversation.findMany({
    where: { coupleId: ctx.couple.id },
    include: { AIMessage: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { updatedAt: 'desc' },
    take: 30,
  })

  return NextResponse.json({
    conversations: conversations.map((c) => ({
      id: c.id,
      title: c.title || 'Новый диалог',
      updatedAt: c.updatedAt.toISOString(),
      lastMessage: c.AIMessage[0]?.content || '',
    })),
  })
}

export async function POST(request: NextRequest) {
  let body: { message?: string; conversationId?: string } = {}
  try {
    const rl = await rateLimit('ai', request.headers.get('x-forwarded-for') || 'anon')
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Слишком много запросов. Попробуйте позже.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    const ctx = await getApiContext()
    if (!ctx) return unauthorized()

    body = await request.json()
    if (!body || !body.message || typeof body.message !== 'string') {
      return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 })
    }

    const message = body.message.trim()
    if (message.length === 0) {
      return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 })
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: 'Сообщение слишком длинное' }, { status: 400 })
    }

    const couple = ctx.couple
    if (!couple) {
      return NextResponse.json({ error: 'Чтобы общаться с ИИ, нужно быть в паре' }, { status: 400 })
    }

    // --- жесткий системный промпт Совы ---
    const SYSTEM = `Ты — Сова, ИИ-психолог приложения Loop для пар.
СТРОГО: 1) отвечай ТОЛЬКО на русском; 2) простой текст без markdown: без #, **, |таблиц|; 3) до 120 слов; 4) тон тёплый, без диагнозов; 5) один вопрос за раз.
Если спрашивают «привет/что ты умеешь/как ты работаешь» — коротко представься и перечисли: разбираю ссоры и «я-сообщения», объясняю ваши тесты и отчёт, идеи свиданий, поддержка.
Кризис/насилие/риск вреда — мягко направь к живому специалисту.`

    // Найти или создать беседу
    let conversationId = body.conversationId || null
    if (conversationId) {
      const existing = await prisma.aIConversation.findUnique({ where: { id: conversationId } })
      if (!existing || existing.coupleId !== couple.id) conversationId = null
    }
    if (!conversationId) {
      const created = await prisma.aIConversation.create({
        data: {
          id: `ai_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
          coupleId: couple.id,
          title: message.slice(0, 60),
          updatedAt: new Date(),
        },
      })
      conversationId = created.id
    }

    // Сохраняем сообщение пользователя
    await prisma.aIMessage.create({
      data: {
        id: `msg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        conversationId,
        userId: ctx.user.id,
        role: 'USER',
        content: message,
        model: 'openai/gpt-oss-120b',
      },
    })

    // История беседы (до 20 сообщений)
    const history = await prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    })

    const chatMessages = history.map((m) => ({
      role: m.role === 'USER' ? 'user' : m.role === 'ASSISTANT' ? 'assistant' : 'system',
      content: m.content,
    }))

    const messages = buildMessages(SYSTEM, chatMessages)

    // Получаем ответ от ИИ
    const aiResponse = await getAIResponse(messages)

    // Сохраняем ответ ИИ (после пост-обработки в provider)
    await prisma.aIMessage.create({
      data: {
        id: `msg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        conversationId,
        role: 'ASSISTANT',
        content: aiResponse.content,
        tokensInput: aiResponse.usage?.input,
        tokensOutput: aiResponse.usage?.output,
        model: 'openai/gpt-oss-120b',
      },
    })

    // Обновляем дату беседы
    await prisma.aIConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({
      conversationId,
      choices: [{ index: 0, message: { role: 'assistant', content: aiResponse.content }, finish_reason: 'stop' }],
      usage: { prompt_tokens: aiResponse.usage?.input || 0, completion_tokens: aiResponse.usage?.output || 0, total_tokens: (aiResponse.usage?.input || 0) + (aiResponse.usage?.output || 0) },
    })
  } catch (error: unknown) {
    console.error('AI API error:', error)
    return NextResponse.json({ error: 'Ошибка при общении с ИИ. Попробуйте ещё раз.' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0