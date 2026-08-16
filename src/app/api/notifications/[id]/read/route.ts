import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = await rateLimit('default', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()

  const { id } = await params
  const notification = await prisma.notification.findUnique({ where: { id } })
  if (!notification || notification.userId !== ctx.user.id) {
    return NextResponse.json({ error: 'Уведомление не найдено' }, { status: 404 })
  }

  await prisma.notification.update({ where: { id }, data: { read: true } })
  return NextResponse.json({ ok: true })
}

export const dynamic = 'force-dynamic'