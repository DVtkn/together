import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

// POST /api/rides/[id]/request - Request a seat on a ride
export async function POST(
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

    const body = await request.json()
    const requestSchema = z.object({
      meetingPoint: z.string().optional(),
      meetingNotes: z.string().optional(),
    })

    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Ошибка валидации' },
        { status: 400 }
      )
    }

    // Check if ride exists and has available seats
    const ride = await prisma.ride.findUnique({
      where: { id },
      select: { availableSeats, seatCount, driverId, status: true },
    })

    if (!ride) {
      return NextResponse.json(
        { error: 'Поездка не найдена' },
        { status: 404 }
      )
    }

    if (ride.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Эта поездка больше не доступна для бронирования' },
        { status: 400 }
      )
    }

    if (ride.availableSeats <= 0) {
      return NextResponse.json(
        { error: 'На этой поездке нет свободных мест' },
        { status: 400 }
      )
    }

    // Get the current user (passenger)
    const user = await prisma.user.findUnique({
      where: { id: (await import('@/auth')).getCurrentUserSession() },
    })

    if (!user || user.role !== 'PASSENGER') {
      return NextResponse.json(
        { error: 'Только пассажиры могут запрашивать места' },
        { status: 403 }
      )
    }

    // Check if user already requested this ride
    const existingRequest = await prisma.rideRequest.findFirst({
      where: { rideId: id, passengerId: user.id },
    })

    if (existingRequest) {
      return NextResponse.json(
        { error: 'Вы уже запрашивали место на этой поездке' },
        { status: 400 }
      )
    }

    // Create the ride request
    const rideRequest = await prisma.rideRequest.create({
      data: {
        rideId: id,
        passengerId: user.id,
        status: 'PENDING',
        meetingPoint: validation.data.meetingPoint,
        meetingNotes: validation.data.meetingNotes,
      },
      include: {
        passenger: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        ride: {
          select: {
            id: true,
            origin: true,
            destination: true,
            departureDate: true,
            availableSeats: true,
            seatCount: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      rideRequest: {
        id: rideRequest.id,
        status: rideRequest.status,
        meetingPoint: rideRequest.meetingPoint,
        meetingNotes: rideRequest.meetingNotes,
        passenger: {
          id: rideRequest.passenger.id,
          name: rideRequest.passenger.name,
          avatarUrl: rideRequest.passenger.avatarUrl,
        },
        ride: {
          id: rideRequest.ride.id,
          origin: rideRequest.ride.origin,
          destination: rideRequest.ride.destination,
          departureDate: rideRequest.ride.departureDate,
          availableSeats: rideRequest.ride.availableSeats,
          seatCount: rideRequest.ride.seatCount,
        },
      },
    })
  } catch (error) {
    console.error('Create ride request error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'