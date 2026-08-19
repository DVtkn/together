import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { z } from 'zod'
import { notify, nameOf } from '@/lib/notify'

const actionSchema = z.object({
  action: z.enum(['pick', 'unpick']),
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
    const validation = actionSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Ошибка валидации' }, { status: 422 })
    }

    const craving = await prisma.smallCraving.findUnique({ where: { id } })
    // Захватывать можно только чужую хотелку (партнёра)
    if (!craving || craving.userId === ctx.user.id || craving.userId !== ctx.partner?.id) {
      return NextResponse.json({ error: 'Хотелка не найдена' }, { status: 404 })
    }

    const { action } = validation.data
    const pickedUpByUserId = action === 'pick' ? ctx.user.id : null
    const pickedUpAt = action === 'pick' ? new Date() : null
    const status = action === 'pick' ? 'PICKED_UP' : 'PENDING'

    const updated = await prisma.smallCraving.update({
      where: { id },
      data: { status, pickedUpByUserId, pickedUpAt },
    })

    if (action === 'pick') {
      await notify(
        craving.userId,
        'craving_picked',
        `${nameOf(ctx.user)} принёс: ${craving.item} 🎁`,
        '/dashboard#partner'
      )
    }

    return NextResponse.json({ craving: { id: updated.id, item: updated.item, status: updated.status } })
  } catch (error) {
    console.error('Pick craving error:', error)
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
    const craving = await prisma.smallCraving.findUnique({ where: { id } })
    // Удалять можно только свою хотелку
    if (!craving || craving.userId !== ctx.user.id) {
      return NextResponse.json({ error: 'Хотелка не найдена' }, { status: 404 })
    }

    await prisma.smallCraving.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete craving error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'