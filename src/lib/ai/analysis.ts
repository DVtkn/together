import { prisma } from '@/lib/prisma'
import { getAIResponse } from '@/lib/ai/provider'
import type { ApiContext } from '@/lib/api-auth'
import {
  profileHash,
  analysisPrompt,
  parseAnalysisJSON,
  type CoupleProfile,
  type CoupleAnalysisData,
} from '@/lib/ai/analysis-core'

export type { CoupleProfile, CoupleAnalysisData }

export interface DimensionResult {
  test: string
  axis: string
  dimension: string
  me: number
  partner: number
  score: number
}

export interface RiskMarkerResult {
  text: string
  axis: string
  me: number
  partner: number
}

function avg(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

export async function buildCoupleProfile(ctx: ApiContext): Promise<CoupleProfile> {
  const assessments = await prisma.assessment.findMany({
    where: { isActive: true },
    include: { Question: true },
    orderBy: { order: 'asc' },
  })

  const questionMeta = new Map<
    string,
    { test: string; axis: string; dimension: string; reverseScored: boolean; isRiskMarker: boolean; text: string }
  >()
  for (const a of assessments) {
    for (const q of a.Question) {
      questionMeta.set(q.id, {
        test: a.title,
        axis: a.radarAxis || q.dimension || 'general',
        dimension: q.dimension || 'general',
        reverseScored: q.reverseScored,
        isRiskMarker: q.isRiskMarker,
        text: q.text,
      })
    }
  }

  const responses = await prisma.assessmentResponse.findMany({
    where: { userId: { in: [ctx.user.id, ctx.partner!.id] } },
  })

  const values = new Map<string, Map<'me' | 'partner', number[]>>()
  const risks = new Map<string, Map<'me' | 'partner', number[]>>()

  for (const r of responses) {
    const meta = questionMeta.get(r.questionId)
    if (!meta) continue
    if (typeof r.answer !== 'number') continue
    const value = Math.max(1, Math.min(5, meta.reverseScored ? 6 - r.answer : r.answer))
    const who: 'me' | 'partner' = r.userId === ctx.user.id ? 'me' : 'partner'

    if (meta.isRiskMarker) {
      const map = risks.get(r.questionId) ?? new Map<'me' | 'partner', number[]>()
      const list = map.get(who) ?? []
      list.push(value)
      map.set(who, list)
      risks.set(r.questionId, map)
    }

    const key = `${meta.axis}|${meta.dimension}`
    const map = values.get(key) ?? new Map<'me' | 'partner', number[]>()
    const list = map.get(who) ?? []
    list.push(value)
    map.set(who, list)
    values.set(key, map)
  }

  const dimensions: DimensionResult[] = []
  for (const [key, byWho] of values.entries()) {
    const [axis, dimension] = key.split('|')
    const me = avg(byWho.get('me') || [])
    const partner = avg(byWho.get('partner') || [])
    const score = Math.round((10 - Math.abs(me - partner)) * 10) / 10
    const test = assessments.find((a) => a.Question.some((q) => q.dimension === dimension))?.title || ''
    dimensions.push({
      test,
      axis,
      dimension,
      me: Math.round(me * 10) / 10,
      partner: Math.round(partner * 10) / 10,
      score,
    })
  }

  const riskResults: RiskMarkerResult[] = []
  for (const [questionId, byWho] of risks.entries()) {
    const meta = questionMeta.get(questionId)!
    const me = avg(byWho.get('me') || [])
    const partner = avg(byWho.get('partner') || [])
    const triggered = me >= 4 || partner >= 4
    if (!triggered) continue
    riskResults.push({
      text: meta.text,
      axis: meta.axis,
      me: Math.round(me * 10) / 10,
      partner: Math.round(partner * 10) / 10,
    })
  }

  return { dimensions, risks: riskResults }
}

export async function isCoupleReady(ctx: ApiContext): Promise<boolean> {
  if (!ctx.couple || !ctx.partner) return false
  const assessments = await prisma.assessment.findMany({
    where: { isActive: true },
    include: { Question: { select: { id: true } } },
  })
  const userIds = [ctx.user.id, ctx.partner.id]
  const responses = await prisma.assessmentResponse.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, assessmentId: true },
  })
  for (const a of assessments) {
    const total = a.Question.length
    for (const uid of userIds) {
      const count = responses.filter((r) => r.userId === uid && r.assessmentId === a.id).length
      if (count < total) return false
    }
  }
  return true
}

export async function runCoupleAnalysis(ctx: ApiContext): Promise<{ analysis: CoupleAnalysisData; hash: string; fromCache: boolean; keys: string[] }> {
  const profile = await buildCoupleProfile(ctx)
  const hash = profileHash(profile)

  const existing = await prisma.coupleAnalysis.findFirst({
    where: { coupleId: ctx.couple!.id },
    orderBy: { createdAt: 'desc' },
  })

  if (existing && existing.basedOnHash === hash) {
    return {
      analysis: {
        summary: existing.summary,
        strengths: existing.strengths as Array<{ title: string; text: string }>,
        weaknesses: existing.weaknesses as Array<{ title: string; text: string }>,
        growthPoints: existing.growthPoints as Array<{ title: string; text: string; action: string }>,
        perspectives: existing.perspectives,
        breakupRisks: existing.breakupRisks as Array<{ risk: string; cause: string; prevention: string }>,
      },
      hash,
      fromCache: true,
      keys: existing.basedOn,
    }
  }

  const response = await getAIResponse([{ role: 'user', content: analysisPrompt(profile) }])
  const analysis = parseAnalysisJSON(response.content)

  const basedOnKeys = await prisma.assessment.findMany({
    where: { isActive: true },
    select: { key: true },
  })

  await prisma.coupleAnalysis.create({
    data: {
      id: `an_${Math.random().toString(36).slice(2, 14)}`,
      coupleId: ctx.couple!.id,
      summary: analysis.summary,
      strengths: analysis.strengths as never,
      weaknesses: analysis.weaknesses as never,
      growthPoints: analysis.growthPoints as never,
      perspectives: analysis.perspectives,
      breakupRisks: analysis.breakupRisks as never,
      basedOnHash: hash,
      basedOn: basedOnKeys.map((a) => a.key),
    },
  })

  return { analysis, hash, fromCache: false, keys: basedOnKeys.map((a) => a.key) }
}