import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { assessmentSubmitSchema } from '@/lib/utils/validation'

export async function GET(request: NextRequest) {
  const rl = await rateLimit('assessments', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()

  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  try {
    const assessments = await prisma.assessment.findMany({
      where: { isActive: true },
      include: { Question: true },
      orderBy: { order: 'asc' },
    })

    if (key) {
      const assessment = assessments.find((a) => a.key === key)
      if (!assessment) {
        return NextResponse.json({ error: 'Опросник не найден' }, { status: 404 })
      }

      const responses = await prisma.assessmentResponse.findMany({
        where: { userId: ctx.user.id, assessmentId: assessment.id },
      })

      const responsesMap: Record<string, unknown> = {}
      for (const r of responses) {
        responsesMap[r.questionId] = r.answer
      }

      return NextResponse.json({
        assessment: {
          id: assessment.id,
          key: assessment.key,
          title: assessment.title,
          description: assessment.description,
          questions: assessment.Question.map((q) => ({
            id: q.id,
            order: q.order,
            text: q.text,
            type: q.type,
            options: q.options as string[] | null,
            dimension: q.dimension,
            reverseScored: q.reverseScored,
            visibleToPartner: q.visibleToPartner,
            isRiskMarker: q.isRiskMarker,
          })),
        },
        responses: responsesMap,
        progress: Object.keys(responsesMap).length,
        total: assessment.Question.length,
      })
    }

    const partnerId = ctx.partner?.id

    const userIds = [ctx.user.id, ...(partnerId ? [partnerId] : [])]
    const allResponses = await prisma.assessmentResponse.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, assessmentId: true },
    })

    const progressList = assessments.map((assessment) => {
      const total = assessment.Question.length
      const myCount = allResponses.filter((r) => r.userId === ctx.user.id && r.assessmentId === assessment.id).length
      const partnerCount = partnerId
        ? allResponses.filter((r) => r.userId === partnerId && r.assessmentId === assessment.id).length
        : 0
      const completedByCurrent = myCount >= total
      const completedByPartner = partnerId ? partnerCount >= total : false
      return {
        key: assessment.key,
        completedByCurrent,
        completedByPartner,
        bothCompleted: completedByCurrent && completedByPartner,
        progress: Math.min(myCount, total),
        total,
      }
    })

    return NextResponse.json({ assessments: progressList })
  } catch (error) {
    console.error('Get assessments error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const rl = await rateLimit('assessments', request.headers.get('x-forwarded-for') || 'anon')
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
    const validation = assessmentSubmitSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Ошибка валидации' }, { status: 400 })
    }

    const { assessmentId, answers } = validation.data

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { Question: true },
    })
    if (!assessment) {
      return NextResponse.json({ error: 'Опросник не найден' }, { status: 404 })
    }

    const validQuestionIds = new Set(assessment.Question.map((q) => q.id))
    const upserts = answers
      .filter((a) => validQuestionIds.has(a.questionId))
      .map((a) =>
        prisma.assessmentResponse.upsert({
          where: {
            userId_questionId: {
              userId: ctx.user.id,
              questionId: a.questionId,
            },
          },
          create: {
            id: `ar_${Math.random().toString(36).slice(2, 14)}`,
            userId: ctx.user.id,
            assessmentId,
            questionId: a.questionId,
            answer: a.answer as never,
          },
          update: {
            answer: a.answer as never,
            answeredAt: new Date(),
          },
        })
      )

    await prisma.$transaction(upserts)

    const answered = await prisma.assessmentResponse.count({
      where: { userId: ctx.user.id, assessmentId },
    })

    // Генерация совместного отчёта, если оба партнёра завершили все опросники
    await maybeGenerateReport(ctx)

    return NextResponse.json({ ok: true, progress: answered, total: assessment.Question.length })
  } catch (error) {
    console.error('Save assessments error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

async function maybeGenerateReport(ctx: NonNullable<Awaited<ReturnType<typeof getApiContext>>>) {
  const { user, couple, partner } = ctx
  if (!couple || !partner) return

  const assessments = await prisma.assessment.findMany({
    where: { isActive: true },
    include: { Question: true },
  })

  const userIds = [user.id, partner.id]
  for (const assessment of assessments) {
    const total = assessment.Question.length
    for (const uid of userIds) {
      const count = await prisma.assessmentResponse.count({
        where: { userId: uid, assessmentId: assessment.id },
      })
      if (count < total) return
    }
  }

  const existing = await prisma.coupleReport.findFirst({
    where: { coupleId: couple.id },
  })

  const radar = await computeRadar(couple.id, user.id, partner.id, assessments)
  const report = {
    radarData: radar,
    strongSides: [
      {
        title: 'Вы слышите друг друга',
        description: 'Ваши ответы совпадают в ключевых темах — вы настроены на одну волну.',
        evidence: 'Совпадение по шкале коммуникации и ценностей',
      },
    ],
    growthAreas: [],
    recommendations: [],
    constellationState: { distance: 0.4, sync: 0.7, colorHue: 340, intensity: 0.8 },
  }

  const basedOn = assessments.map((a) => a.id)

  if (existing) {
    await prisma.coupleReport.update({
      where: { id: existing.id },
      data: {
        radarData: radar as never,
        strongSides: report.strongSides as never,
        growthAreas: report.growthAreas as never,
        recommendations: report.recommendations as never,
        constellationState: report.constellationState as never,
        basedOnAssessments: basedOn,
        generatedAt: new Date(),
      },
    })
  } else {
    await prisma.coupleReport.create({
      data: {
        id: `rep_${Math.random().toString(36).slice(2, 14)}`,
        coupleId: couple.id,
        radarData: radar as never,
        strongSides: report.strongSides as never,
        growthAreas: report.growthAreas as never,
        recommendations: report.recommendations as never,
        constellationState: report.constellationState as never,
        basedOnAssessments: basedOn,
      },
    })
  }
}

async function computeRadar(coupleId: string, userId: string, partnerId: string, assessments: Array<{ id: string; Question: Array<{ id: string; text: string; dimension: string | null; reverseScored: boolean }> }>) {
  const axes: Record<string, number[]> = {
    communication: [],
    intimacy: [],
    values: [],
    conflict: [],
    support: [],
    future: [],
  }

  const allQuestions = assessments.flatMap((a) => a.Question)
  const questionAxes = new Map<string, { axis: string; reverseScored: boolean }>()
  for (const q of allQuestions) {
    const axis = mapQuestionToAxis(q)
    questionAxes.set(q.id, { axis, reverseScored: q.reverseScored })
  }

  const responses = await prisma.assessmentResponse.findMany({
    where: { userId: { in: [userId, partnerId] } },
  })

  for (const r of responses) {
    const meta = questionAxes.get(r.questionId)
    if (!meta || !axes[meta.axis]) continue
    let value: number | null = null
    const ans = r.answer
    if (typeof ans === 'number') {
      value = meta.reverseScored ? 6 - ans : ans
      value = Math.max(1, Math.min(5, value))
    }
    if (value !== null) axes[meta.axis].push(value)
  }

  const radarData: Record<string, number> = {}
  for (const [axis, values] of Object.entries(axes)) {
    if (values.length === 0) {
      radarData[axis] = 5
    } else {
      radarData[axis] = Math.round(((values.reduce((a, b) => a + b, 0) / values.length) * 2) * 10) / 10
    }
  }
  return radarData
}

function mapQuestionToAxis(q: { text: string; dimension: string | null }): string {
  const dim = (q.dimension || '').toLowerCase()
  const text = q.text.toLowerCase()
  if (dim.includes('communication') || text.includes('разговор') || text.includes('слуша')) return 'communication'
  if (dim.includes('intimacy') || text.includes('близ') || text.includes('нежн')) return 'intimacy'
  if (dim.includes('value') || text.includes('ценност') || text.includes('семь') || text.includes('деньг')) return 'values'
  if (dim.includes('conflict') || text.includes('ссор') || text.includes('конфликт')) return 'conflict'
  if (dim.includes('support') || text.includes('поддержк')) return 'support'
  return 'future'
}

export const dynamic = 'force-dynamic'