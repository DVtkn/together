import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { getWeekNumber } from '@/app/api/pulse/route'

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
    const assessments = await prisma.assessment.findMany({
      where: { isActive: true },
      include: { Question: true },
      orderBy: { order: 'asc' },
    })

    const userIds = ctx.partner ? [ctx.user.id, ctx.partner.id] : [ctx.user.id]
    const allResponses = await prisma.assessmentResponse.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, assessmentId: true },
    })

    const assessmentProgress = assessments.map((a) => {
      const total = a.Question.length
      const mine = allResponses.filter((r) => r.userId === ctx.user.id && r.assessmentId === a.id).length
      const partnerCount = ctx.partner
        ? allResponses.filter((r) => r.userId === ctx.partner!.id && r.assessmentId === a.id).length
        : 0
      const completedByCurrent = mine >= total
      const completedByPartner = ctx.partner ? partnerCount >= total : false
      return {
        key: a.key,
        title: a.title,
        completedByCurrent,
        completedByPartner,
        bothCompleted: completedByCurrent && completedByPartner,
      }
    })

    const latestReport = ctx.couple
      ? await prisma.coupleReport.findFirst({
          where: { coupleId: ctx.couple.id },
          orderBy: { generatedAt: 'desc' },
          select: { radarData: true, generatedAt: true },
        })
      : null

    let currentPulse: {
      userCloseness: number
      userConflict: number
      partnerCloseness: number | null
      partnerConflict: number | null
    } | null = null

    if (ctx.couple) {
      const { weekNumber, year } = getWeekNumber(new Date())
      const checkins = await prisma.pulseCheckin.findMany({
        where: {
          coupleId: ctx.couple.id,
          weekNumber,
          year,
        },
      })
      const mine = checkins.find((c) => c.userId === ctx.user.id)
      const partnerId = ctx.partner?.id ?? null
      const partnerPulse = partnerId ? checkins.find((c) => c.userId === partnerId) : undefined
      if (mine) {
        currentPulse = {
          userCloseness: mine.closeness,
          userConflict: mine.conflictResolution,
          partnerCloseness: partnerPulse?.closeness ?? null,
          partnerConflict: partnerPulse?.conflictResolution ?? null,
        }
      }
    }

    let activeChallenge: {
      title: string
      description: string
      completedByCurrent: boolean
      completedByPartner: boolean
    } | null = null

    if (ctx.couple) {
      const challenge = await prisma.challenge.findFirst({
        where: { coupleId: ctx.couple.id },
        orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
        include: { ChallengeCompletion: true },
      })
      if (challenge) {
        activeChallenge = {
          title: challenge.title,
          description: challenge.description,
          completedByCurrent: challenge.ChallengeCompletion.some((c) => c.userId === ctx.user.id),
          completedByPartner: ctx.partner
            ? challenge.ChallengeCompletion.some((c) => c.userId === ctx.partner!.id)
            : false,
        }
      }
    }

    const couple = ctx.couple
      ? {
          id: ctx.couple.id,
          status: ctx.couple.status,
          partnerA: { name: ctx.couple.partnerAId === ctx.user.id ? ctx.user.name : (ctx.partner?.name ?? null) },
          partnerB: { name: ctx.couple.partnerBId === ctx.user.id ? ctx.user.name : (ctx.partner?.name ?? null) },
        }
      : null

    // === Прогноз заботы: тренд настроения за 2 дня или пульс ниже среднего за 4 недели ===
    let careForecast: { text: string; cta: string; level: 'soft' | 'alert' } | null = null
    if (ctx.couple) {
      const moods = await prisma.moodEntry.findMany({
        where: { coupleId: ctx.couple.id, createdAt: { gte: new Date(Date.now() - 4 * 7 * 24 * 60 * 60 * 1000) } },
        orderBy: { createdAt: 'asc' },
        select: { userId: true, emoji: true, createdAt: true },
      })
      const MOOD_SCORE: Record<string, number> = { '😄': 5, '🙂': 4, '😐': 3, '🥺': 2, '😰': 2, '😤': 1, '😔': 2, '😫': 1, '🤯': 1, '😢': 1 }
      const myMoods = moods
        .filter((m) => m.userId === ctx.user.id)
        .map((m) => ({ t: m.createdAt.getTime(), s: MOOD_SCORE[m.emoji] ?? 3 }))
      const partnerMoods = ctx.partner
        ? moods
            .filter((m) => m.userId === ctx.partner!.id)
            .map((m) => ({ t: m.createdAt.getTime(), s: MOOD_SCORE[m.emoji] ?? 3 }))
        : []
      const combined = [...myMoods, ...partnerMoods].sort((a, b) => a.t - b.t)
      if (combined.length >= 2) {
        const last = combined[combined.length - 1].t
        const twoDays = 2 * 24 * 60 * 60 * 1000
        const recent = combined.filter((m) => last - m.t <= twoDays)
        const before = combined.filter((m) => last - m.t > twoDays)
        const recentAvg = recent.length ? recent.reduce((s, m) => s + m.s, 0) / recent.length : null
        const beforeAvg = before.length ? before.reduce((s, m) => s + m.s, 0) / before.length : null
        const drop = recentAvg !== null && beforeAvg !== null ? recentAvg - beforeAvg : 0
        if (drop < -0.5) {
          careForecast = {
            text: 'Похоже, неделя тяжёлая: настроение пошло вниз. Не молчите — 20 минут вместе помогут.',
            cta: 'Запланировать 20 минут вместе',
            level: 'alert',
          }
        }
      }
      const pulseChecks = await prisma.pulseCheckin.findMany({
        where: { coupleId: ctx.couple.id },
        select: { userId: true, closeness: true, createdAt: true },
      })
      const partnerPulse = ctx.partner
        ? pulseChecks.filter((p) => p.userId === ctx.partner!.id).map((p) => p.closeness)
        : []
      if (!careForecast && partnerPulse.length >= 3) {
        const avg = partnerPulse.reduce((s, v) => s + v, 0) / partnerPulse.length
        if (partnerPulse[partnerPulse.length - 1] < avg) {
          careForecast = {
            text: 'Партнёр стал(а) чувствовать меньше близости. Поговорите спокойно и без давления.',
            cta: 'Предложить тёплый вечер',
            level: 'soft',
          }
        }
      }
    }

    // === Тихие сигналы ===
    let signals: Array<{ id: string; emoji: string; meaning: string; suggestedReply: string }> = []
    if (ctx.couple) {
      signals = await prisma.signal.findMany({
        where: { coupleId: ctx.couple.id },
        orderBy: { id: 'asc' },
      })
    }

    // === Банк тепла: последние записи ===
    let warmth: Array<{ id: string; text: string; fromName: string; fromId: string; createdAt: string }> = []
    if (ctx.couple) {
      const entries = await prisma.warmthEntry.findMany({
        where: { coupleId: ctx.couple.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { User: { select: { id: true, name: true, username: true } } },
      })
      warmth = entries.map((e) => ({
        id: e.id,
        text: e.text,
        fromName: e.User.name ?? e.User.username ?? 'Партнёр',
        fromId: e.User.id,
        createdAt: e.createdAt.toISOString(),
      }))
    }

    // === Активная пауза (стоп-слово) ===
    let pause: { active: boolean; endsAt: string | null; secondsLeft: number } = { active: false, endsAt: null, secondsLeft: 0 }
    if (ctx.couple) {
      const session = await prisma.pauseSession.findUnique({ where: { coupleId: ctx.couple.id } })
      if (session && session.active) {
        const left = session.endsAt.getTime() - Date.now()
        if (left > 0) {
          pause = { active: true, endsAt: session.endsAt.toISOString(), secondsLeft: Math.floor(left / 1000) }
        } else {
          await prisma.pauseSession.update({ where: { id: session.id }, data: { active: false } })
        }
      }
    }

    return NextResponse.json({
      user: { name: ctx.user.name, email: ctx.user.email ?? '' },
      couple,
      assessments: assessmentProgress,
      latestReport: latestReport
        ? { radarData: latestReport.radarData, generatedAt: latestReport.generatedAt.toISOString() }
        : null,
      currentPulse,
      activeChallenge,
      careForecast,
      signals,
      warmth,
      pause,
    })
  } catch (error) {
    console.error('Get dashboard error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'