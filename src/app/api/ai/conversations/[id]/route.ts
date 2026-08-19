import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit('ai', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()

  try {
    const { id } = await params
    const conversation = await prisma.aIConversation.findUnique({ where: { id } })
    if (!conversation) {
      return NextResponse.json({ error: 'Диалог не найден' }, { status: 404 })
    }
    if (conversation.mode === 'solo' && conversation.userId !== ctx.user.id) {
      return NextResponse.json({ error: 'Нет доступа к диалогу' }, { status: 403 })
    }

    const messages = await prisma.aIMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit('ai', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()

  try {
    const { id } = await params
    const conversation = await prisma.aIConversation.findUnique({ where: { id } })
    if (!conversation) {
      return NextResponse.json({ error: 'Диалог не найден' }, { status: 404 })
    }
    if (conversation.mode === 'solo' && conversation.userId !== ctx.user.id) {
      return NextResponse.json({ error: 'Нет доступа к диалогу' }, { status: 403 })
    }

    await prisma.aIConversation.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete conversation error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'