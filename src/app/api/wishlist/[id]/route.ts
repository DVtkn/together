import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { z } from 'zod'

const statusSchema = z.object({
  status: z.enum(['WANTED', 'BOUGHT', 'LATE', 'CANCELED']),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { id } = await params
    const body = await request.json()
    const validation = statusSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Ошибка валидации' }, { status: 400 })
    }

    const wish = await prisma.wishlistItem.findUnique({ where: { id } })
    // Отмечать «подарено» может партнёр; менять статус своей — владелец
    if (!wish || wish.userId === ctx.user.id) {
      if (!wish) return NextResponse.json({ error: 'Желание не найдено' }, { status: 404 })
      return NextResponse.json({ error: 'Отметить «подарено» может партнёр' }, { status: 403 })
    }

    const updated = await prisma.wishlistItem.update({
      where: { id },
      data: { status: validation.data.status },
    })

    return NextResponse.json({
      item: { id: updated.id, title: updated.title, link: updated.link, status: updated.status, priceRange: updated.priceRange },
    })
  } catch (error) {
    console.error('Update wish error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { id } = await params
    const wish = await prisma.wishlistItem.findUnique({ where: { id } })
    if (!wish || wish.userId !== ctx.user.id) {
      return NextResponse.json({ error: 'Желание не найдено' }, { status: 404 })
    }

    await prisma.wishlistItem.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete wish error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'