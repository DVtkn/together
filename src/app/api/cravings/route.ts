import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { z } from 'zod'

const cravingSchema = z.object({
  item: z.string().min(1).max(200),
})

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

  const [mine, partnerCravings] = await Promise.all([
    prisma.smallCraving.findMany({ where: { userId: ctx.user.id }, orderBy: { createdAt: 'desc' } }),
    ctx.partner
      ? prisma.smallCraving.findMany({ where: { userId: ctx.partner.id }, orderBy: { createdAt: 'desc' } })
      : Promise.resolve([]),
  ])

  const toDto = (c: { id: string; item: string; status: string }) => ({ id: c.id, item: c.item, status: c.status })

  return NextResponse.json({
    cravings: { mine: mine.map(toDto), partner: partnerCravings.map(toDto) },
  })
}

export async function POST(request: NextRequest) {
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
    const body = await request.json()
    const validation = cravingSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Ошибка валидации' }, { status: 400 })
    }

    const craving = await prisma.smallCraving.create({
      data: {
        id: `crv_${Math.random().toString(36).slice(2, 14)}`,
        userId: ctx.user.id,
        item: validation.data.item.trim(),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ craving: { id: craving.id, item: craving.item, status: craving.status } }, { status: 201 })
  } catch (error) {
    console.error('Add craving error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'