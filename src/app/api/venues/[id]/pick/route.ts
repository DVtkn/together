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

  // Помечаем venue как выбранный (пicks+1)
  await prisma.communityVenue.update({
    where: { id: venueId },
    data: { picks: { increment: 1 } },
  })

  return NextResponse.json({ picks: true })
}

export const dynamic = 'force-dynamic'
export const revalidate = 0