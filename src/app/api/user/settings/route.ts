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
      emailEnabled: ctx.user.emailEnabled,
      weeklyPulseReminder: ctx.user.weeklyPulseReminder,
      challengeReminder: ctx.user.challengeReminder,
    },
    couple: ctx.couple
      ? {
          id: ctx.couple.id,
          status: ctx.couple.status,
          partnerA: { name: ctx.couple.partnerAId === ctx.user.id ? ctx.user.name : (ctx.partner?.name ?? null), id: ctx.couple.partnerAId },
          partnerB: { name: ctx.couple.partnerBId === ctx.user.id ? ctx.user.name : (ctx.partner?.name ?? null), id: ctx.couple.partnerBId },
          startedAt: ctx.couple.startedAt?.toISOString() ?? null,
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
      return NextResponse.json({ error: 'Ошибка валидации' }, { status: 400 })
    }

    const { name, email, pushEnabled, emailEnabled, weeklyPulseReminder, challengeReminder } = validation.data

    const user = await prisma.user.update({
      where: { id: ctx.user.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(pushEnabled !== undefined ? { pushEnabled } : {}),
        ...(emailEnabled !== undefined ? { emailEnabled } : {}),
        ...(weeklyPulseReminder !== undefined ? { weeklyPulseReminder } : {}),
        ...(challengeReminder !== undefined ? { challengeReminder } : {}),
      },
    })

    return NextResponse.json({
      settings: {
        name: user.name,
        email: user.email ?? '',
        pushEnabled: user.pushEnabled,
        emailEnabled: user.emailEnabled,
        weeklyPulseReminder: user.weeklyPulseReminder,
        challengeReminder: user.challengeReminder,
      },
    })
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'