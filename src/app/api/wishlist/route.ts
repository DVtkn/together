import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { z } from 'zod'

const wishSchema = z.object({
  title: z.string().min(1).max(200),
  link: z.string().max(500).optional(),
  priceRange: z.string().max(100).optional(),
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

  const [mine, partnerWishes] = await Promise.all([
    prisma.wishlistItem.findMany({ where: { userId: ctx.user.id }, orderBy: { createdAt: 'desc' } }),
    ctx.partner
      ? prisma.wishlistItem.findMany({ where: { userId: ctx.partner.id }, orderBy: { createdAt: 'desc' } })
      : Promise.resolve([]),
  ])

  const toDto = (w: { id: string; title: string; link: string | null; status: string; priceRange: string | null }) => ({
    id: w.id,
    title: w.title,
    link: w.link,
    status: w.status,
    priceRange: w.priceRange,
  })

  return NextResponse.json({
    items: { mine: mine.map(toDto), partner: partnerWishes.map(toDto) },
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
    const validation = wishSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Ошибка валидации' }, { status: 422 })
    }

    const wish = await prisma.wishlistItem.create({
      data: {
        id: `wsh_${Math.random().toString(36).slice(2, 14)}`,
        userId: ctx.user.id,
        title: validation.data.title.trim(),
        link: validation.data.link?.trim() || null,
        priceRange: validation.data.priceRange?.trim() || null,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(
      { item: { id: wish.id, title: wish.title, link: wish.link, status: wish.status, priceRange: wish.priceRange } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Add wish error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'