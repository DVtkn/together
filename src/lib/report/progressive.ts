import { prisma } from '@/lib/prisma'
import type { ApiContext } from '@/lib/api-auth'

export const AXES = [
  { key: 'intimacy', axis: 'Близость', tests: ['attachment', 'love_languages'] },
  { key: 'conflict', axis: 'Конфликты', tests: ['gottman_conflict', 'family'] },
  { key: 'values', axis: 'Ценности', tests: ['values'] },
  { key: 'communication', axis: 'Коммуникация', tests: ['gottman_conflict', 'eq', 'big_five'] },
  { key: 'money', axis: 'Деньги', tests: ['finance'] },
  { key: 'future', axis: 'Будущее', tests: ['values'] },
  { key: 'support', axis: 'Поддержка', tests: ['stress'] },
  { key: 'trust', axis: 'Доверие', tests: ['trust'] },
] as const

export interface TestStatus {
  key: string
  title: string
  emoji: string | null
  bothDone: boolean
  score: number | null
}

export interface ProgressiveAxis {
  key: string
  axis: string
  value: number | null
  sourceTests: string[]
}

export interface ProgressiveReport {
  axes: ProgressiveAxis[]
  tests: TestStatus[]
  completedBoth: number
  total: number
  compatibility: number | null
  nextTest: { key: string; title: string; emoji: string | null } | null
}

function avg(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

export async function buildProgressiveReport(ctx: ApiContext): Promise<ProgressiveReport> {
  const { user, partner } = ctx
  const userIds = [user.id, ...(partner ? [partner.id] : [])]

  const assessments = await prisma.assessment.findMany({
    where: { isActive: true },
    include: { Question: true },
    orderBy: { order: 'asc' },
  })

  const responses = await prisma.assessmentResponse.findMany({
    where: { userId: { in: userIds } },
  })

  const questionMeta = new Map<string, { assessmentKey: string; dimension: string; reverseScored: boolean }>()
  for (const a of assessments) {
    for (const q of a.Question) {
      questionMeta.set(q.id, {
        assessmentKey: a.key,
        dimension: q.dimension || 'main',
        reverseScored: q.reverseScored,
      })
    }
  }

  const valuesByKey = new Map<string, Map<string, Map<'me' | 'partner', number[]>>>()
  for (const r of responses) {
    const meta = questionMeta.get(r.questionId)
    if (!meta || typeof r.answer !== 'number') continue
    const value = Math.max(1, Math.min(5, meta.reverseScored ? 6 - r.answer : r.answer))
    const who: 'me' | 'partner' = r.userId === user.id ? 'me' : 'partner'

    let byTest = valuesByKey.get(meta.assessmentKey)
    if (!byTest) {
      byTest = new Map()
      valuesByKey.set(meta.assessmentKey, byTest)
    }
    let byDim = byTest.get(meta.dimension)
    if (!byDim) {
      byDim = new Map<'me' | 'partner', number[]>()
      byTest.set(meta.dimension, byDim)
    }
    const list = byDim.get(who) ?? []
    list.push(value)
    byDim.set(who, list)
  }

  const testStatuses: TestStatus[] = []
  for (const a of assessments) {
    const total = a.Question.length
    const myCount = responses.filter((r) => r.userId === user.id && r.assessmentId === a.id).length
    const partnerCount = partner
      ? responses.filter((r) => r.userId === partner.id && r.assessmentId === a.id).length
      : 0
    const bothDone = myCount >= total && partnerCount >= total

    let score: number | null = null
    if (bothDone && partner) {
      const byTest = valuesByKey.get(a.key)
      const dimScores: number[] = []
      if (byTest) {
        for (const [dim, byWho] of byTest.entries()) {
          const me = avg(byWho.get('me') || [])
          const partnerAvg = avg(byWho.get('partner') || [])
          if (byWho.get('me')?.length && byWho.get('partner')?.length) {
            dimScores.push(10 - Math.abs(me - partnerAvg))
          }
        }
      }
      if (dimScores.length) score = Math.round((avg(dimScores)) * 10) / 10
    }

    testStatuses.push({ key: a.key, title: a.title, emoji: a.emoji, bothDone, score })
  }

  const testByKey = new Map(testStatuses.map((t) => [t.key, t]))

  const axes: ProgressiveAxis[] = AXES.map(({ key, axis, tests }) => {
    const available = tests
      .map((t) => testByKey.get(t))
      .filter((t): t is TestStatus => Boolean(t && t.bothDone && t.score !== null))

    if (!available.length) {
      return { key, axis, value: null, sourceTests: [] }
    }

    const value = Math.round((avg(available.map((t) => t.score as number))) * 10) / 10
    return { key, axis, value, sourceTests: available.map((t) => t.key) }
  })

  const completedBoth = testStatuses.filter((t) => t.bothDone).length
  const values = axes.map((a) => a.value).filter((v): v is number => v !== null)
  const compatibility = values.length ? Math.round((avg(values) / 10) * 100) : null
  const nextTest = testStatuses.find((t) => !t.bothDone) ?? null

  return {
    axes,
    tests: testStatuses,
    completedBoth,
    total: testStatuses.length,
    compatibility,
    nextTest,
  }
}