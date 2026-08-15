import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'

// DELETE /api/push/unsubscribe - удалить push-подписку пользователя
export async function DELETE(request: NextRequest) {
  const rl = await rateLimit('default', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : null

    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint, userId: ctx.user.id },
      })
    } else {
      await prisma.pushSubscription.deleteMany({ where: { userId: ctx.user.id } })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Remove push subscription error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'