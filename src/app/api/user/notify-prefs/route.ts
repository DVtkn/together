import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { z } from 'zod'

const notifyPrefsSchema = z.object({
  notifyMessages: z.boolean().optional(),
  notifyStatus: z.boolean().optional(),
  notifyDates: z.boolean().optional(),
  notifyChallenges: z.boolean().optional(),
})

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
    const validation = notifyPrefsSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Ошибка валидации' }, { status: 422 })
    }

    const { notifyMessages, notifyStatus, notifyDates, notifyChallenges } = validation.data

    const user = await prisma.user.update({
      where: { id: ctx.user.id },
      data: {
        ...(notifyMessages !== undefined ? { notifyMessages } : {}),
        ...(notifyStatus !== undefined ? { notifyStatus } : {}),
        ...(notifyDates !== undefined ? { notifyDates } : {}),
        ...(notifyChallenges !== undefined ? { notifyChallenges } : {}),
      },
    })

    return NextResponse.json({
      notifyMessages: user.notifyMessages,
      notifyStatus: user.notifyStatus,
      notifyDates: user.notifyDates,
      notifyChallenges: user.notifyChallenges,
    })
  } catch (error) {
    console.error('Update notify prefs error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'