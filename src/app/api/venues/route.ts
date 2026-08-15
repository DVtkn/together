import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { Prisma } from '@/generated/prisma/client'

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

  try {
    const { searchParams } = new URL(request.url)
    const cityId = searchParams.get('cityId')
    const type = searchParams.get('type')
    const price = searchParams.get('price')
    const query = searchParams.get('query')

    let effectiveCityId: string | null = cityId
    if (!effectiveCityId) {
      effectiveCityId = ctx.user.cityId || null
    }

    if (!effectiveCityId) {
      return NextResponse.json({ venues: [], needsCity: true })
    }

    const where: Prisma.VenueWhereInput = { cityId: effectiveCityId }
    if (type) where.type = type as never
    if (price) {
      const p = Number(price)
      if (Number.isInteger(p) && p >= 1 && p <= 4) where.priceLevel = { lte: p }
    }
    if (query?.trim()) {
      where.name = { contains: query.trim(), mode: 'insensitive' }
    }

    const venues = await prisma.venue.findMany({
      where,
      orderBy: [{ romantic: 'desc' }, { order: 'asc' }],
    })

    return NextResponse.json({ venues, needsCity: false })
  } catch (error) {
    console.error('Get venues error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'