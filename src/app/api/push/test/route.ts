import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { sendPushToUser } from '@/lib/push'

export async function POST(request: NextRequest) {
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
    const subs = await prisma.pushSubscription.findMany({ where: { userId: ctx.user.id } })
    if (!subs.length) {
      return NextResponse.json({ sent: false, error: 'нет подписок' }, { status: 400 })
    }

    const results = await Promise.allSettled(
      subs.map((s) => sendPushToUser(ctx.user.id, { title: 'Loop', body: 'Тест 🔔', url: '/dashboard' }))
    )

    const sent = results.some((r) => r.status === 'fulfilled' && r.value.sent > 0)
    return NextResponse.json({ sent })
  } catch (error) {
    console.error('Test push error:', error)
    return NextResponse.json({ sent: false, error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'