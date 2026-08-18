import { prisma } from '@/lib/prisma'
import type { ApiContext } from '@/lib/api-auth'
import { DIM_META, DIM_ORDER, type DimensionMeta } from '@/lib/report/dim-meta'

export { DIM_META, DIM_ORDER }
export type { DimensionMeta }

const GRANULAR_TO_DIM: Record<string, string> = {
  communication: 'communication',
  language: 'communication',
  empathy: 'communication',
  awareness: 'communication',
  emotions: 'communication',
  openness: 'communication',
  extraversion: 'communication',
  conflicts: 'conflicts',
  attack: 'conflicts',
  stonewall: 'conflicts',
  contempt: 'conflicts',
  defensiveness: 'conflicts',
  repair: 'conflicts',
  regulation: 'conflicts',
  saving: 'money',
  goals: 'money',
  transparency: 'money',
  trust: 'trust',
  space: 'trust',
  digital: 'trust',
  support: 'support',
  care: 'support',
  recovery: 'support',
  reaction: 'support',
  anxiety: 'intimacy',
  avoidance: 'intimacy',
  values: 'values',
  conscientiousness: 'values',
  agreeableness: 'values',
  future: 'future',
  neuroticism: 'future',
}

function avg(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

export interface DimResult {
  key: string
  title: string
  emoji: string
  me: number
  partner: number
  align: number
  level: number
  score: number
}

export interface AnalyticsResult {
  compatibility: number | null
  dimensions: DimResult[]
  strengths: Array<{ key: string; title: string; emoji: string; score: number; text: string }>
  weaknesses: Array<{ key: string; title: string; emoji: string; score: number; text: string; reason: 'не совпадаете' | 'навык проседает' }>
  risks: Array<{ key: string; title: string; emoji: string; risk: string; prevention: string }>
  perspectives: string
  partnerPending: boolean
}

function pctFromAnswer(answer: number, reverseScored: boolean): number {
  const value = Math.max(1, Math.min(5, reverseScored ? 6 - answer : answer))
  return ((value - 1) / 4) * 100
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

  const buckets = new Map<string, Map<'me' | 'partner', number[]>>()
  for (const r of responses) {
    const meta = qMeta.get(r.questionId)
    if (!meta || typeof r.answer !== 'number') continue
    const dim = GRANULAR_TO_DIM[meta.dimension] || meta.dimension
    const who: 'me' | 'partner' = r.userId === user.id ? 'me' : 'partner'
    let bucket = buckets.get(dim)
    if (!bucket) {
      bucket = new Map<'me' | 'partner', number[]>()
      buckets.set(dim, bucket)
    }
    const list = bucket.get(who) ?? []
    list.push(pctFromAnswer(r.answer, meta.reverseScored))
    bucket.set(who, list)
  }

  const dimensions: DimResult[] = []
  for (const key of DIM_ORDER) {
    const bucket = buckets.get(key)
    if (!bucket) continue
    const meList = bucket.get('me') ?? []
    const partnerList = bucket.get('partner') ?? []
    if (!meList.length || !partnerList.length) continue

    const me = avg(meList)
    const partner = avg(partnerList)
    const align = 100 - Math.abs(me - partner)
    const level = (me + partner) / 2
    const score = Math.round(0.6 * align + 0.4 * level)
    dimensions.push({ key, title: DIM_META[key].title, emoji: DIM_META[key].emoji, me, partner, align, level, score })
  }

  const partnerPending = Boolean(partner && dimensions.length === 0)

  const byScoreDesc = [...dimensions].sort((a, b) => b.score - a.score)
  const strengths = byScoreDesc
    .filter((d) => d.score >= 70)
    .slice(0, 3)
    .map((d) => ({ key: d.key, title: d.title, emoji: d.emoji, score: d.score, text: DIM_META[d.key].strength }))

  const byScoreAsc = [...dimensions].sort((a, b) => a.score - b.score)
  const weaknesses = byScoreAsc
    .filter((d) => d.score < 60)
    .slice(0, 3)
    .map((d) => ({
      key: d.key,
      title: d.title,
      emoji: d.emoji,
      score: d.score,
      text: DIM_META[d.key].weak,
      reason: d.align < d.level ? ('не совпадаете' as const) : ('навык проседает' as const),
    }))

  const risks = weaknesses
    .slice(0, 2)
    .map((w) => ({ key: w.key, title: w.title, emoji: w.emoji, risk: DIM_META[w.key].risk, prevention: DIM_META[w.key].prevention }))

  const compatibility = dimensions.length ? Math.round(avg(dimensions.map((d) => d.score))) : null

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