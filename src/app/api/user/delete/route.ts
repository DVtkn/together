import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'

export async function DELETE(request: NextRequest) {
  const rl = await rateLimit('auth', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()

  try {
    const userId = ctx.user.id
    const coupleId = ctx.couple?.id
    const partnerId = ctx.partner?.id

    if (coupleId) {
      // Разрываем пару: освобождаем partnerAId/partnerBId, помечаем статус
      await prisma.couple.update({
        where: { id: coupleId },
        data: { status: 'DELETED' },
      })
      if (partnerId) {
        await prisma.user.update({
          where: { id: partnerId },
          data: { coupleId: null },
        })
      }
    }

    // Удаляем пользователя (каскадом уйдут ответы, пульсы, хотелки, чаты)
    await prisma.user.delete({ where: { id: userId } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'