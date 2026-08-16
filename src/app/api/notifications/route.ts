import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const rl = await rateLimit('default', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()

  const { searchParams } = new URL(request.url)
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '30', 10) || 30))

  const items = await prisma.notification.findMany({
    where: { userId: ctx.user.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  const unread = await prisma.notification.count({
    where: { userId: ctx.user.id, read: false },
  })

  return NextResponse.json({
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      text: n.text,
      href: n.href,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
    unread,
  })
}

export const dynamic = 'force-dynamic'