import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'
import { getCurrentUserSession } from '@/lib/auth-session'

// GET /api/users/profile - Get user profile
export async function GET(
  request: NextRequest,
) {
  const rl = await rateLimit('users', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  try {
    // Get current user session
    const session = await getCurrentUserSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    const userId = session.user.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        reputationScore: true,
        totalRides: true,
        completedRides: true,
        averageRating: true,
        role: true,
        emailVerified: true,
        preferredGender: true,
        petFriendly: true,
        smokeFree: true,
        conversationLevel: true,
        musicPreference: true,
        createdAt: true,
        lastRideAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    // Get ride statistics
    const rides = await prisma.ride.count({
      where: { driverId: userId },
    })
    const requests = await prisma.rideRequest.count({
      where: { passengerId: userId },
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        reputationScore: user.reputationScore,
        totalRides: user.totalRides,
        completedRides: user.completedRides,
        averageRating: user.averageRating,
        role: user.role,
        emailVerified: user.emailVerified,
        preferredGender: user.preferredGender,
        petFriendly: user.petFriendly,
        smokeFree: user.smokeFree,
        conversationLevel: user.conversationLevel,
        musicPreference: user.musicPreference,
        createdAt: user.createdAt,
        lastRideAt: user.lastRideAt,
      },
      stats: {
        totalRidesAsDriver: rides,
        totalRidesAsPassenger: requests,
      },
    })
  } catch (error) {
    console.error('Get user profile error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// PUT /api/users/profile - Update user profile
export async function PUT(request: NextRequest) {
  const rl = await rateLimit('users', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  try {
    const body = await request.json()
    const updateSchema = z.object({
      name: z.string().min(2).max(50).optional(),
      avatarUrl: z.string().url().optional().or(z.literal('')),
      preferredGender: z.string().optional(),
      petFriendly: z.boolean().optional(),
      smokeFree: z.boolean().optional(),
      conversationLevel: z.string().optional(),
      musicPreference: z.string().optional(),
    })

    const validation = updateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Ошибка валидации' },
        { status: 400 }
      )
    }

    // Only allow users to update their own profile
    const session = await getCurrentUserSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    const userId = session.user.id

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: validation.data.name,
        avatarUrl: validation.data.avatarUrl || null,
        preferredGender: validation.data.preferredGender,
        petFriendly: validation.data.petFriendly,
        smokeFree: validation.data.smokeFree,
        conversationLevel: validation.data.conversationLevel,
        musicPreference: validation.data.musicPreference,
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        preferredGender: true,
        petFriendly: true,
        smokeFree: true,
        conversationLevel: true,
        musicPreference: true,
      },
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
    })
  } catch (error) {
    console.error('Update user profile error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
