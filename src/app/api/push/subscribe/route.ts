import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { z } from 'zod'

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

// POST /api/push/subscribe - сохранить push-подписку пользователя
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
    const body = await request.json()
    const validation = subscriptionSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Некорректная подписка' }, { status: 422 })
    }

    const { endpoint, keys } = validation.data

    const rawUa = request.headers.get('user-agent') ?? ''
    const userAgent = rawUa.slice(0, 200).replace(/[<>"'`]/g, '')

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: ctx.user.id,
        keysP256dh: keys.p256dh,
        keysAuth: keys.auth,
        userAgent,
      },
      create: {
        id: `ps_${Math.random().toString(36).slice(2, 14)}`,
        userId: ctx.user.id,
        endpoint,
        keysP256dh: keys.p256dh,
        keysAuth: keys.auth,
        userAgent,
      },
    })

    await prisma.user.update({
      where: { id: ctx.user.id },
      data: { pushEnabled: true },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Save push subscription error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'