import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { z } from 'zod'

const moodSchema = z.object({
  emoji: z.string().min(1).max(10),
  text: z.string().max(100).optional(),
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

  const mine = await prisma.moodStatus.findUnique({ where: { userId: ctx.user.id } })
  const partnerMood = ctx.partner
    ? await prisma.moodStatus.findUnique({ where: { userId: ctx.partner.id } })
    : null

  const toDto = (m: { emoji: string; text: string | null } | null) =>
    m ? { emoji: m.emoji, text: m.text } : null

  return NextResponse.json({ mine: toDto(mine), partner: toDto(partnerMood) })
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
    const validation = moodSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Ошибка валидации' }, { status: 400 })
    }

    const { emoji, text } = validation.data

    const mood = await prisma.moodStatus.upsert({
      where: { userId: ctx.user.id },
      create: {
        id: `mood_${Math.random().toString(36).slice(2, 14)}`,
        userId: ctx.user.id,
        emoji,
        text: text ?? null,
        setAt: new Date(),
        updatedAt: new Date(),
      },
      update: {
        emoji,
        text: text ?? null,
        setAt: new Date(),
      },
    })

    return NextResponse.json({ mood: { emoji: mood.emoji, text: mood.text } })
  } catch (error) {
    console.error('Set mood error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'