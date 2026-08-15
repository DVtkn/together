import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

// GET /api/rides/[id] - Get ride detail
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rl = await rateLimit('rides', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  try {
    const { id } = params

    const ride = await prisma.ride.findUnique({
      where: { id },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            reputationScore: true,
            averageRating: true,
            totalRides: true,
            completedRides: true,
          },
        },
        _count: {
          select: {
            rideRequests: true,
          },
        },
      },
    })

    if (!ride) {
      return NextResponse.json(
        { error: 'Поездка не найдена' },
        { status: 404 }
      )
    }

    // Get ride requests for this ride
    const rideRequests = await prisma.rideRequest.findMany({
      where: { rideId: ride.id },
      include: {
        passenger: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    })

    return NextResponse.json({
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
        preferences: ride.preferences,
        isRoundTrip: ride.isRoundTrip,
        status: ride.status,
        platformFee: ride.platformFee,
        driverEarnings: ride.driverEarnings,
        driver: {
          id: ride.driver.id,
          name: ride.driver.name,
          avatarUrl: ride.driver.avatarUrl,
          reputationScore: ride.driver.reputationScore,
          averageRating: ride.driver.averageRating,
          totalRides: ride.driver.totalRides,
          completedRides: ride.driver.completedRides,
        },
        createdAt: ride.createdAt,
        cancelledAt: ride.cancelledAt,
        cancelledReason: ride.cancelledReason,
      },
      requests: rideRequests.map(req => ({
        id: req.id,
        passenger: {
          id: req.passenger.id,
          name: req.passenger.name,
          avatarUrl: req.passenger.avatarUrl,
        },
        status: req.status,
        requestedAt: req.requestedAt,
        meetingPoint: req.meetingPoint,
        meetingNotes: req.meetingNotes,
        amountPaid: req.amountPaid,
        paymentStatus: req.paymentStatus,
      })),
    })
  } catch (error) {
    console.error('Get ride detail error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'