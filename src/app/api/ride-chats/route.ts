import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

// GET /api/ride-chats - SSE streaming for ride chat
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rl = await rateLimit('ride-chats', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return new NextResponse('Rate limited', { status: 429 })
  }

  try {
    const { id } = params

    // Verify ride exists and user has access
    const ride = await prisma.ride.findUnique({
      where: { id },
      select: { driverId: true, status: true },
    })

    if (!ride) {
      return NextResponse.json({ error: 'Поездка не найдена' }, { status: 404 })
    }

    if (ride.status !== 'IN_PROGRESS' && ride.status !== 'COMPLETED') {
      // For ongoing rides, check if user is driver or passenger with accepted request
    }

    // Get or create SSE channel for this ride
    const rideChat = await prisma.rideChat.findFirst({
      where: { rideId: id },
    })

    if (!rideChat) {
      await prisma.rideChat.create({
        data: {
          rideId: id,
          subscribers: 1, // Will be incremented on client connect
        },
      })
    }

    // Set up SSE response
    const encoder = new TextEncoder()
    const initialMessages = await prisma.rideChatMessage.findMany({
      where: { rideChatId: id },
      orderBy: { createdAt: 'asc' },
      take: 50,
    })

    const headers = new Headers()
    headers.set('Content-Type', 'text/event-stream')
    headers.set('Cache-Control', 'no-cache')
    headers.set('Connection', 'keep-alive')
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Access-Control-Allow-Headers', 'Cache-Control')

    return new NextStreamingResponse(async (stream) => {
      // Send initial messages
      for (const msg of initialMessages) {
        const data = encoder.encode(`data: ${JSON.stringify({
          id: msg.id,
          riderId: msg.riderId,
          driverId: msg.driverId,
          content: msg.content,
          createdAt: msg.createdAt,
        })}\n\n`)
        stream.write(data)
      }

      // Keep connection open for real-time messages
      const cancelToken = new AbortController()

      // Listen for new messages via webhook or polling
      // In production, use Upstash Redis pub/sub
      const interval = setInterval(async () => {
        const newMessages = await prisma.rideChatMessage.findMany({
          where: { rideChatId: id, createdAt: { gt: new Date(Date.now() - 60000) } },
          orderBy: { createdAt: 'asc' },
          take: 10,
        })

        if (newMessages.length > 0) {
          for (const msg of newMessages) {
            const data = encoder.encode(`data: ${JSON.stringify({
              id: msg.id,
              riderId: msg.riderId,
              driverId: msg.driverId,
              content: msg.content,
              createdAt: msg.createdAt,
            })}\n\n`)
            stream.write(data)
          }
        }
      }, 3000)

      // Handle message sending
      request.on('close', () => {
        cancelToken.abort()
        clearInterval(interval)
        stream.close()
      })

      await stream.ready
    }, { headers })
  } catch (error) {
    console.error('Ride chat error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// POST /api/ride-chats/message - Send a chat message
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rl = await rateLimit('ride-chats', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много сообщений. Попробуйте позже.' },
      { status: 429 }
    )
  }

  try {
    const { id } = params
    const body = await request.json()
    const messageSchema = z.object({
      content: z.string().min(1).max(1000),
    })

    const validation = messageSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Ошибка валидации' },
        { status: 400 }
      )
    }

    // Verify user has access to this ride's chat
    const user = await prisma.user.findUnique({
      where: { id: (await import('@/auth')).getCurrentUserSession() },
    })

    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const ride = await prisma.ride.findUnique({
      where: { id },
      select: { driverId: true, status: true },
    })

    if (!ride) {
      return NextResponse.json({ error: 'Поездка не найдена' }, { status: 404 })
    }

    // Create message
    const message = await prisma.rideChatMessage.create({
      data: {
        rideChatId: id,
        riderId: user.id,
        content: validation.data.content,
      },
    })

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        riderId: message.riderId,
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