import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, requireCouple, unauthorized } from '@/lib/api-auth'
import { pulseCheckinSchema } from '@/lib/utils/validation'
import { ensureChallengeForWeek } from '@/lib/challenge'

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
    if (!ctx.couple) {
      return NextResponse.json({ checkins: [] })
    }

    const { weekNumber, year } = getWeekNumber(new Date())
    const checkins = await prisma.pulseCheckin.findMany({
      where: { coupleId: ctx.couple.id },
      orderBy: [{ year: 'asc' }, { weekNumber: 'asc' }],
    })

    // Собираем недели: все уникальные пары (year, weekNumber) от начала до текущей (до 26 недель)
    const weekMap = new Map<string, { year: number; weekNumber: number; user: PulseData | null; partner: PulseData | null }>()
    for (const c of checkins) {
      const key = `${c.year}-${c.weekNumber}`
      if (!weekMap.has(key)) {
        weekMap.set(key, { year: c.year, weekNumber: c.weekNumber, user: null, partner: null })
      }
      const entry = weekMap.get(key)!
      const data = { closeness: c.closeness, conflictResolution: c.conflictResolution, missing: c.missing }
      if (c.userId === ctx.user.id) entry.user = data
      else entry.partner = data
    }

    // Текущая неделя всегда присутствует
    const currentKey = `${year}-${weekNumber}`
    if (!weekMap.has(currentKey)) {
      weekMap.set(currentKey, { year, weekNumber, user: null, partner: null })
    }

    const checkinsList = Array.from(weekMap.values())
      .sort((a, b) => (a.year - b.year) || (a.weekNumber - b.weekNumber))
      .slice(-26)

    return NextResponse.json({ checkins: checkinsList })
  } catch (error) {
    console.error('Get pulse error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

interface PulseData {
  closeness: number
  conflictResolution: number
  missing: string | null
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
  const noCouple = requireCouple(ctx)
  if (noCouple) return noCouple

  try {
    const body = await request.json()
    const validation = pulseCheckinSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Ошибка валидации' }, { status: 422 })
    }

    const { closeness, conflictResolution, missing } = validation.data
    const { weekNumber, year } = getWeekNumber(new Date())

    await prisma.pulseCheckin.upsert({
      where: {
        userId_weekNumber_year: {
          userId: ctx.user.id,
          weekNumber,
          year,
        },
      },
      create: {
        id: `pulse_${Math.random().toString(36).slice(2, 14)}`,
        userId: ctx.user.id,
        coupleId: ctx.couple!.id,
        weekNumber,
        year,
        closeness,
        conflictResolution,
        missing: missing ?? null,
      },
      update: {
        closeness,
        conflictResolution,
        missing: missing ?? null,
      },
    })

    await ensureChallengeForWeek(ctx.couple!, weekNumber, year)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Save pulse error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export function getWeekNumber(date: Date): { weekNumber: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { weekNumber, year: d.getUTCFullYear() }
}

export const dynamic = 'force-dynamic'