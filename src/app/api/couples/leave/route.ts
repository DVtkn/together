import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  const rl = await rateLimit('couples', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()

  try {
    if (!ctx.couple) {
      return NextResponse.json({ error: 'Вы не в паре' }, { status: 400 })
    }

    const coupleId = ctx.couple.id
    const partnerId = ctx.partner?.id

    // Покидающий оставляет пару: отвязываем его, партнёр остаётся без пары
    await prisma.user.update({
      where: { id: ctx.user.id },
      data: { coupleId: null },
    })

    if (partnerId) {
      await prisma.user.update({
        where: { id: partnerId },
        data: { coupleId: null },
      })
    }

    await prisma.couple.update({
      where: { id: coupleId },
      data: { status: 'ARCHIVED' },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Leave couple error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'