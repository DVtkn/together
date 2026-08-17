import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  const rl = await rateLimit('venues', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()

  // Извлекаем id из URL параметров
  const { searchParams } = new URL(request.url)
  const venueId = searchParams.get('id') || ''
  
  if (!venueId) {
    return NextResponse.json({ error: 'ID заведения не указан' }, { status: 400 })
  }

  const body = await request.json()
  const { rating } = body

  if (rating === undefined || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Оценка должна быть от 1 до 5' }, { status: 400 })
  }

  // Сохраняем/обновляем голос пользователя
  const ratingEntry = await prisma.communityVenueRating.upsert({
    where: {
      venueId_userId: {
        venueId,
        userId: ctx.user.id,
      },
    },
    create: {
      venueId,
      userId: ctx.user.id,
      rating,
    },
    update: {
      rating, // разрешаем переголосование? или оставить create-only?
      // Нам нужно решить: можно ли менять голос. Обычно — можно, но с ограничениями.
      // Пока оставим update.
    },
  })

  // Пересчитываем средний рейтинг venue
  const ratings = await prisma.communityVenueRating.findMany({
    where: { venueId },
  })

  return NextResponse.json({
    rating: ratingEntry.rating,
    avgRating: null, // пересчитывается периодически
    totalRatings: ratings.length,
  })
}

export const dynamic = 'force-dynamic'
export const revalidate = 0