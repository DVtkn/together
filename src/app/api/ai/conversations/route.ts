import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

// GET /api/ai/conversations/[id] - Get messages for a conversation
export async function GET(
  request: NextRequest
) {
  const rl = await rateLimit('ai', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  try {
    // For now return empty messages since we don't have the full schema
    // In full implementation, would have AIMessage model
    const messages: Array<{ id: string; role: string; content: string; createdAt: string }> = []

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'