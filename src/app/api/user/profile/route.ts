import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { z } from 'zod'

const profileUpdateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  dateOfBirth: z.string().optional(),
  cityId: z.string().nullable().optional(),
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

  const city = ctx.user.cityId
    ? await prisma.city.findUnique({ where: { id: ctx.user.cityId } })
    : null

  const partnerName = ctx.partner?.name ?? ctx.partner?.username ?? null

  return NextResponse.json({
    user: {
      id: ctx.user.id,
      username: ctx.user.username,
      name: ctx.user.name,
      email: ctx.user.email,
      dateOfBirth: ctx.user.dateOfBirth?.toISOString() ?? null,
      city: city
        ? { id: city.id, slug: city.slug, name: city.name, emoji: city.emoji }
        : null,
    },
    couple: { partnerName },
  })
}

export async function PUT(request: NextRequest) {
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
    const validation = profileUpdateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Ошибка валидации' }, { status: 400 })
    }

    const data: { name?: string; dateOfBirth?: Date | null; cityId?: string | null } = {}
    if (validation.data.name !== undefined) data.name = validation.data.name
    if (validation.data.dateOfBirth !== undefined) data.dateOfBirth = new Date(validation.data.dateOfBirth)
    if (validation.data.cityId !== undefined) data.cityId = validation.data.cityId

    if (data.cityId) {
      const city = await prisma.city.findUnique({ where: { id: data.cityId } })
      if (!city) {
        return NextResponse.json({ error: 'Город не найден' }, { status: 400 })
      }
    }

    const user = await prisma.user.update({
      where: { id: ctx.user.id },
      data,
    })

    const city = user.cityId
      ? await prisma.city.findUnique({ where: { id: user.cityId } })
      : null

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        dateOfBirth: user.dateOfBirth?.toISOString() ?? null,
        city: city ? { id: city.id, slug: city.slug, name: city.name, emoji: city.emoji } : null,
      },
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'