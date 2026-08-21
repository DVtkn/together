import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { settingsSchema } from '@/lib/utils/validation'

export async function GET(request: NextRequest) {
  const rl = await rateLimit('default', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()

  return NextResponse.json({
    settings: {
      name: ctx.user.name,
      email: ctx.user.email ?? '',
      pushEnabled: ctx.user.pushEnabled,
      notifyMessages: ctx.user.notifyMessages,
      notifyStatus: ctx.user.notifyStatus,
      notifyDates: ctx.user.notifyDates,
      notifyChallenges: ctx.user.notifyChallenges,
    },
    couple: ctx.couple
      ? {
          id: ctx.couple.id,
          status: ctx.couple.status,
          partnerA: { name: ctx.couple.partnerAId === ctx.user.id ? ctx.user.name : (ctx.partner?.name ?? null), id: ctx.couple.partnerAId },
          partnerB: { name: ctx.couple.partnerBId === ctx.user.id ? ctx.user.name : (ctx.partner?.name ?? null), id: ctx.couple.partnerBId },
          relationshipStart: ctx.couple.relationshipStart?.toISOString() ?? null,
        }
      : null,
  })
}

export async function PATCH(request: NextRequest) {
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
    const validation = settingsSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Ошибка валидации' }, { status: 422 })
    }

    const { name, email, pushEnabled, notifyMessages, notifyStatus, notifyDates, notifyChallenges } = validation.data

    const user = await prisma.user.update({
      where: { id: ctx.user.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(pushEnabled !== undefined ? { pushEnabled } : {}),
        ...(notifyMessages !== undefined ? { notifyMessages } : {}),
        ...(notifyStatus !== undefined ? { notifyStatus } : {}),
        ...(notifyDates !== undefined ? { notifyDates } : {}),
        ...(notifyChallenges !== undefined ? { notifyChallenges } : {}),
      },
    })

    return NextResponse.json({
      settings: {
        name: user.name,
        email: user.email ?? '',
        pushEnabled: user.pushEnabled,
        notifyMessages: user.notifyMessages,
        notifyStatus: user.notifyStatus,
        notifyDates: user.notifyDates,
        notifyChallenges: user.notifyChallenges,
      },
    })
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'