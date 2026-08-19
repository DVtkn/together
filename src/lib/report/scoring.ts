import { DIM_META, DIM_ORDER } from '@/lib/report/dim-meta'

export { DIM_META, DIM_ORDER }

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

export interface ResponseInput {
  userId: string
  questionId: string
  answer: number
}

export interface QuestionMetaInput {
  dimension: string
  reverseScored: boolean
}

export interface Bucket {
  me: number[]
  partner: number[]
}

function pctFromAnswer(answer: number, reverseScored: boolean): number {
  const value = Math.max(1, Math.min(5, reverseScored ? 6 - answer : answer))
  return ((value - 1) / 4) * 100
}

export function buildDimensions(
  responses: ResponseInput[],
  qMeta: Map<string, QuestionMetaInput>,
  meId: string,
  partnerId: string | null
): DimResult[] {
  const userIds = [meId, ...(partnerId ? [partnerId] : [])]
  const buckets = new Map<string, Bucket>()
  for (const r of responses) {
    if (!userIds.includes(r.userId)) continue
    const meta = qMeta.get(r.questionId)
    if (!meta || typeof r.answer !== 'number') continue
    const dim = GRANULAR_TO_DIM[meta.dimension] || meta.dimension
    const who: keyof Bucket = r.userId === meId ? 'me' : 'partner'
    let bucket = buckets.get(dim)
    if (!bucket) {
      bucket = { me: [], partner: [] }
      buckets.set(dim, bucket)
    }
    bucket[who].push(pctFromAnswer(r.answer, meta.reverseScored))
  }

  const dimensions: DimResult[] = []
  for (const key of DIM_ORDER) {
    const bucket = buckets.get(key)
    if (!bucket) continue
    const meList = bucket.me
    const partnerList = bucket.partner
    if (!meList.length || !partnerList.length) continue

    const me = avg(meList)
    const partner = avg(partnerList)
    const align = 100 - Math.abs(me - partner)
    const level = (me + partner) / 2
    const score = Math.round(0.6 * align + 0.4 * level)
    dimensions.push({ key, title: DIM_META[key].title, emoji: DIM_META[key].emoji, me, partner, align, level, score })
  }
  return dimensions
}

export interface Classification {
  strengths: Array<{ key: string; title: string; emoji: string; score: number; text: string }>
  weaknesses: Array<{ key: string; title: string; emoji: string; score: number; text: string; reason: 'не совпадаете' | 'навык проседает' }>
  risks: Array<{ key: string; title: string; emoji: string; risk: string; prevention: string }>
  compatibility: number | null
}

export function classify(dimensions: DimResult[]): Classification {
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

  return { strengths, weaknesses, risks, compatibility }
}