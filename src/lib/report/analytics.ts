import { prisma } from '@/lib/prisma'
import type { ApiContext } from '@/lib/api-auth'
import { DIM_META, DIM_ORDER, buildDimensions, classify, type DimResult } from '@/lib/report/scoring'

export { DIM_META, DIM_ORDER }
export type { DimResult }

export interface AnalyticsResult {
  compatibility: number | null
  dimensions: DimResult[]
  strengths: Array<{ key: string; title: string; emoji: string; score: number; text: string }>
  weaknesses: Array<{ key: string; title: string; emoji: string; score: number; text: string; reason: 'не совпадаете' | 'навык проседает' }>
  risks: Array<{ key: string; title: string; emoji: string; risk: string; prevention: string }>
  perspectives: string
  partnerPending: boolean
}

export async function buildAnalytics(ctx: ApiContext): Promise<AnalyticsResult> {
  const { user, partner } = ctx
  const userIds = [user.id, ...(partner ? [partner.id] : [])]

  const questions = await prisma.question.findMany()
  const qMeta = new Map<string, { dimension: string; reverseScored: boolean }>()
  for (const q of questions) {
    qMeta.set(q.id, { dimension: q.dimension || 'main', reverseScored: q.reverseScored })
  }

  const responses = await prisma.assessmentResponse.findMany({
    where: { userId: { in: userIds } },
  })

  const dimensions = buildDimensions(
    responses.map((r) => ({ userId: r.userId, questionId: r.questionId, answer: r.answer as number })),
    qMeta,
    user.id,
    partner?.id ?? null
  )

  const partnerPending = Boolean(partner && dimensions.length === 0)

  const { strengths, weaknesses, risks, compatibility } = classify(dimensions)

  const warmthRecent = await prisma.warmthEntry.count({
    where: { coupleId: ctx.couple!.id, createdAt: { gte: new Date(Date.now() - 14 * 86400000) } },
  })
  const moodTrend = warmthRecent > 0 ? 'вы недавно обменивались теплом — это хороший знак' : 'попробуйте добавить тепла в повседневность'

  const perspectives = (() => {
    if (compatibility === null) return 'Ответьте на тесты вместе, чтобы увидеть перспективы.'
    if (compatibility >= 85) {
      return `Совместимость ${compatibility}% — вы редкая пара: почти во всём смотрите в одну сторону. У вас ${strengths.length} ярких сильных сторон. Держите этот темп: ${moodTrend}.`
    }
    if (compatibility >= 70) {
      return `Совместимость ${compatibility}% — у вас крепкая основа и ${strengths.length} сильных стороны. Осталось подтянуть пару зон роста, и союз станет заметно легче. ${strengths.length ? 'Опирайтесь на сильные стороны, когда будете обсуждать разногласия.' : moodTrend}.`
    }
    if (compatibility >= 50) {
      return `Совместимость ${compatibility}% — вы разные, и это не приговор, а задача. Приоритет — обсудить зоны роста, пока они не стали привычкой. ${moodTrend}.`
    }
    return `Совместимость ${compatibility}% — похоже, вы давно не сверяли курсы. Начните с одного разговора о зонах роста: ${moodTrend}.`
  })()

  return {
    compatibility,
    dimensions,
    strengths,
    weaknesses,
    risks,
    perspectives,
    partnerPending,
  }
}