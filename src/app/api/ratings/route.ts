import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

// POST /api/ratings - Submit a rating/review after completed ride
export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
  const rl = await rateLimit('ratings', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много рейтинга. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  try {
    const body = await request.json()
    const ratingSchema = z.object({
      rideId: z.string(),
      ratedId: z.string(), // User who received the rating
      rating: z.number().int().min(1).max(5),
      title: z.string().optional(),
      comment: z.string().optional(),
    })

    const validation = ratingSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Ошибка валидации' },
        { status: 400 }
      )
    }

    // Get current user (rater)
    const { auth } = await import('@/lib/auth')
    const rater = await auth()

    if (!rater) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Check if ride exists and is completed
    const ride = await prisma.ride.findUnique({
      where: { id: validation.data.rideId },
      select: { status: true, driverId: true, passengerId: true },
    })

    if (!ride) {
      return NextResponse.json({ error: 'Поездка не найдена' }, { status: 404 })
    }

    // Validate that rater participated in this ride
    const rideRequest = await prisma.rideRequest.findFirst({
      where: {
        rideId: validation.data.rideId,
        OR: [
          { passengerId: rater.id },
        ],
      },
    })

    if (!rideRequest) {
      return NextResponse.json(
        { error: 'Вы не участвовали в этой поездке' },
        { status: 403 }
      )
    }

    // Check if already rated
    const existingRating = await prisma.review.findFirst({
      where: {
        rideId: validation.data.rideId,
        raterId: rater.id,
      },
    })

    if (existingRating) {
      return NextResponse.json(
        { error: 'Вы уже ставили оценку для этой поездки' },
        { status: 400 }
      )
    }

    // Create the review
    const review = await prisma.review.create({
      data: {
        rideId: validation.data.rideId,
        raterId: rater.id,
        ratedId: validation.data.ratedId,
        rating: validation.data.rating,
        title: validation.data.title,
        comment: validation.data.comment,
      },
      include: {
        rater: {
          select: { id: true, name: true, avatarUrl: true },
        },
        rated: {
          select: {
            id: true,
            name: true,
            averageRating: true,
            totalRides: true,
            completedRides: true,
          },
        },
      },
    })

    // Update the rated user's average rating
    const allRatings = await prisma.review.findMany({
      where: { ratedId: validation.data.ratedId },
    })

    const avgRating = allRatings.length > 0
      ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
      : 0

    await prisma.user.update({
      where: { id: validation.data.ratedId },
      data: {
        averageRating: avgRating,
      },
    })

    return NextResponse.json({
      success: true,
      review: {
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        rater: {
          id: review.rater.id,
          name: review.rater.name,
          avatarUrl: review.rater.avatarUrl,
        },
        createdAt: review.createdAt,
      },
      ratedUser: {
        averageRating: avgRating,
      },
    })
  } catch (error) {
    console.error('Submit rating error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// GET /api/ratings - Get ratings for a user
export async function GET(
  request: NextRequest,
): Promise<NextResponse> {
  const rl = await rateLimit('ratings', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const ratedId = searchParams.get('ratedId')

    const ratings = await prisma.review.findMany({
      where: ratedId ? { ratedId } : {},
      include: {
        rater: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0

    return NextResponse.json({
      ratings: ratings.map(r => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        rater: {
          id: r.rater.id,
          name: r.rater.name,
          avatarUrl: r.rater.avatarUrl,
        },
        createdAt: r.createdAt,
      })),
      averageRating: avgRating,
      totalRatings: ratings.length,
    })
  } catch (error) {
    console.error('Get ratings error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'