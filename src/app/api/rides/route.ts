import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

// POST /api/rides - Create a new ride
export async function POST(request: NextRequest) {
  const rl = await rateLimit('rides', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  try {
    const body = await request.json()
    const createSchema = z.object({
      origin: z.string().min(2),
      destination: z.string().min(2),
      departureDate: z.string().datetime(),
      seatCount: z.number().int().min(1).max(5),
      pricePerSeat: z.number().int().min(0).optional().default(0),
      carType: z.enum(['sedan', 'suv', 'hatchback', 'van', 'other']).optional(),
      carModel: z.string().optional(),
      luggageSpace: z.number().int().min(0).max(5).optional().default(0),
      preferences: z.object({
        gender: z.string().optional(),
        pets: z.boolean().optional(),
        smoke: z.boolean().optional(),
        music: z.string().optional(),
        conversation: z.string().optional(),
      }).optional(),
    })

    const validation = createSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Ошибка валидации' },
        { status: 400 }
      )
    }

    const {
      origin,
      destination,
      departureDate,
      seatCount,
      pricePerSeat,
      carType,
      carModel,
      luggageSpace,
      preferences,
    } = validation.data

    // Get the current user from session
    const user = await prisma.user.findUnique({
      where: { id: (await import('@/auth')).getCurrentUserSession() },
    })

    if (!user || user.role !== 'DRIVER') {
      return NextResponse.json(
        { error: 'Только водители могут создавать поездки' },
        { status: 403 }
      )
    }

    const platformFee = Math.round(pricePerSeat * 0.1) // 10% fee
    const driverEarnings = Math.round(pricePerSeat * 0.9)

    const ride = await prisma.ride.create({
      data: {
        origin,
        destination,
        departureDate: new Date(departureDate),
        seatCount,
        availableSeats: seatCount,
        pricePerSeat: pricePerSeat || 0,
        currency: 'RUB',
        carType,
        carModel,
        luggageSpace,
        preferences,
        platformFee: platformFee,
        driverEarnings: driverEarnings,
        driverId: user.id,
        status: 'PENDING',
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            reputationScore: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      ride: {
        id: ride.id,
        origin: ride.origin,
        destination: ride.destination,
        departureDate: ride.departureDate,
        seatCount: ride.seatCount,
        availableSeats: ride.availableSeats,
        pricePerSeat: ride.pricePerSeat,
        currency: ride.currency,
        carType: ride.carType,
        carModel: ride.carModel,
        luggageSpace: ride.luggageSpace,
        platformFee: ride.platformFee,
        driverEarnings: ride.driverEarnings,
        driver: ride.driver,
        status: ride.status,
        createdAt: ride.createdAt,
      },
    })
  } catch (error) {
    console.error('Create ride error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// GET /api/rides - Search rides
export async function GET(request: NextRequest) {
  const rl = await rateLimit('rides', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const date = searchParams.get('date')
    const seats = searchParams.get('seats')
    const price = searchParams.get('price')
    const query = searchParams.get('query')

    const where: Record<string, unknown> = {
      status: 'PENDING',
    }

    if (from) {
      where.origin = { contains: from, mode: 'insensitive' }
    }
    if (to) {
      where.destination = { contains: to, mode: 'insensitive' }
    }
    if (date) {
      where.departureDate = { gte: new Date(date) }
    }
    if (seats) {
      where.availableSeats = { gte: Number(seats) }
    }
    if (price) {
      where.pricePerSeat = { lte: Number(price) }
    }
    if (query) {
      where.OR = [
        { origin: { contains: query, mode: 'insensitive' } },
        { destination: { contains: query, mode: 'insensitive' } },
      ]
    }

    const rides = await prisma.ride.findMany({
      where,
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            reputationScore: true,
            averageRating: true,
          },
        },
      },
      orderBy: {
        departureDate: 'asc',
      },
    })

    return NextResponse.json({
      rides: rides.map(ride => ({
        id: ride.id,
        origin: ride.origin,
        destination: ride.destination,
        departureDate: ride.departureDate,
        availableSeats: ride.availableSeats,
        seatCount: ride.seatCount,
        pricePerSeat: ride.pricePerSeat,
        currency: ride.currency,
        carType: ride.carType,
        carModel: ride.carModel,
        luggageSpace: ride.luggageSpace,
        platformFee: ride.platformFee,
        driverEarnings: ride.driverEarnings,
        driver: {
          id: ride.driver.id,
          name: ride.driver.name,
          avatarUrl: ride.driver.avatarUrl,
          reputationScore: ride.driver.reputationScore,
          averageRating: ride.driver.averageRating,
        },
        status: ride.status,
        createdAt: ride.createdAt,
        isRoundTrip: ride.isRoundTrip,
      })),
    })
  } catch (error) {
    console.error('Search rides error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 30