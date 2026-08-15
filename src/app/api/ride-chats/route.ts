import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getCurrentUserSession } from '@/lib/auth-session'
import { z } from 'zod'

// GET /api/ride-chats?id=rideId - Get chat messages for a ride
export async function GET(request: NextRequest) {
  const rl = await rateLimit('ride-chats', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return new NextResponse('Rate limited', { status: 429 })
  }
  
  try {
    const { searchParams } = new URL(request.url)
    const rideId = searchParams.get('id')
    
    if (!rideId) {
      return NextResponse.json({ error: 'Не указан ID поездки' }, { status: 400 })
    }

    // Verify ride exists and user has access
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      select: { driverId: true, status: true },
    })

    if (!ride) {
      return NextResponse.json({ error: 'Поездка не найдена' }, { status: 404 })
    }

    // Get or create chat for this ride
    let rideChat = await prisma.rideChat.findFirst({
      where: { rideId: rideId },
    })

    if (!rideChat) {
      rideChat = await prisma.rideChat.create({
        data: {
          rideId: rideId,
        },
      })
    }

    // Get initial messages
    const messages = await prisma.rideChatMessage.findMany({
      where: { chatId: rideChat.id },
      orderBy: { createdAt: 'asc' },
      take: 50,
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    })

    return NextResponse.json({
      chatId: rideChat.id,
      messages: messages.map((msg: { id: string; senderId: string; text: string; createdAt: Date; sender: { id: string; name: string | null; avatarUrl: string | null } | null }) => ({
        id: msg.id,
        senderId: msg.senderId,
        text: msg.text,
        createdAt: msg.createdAt,
        sender: msg.sender,
      })),
    })
  } catch (error) {
    console.error('Ride chat error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// POST /api/ride-chats?id=rideId - Send a chat message
export async function POST(request: NextRequest) {
  const rl = await rateLimit('ride-chats', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много сообщений. Попробуйте позже.' },
      { status: 429 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const rideId = searchParams.get('id')
    
    if (!rideId) {
      return NextResponse.json({ error: 'Не указан ID поездки' }, { status: 400 })
    }
    
    const body = await request.json()
    const messageSchema = z.object({
      text: z.string().min(1).max(1000),
    })

    const validation = messageSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Ошибка валидации' },
        { status: 400 }
      )
    }

    // Verify user is authenticated
    const session = await getCurrentUserSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    const userId = session.user.id

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      select: { driverId: true, status: true, rideChat: true },
    })

    if (!ride) {
      return NextResponse.json({ error: 'Поездка не найдена' }, { status: 404 })
    }

    // Get or create chat
    let rideChat = ride.rideChat
    if (!rideChat) {
      rideChat = await prisma.rideChat.create({
        data: { rideId: rideId },
      })
    }

    // Create message
    const message = await prisma.rideChatMessage.create({
      data: {
        chatId: rideChat.id,
        senderId: userId,
        text: validation.data.text,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        senderId: message.senderId,
        text: message.text,
        createdAt: message.createdAt,
        sender: message.sender,
      },
    })
  } catch (error) {
    console.error('Send chat message error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
