import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { z } from 'zod'

const flowerSchema = z.object({
  slug: z.string().min(1),
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

  const [flowers, favorites] = await Promise.all([
    prisma.flower.findMany({ orderBy: { order: 'asc' } }),
    prisma.flower.findMany({
      where: { User: { some: { id: ctx.user.id } } },
      select: { slug: true },
    }),
  ])

  const favSlugs = new Set(favorites.map((f) => f.slug))

  return NextResponse.json({
    flowers: flowers.map((f) => ({
      slug: f.slug,
      name: f.name,
      emoji: f.emoji,
      meaning: f.meaning,
      favorite: favSlugs.has(f.slug),
    })),
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
    const validation = flowerSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Ошибка валидации' }, { status: 422 })
    }

    const flower = await prisma.flower.findUnique({ where: { slug: validation.data.slug } })
    if (!flower) {
      return NextResponse.json({ error: 'Цветок не найден' }, { status: 404 })
    }

    // Переключить любимый цветок
    const current = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { Flower: { select: { slug: true } } },
    })
    const alreadyFav = current?.Flower.some((f) => f.slug === flower.slug) ?? false

    if (alreadyFav) {
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { Flower: { disconnect: { slug: flower.slug } } },
      })
      return NextResponse.json({ ok: true, favorite: false })
    } else {
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { Flower: { connect: { slug: flower.slug } } },
      })
      return NextResponse.json({ ok: true, favorite: true })
    }
  } catch (error) {
    console.error('Toggle flower error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'