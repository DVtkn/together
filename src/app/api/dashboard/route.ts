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

    return NextResponse.json({
      user: { name: ctx.user.name, email: ctx.user.email ?? '' },
      couple,
      assessments: assessmentProgress,
      latestReport: latestReport
        ? { radarData: latestReport.radarData, generatedAt: latestReport.generatedAt.toISOString() }
        : null,
      currentPulse,
      activeChallenge,
    })
  } catch (error) {
    console.error('Get dashboard error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'