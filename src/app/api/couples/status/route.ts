import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { computeZodiac } from '@/lib/astro/zodiac'
import { computeNatalChart } from '@/lib/astro/ephemeris'
import { computeSynastry } from '@/lib/astro/synastry'
import { buildProgressiveReport } from '@/lib/report/progressive'

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

  const { user, couple, partner } = ctx

  let outgoing = null
  let incoming = null

  const pendingOutgoing = await prisma.coupleLinkRequest.findFirst({
    where: { fromUserId: user.id, status: 'PENDING', expiresAt: { gt: new Date() } },
    include: { User_CoupleLinkRequest_toUserIdToUser: { select: { username: true } } },
    orderBy: { createdAt: 'desc' },
  })
  if (pendingOutgoing) {
    outgoing = { id: pendingOutgoing.id, toUsername: pendingOutgoing.User_CoupleLinkRequest_toUserIdToUser.username }
  }

  const pendingIncoming = await prisma.coupleLinkRequest.findFirst({
    where: { toUserId: user.id, status: 'PENDING', expiresAt: { gt: new Date() } },
    include: { User_CoupleLinkRequest_fromUserIdToUser: { select: { username: true } } },
    orderBy: { createdAt: 'desc' },
  })
  if (pendingIncoming) {
    incoming = { id: pendingIncoming.id, fromUsername: pendingIncoming.User_CoupleLinkRequest_fromUserIdToUser.username }
  }

  const assessments = await prisma.assessment.findMany({
    where: { isActive: true },
    include: { Question: { select: { id: true } } },
    orderBy: { order: 'asc' },
  })

  const partnerId = partner?.id
  const userIds = [user.id, ...(partnerId ? [partnerId] : [])]
  const allResponses = await prisma.assessmentResponse.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, assessmentId: true },
  })

  const assessmentList = assessments.map((assessment) => {
    const total = assessment.Question.length
    const myCount = allResponses.filter((r) => r.userId === user.id && r.assessmentId === assessment.id).length
    const partnerCount = partnerId
      ? allResponses.filter((r) => r.userId === partnerId && r.assessmentId === assessment.id).length
      : 0
    const me = myCount >= total
    const partnerDone = partnerId ? partnerCount >= total : false
    return {
      key: assessment.key,
      title: assessment.title,
      emoji: assessment.emoji,
      me,
      partner: partnerDone,
      both: me && partnerDone,
    }
  })

  let report = null
  let synastry = null

  if (couple) {
    const progressive = await buildProgressiveReport(ctx)
    report = {
      compatibility: progressive.compatibility,
      completedBoth: progressive.completedBoth,
      total: progressive.total,
      openedAxes: progressive.axes.filter((a) => a.value !== null).length,
      axes: progressive.axes.map((a) => ({ key: a.key, name: a.axis, value: a.value })),
    }

    if (partner) {
      const hasBirthDates = Boolean(user.dateOfBirth && partner.dateOfBirth)
      if (hasBirthDates) {
        try {
          const z1 = computeZodiac(user.dateOfBirth as Date)
          const z2 = computeZodiac(partner.dateOfBirth as Date)
          const chart1 = computeNatalChart(user.dateOfBirth as Date)
          const chart2 = computeNatalChart(partner.dateOfBirth as Date)
          const syn = computeSynastry(
            chart1.planetPositions,
            chart2.planetPositions,
            { animal: z1.chineseZodiac, element: z1.chineseElement },
            { animal: z2.chineseZodiac, element: z2.chineseElement }
          )
          synastry = { score: syn.overallScore, hasBirthDates: true }
        } catch {
          synastry = { score: 0, hasBirthDates: true }
        }
      } else {
        synastry = { score: 0, hasBirthDates: false }
      }
    }
  }

  return NextResponse.json({
    couple: couple
      ? {
          id: couple.id,
          status: couple.status,
          partnerName: partner?.name ?? partner?.username ?? null,
        }
      : null,
    outgoing,
    incoming,
    assessments: assessmentList,
    report,
    synastry,
  })
}

export const dynamic = 'force-dynamic'