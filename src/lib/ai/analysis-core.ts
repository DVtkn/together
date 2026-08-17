import { createHash } from 'node:crypto'

export interface CoupleProfile {
  dimensions: Array<{
    test: string
    axis: string
    dimension: string
    me: number
    partner: number
    score: number
  }>
  risks: Array<{ text: string; axis: string; me: number; partner: number }>
}

export interface CoupleAnalysisData {
  summary: string
  strengths: Array<{ title: string; text: string }>
  weaknesses: Array<{ title: string; text: string }>
  growthPoints: Array<{ title: string; text: string; action: string }>
  perspectives: string
  breakupRisks: Array<{ risk: string; cause: string; prevention: string }>
}

export function profileHash(profile: CoupleProfile): string {
  const sorted = {
    dimensions: [...profile.dimensions].sort((a, b) => a.axis.localeCompare(b.axis) || a.dimension.localeCompare(b.dimension)),
    risks: [...profile.risks].sort((a, b) => a.text.localeCompare(b.text)),
  }
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex').slice(0, 32)
}

export function analysisPrompt(profile: CoupleProfile): string {
  const profileJson = JSON.stringify(profile, null, 2)
  return `Ты — семейный психолог приложения для пар Loop.
Даны результаты пары по измерениям (0–10, где 10 — полное совпадение) и risk-маркеры.
Данные: ${profileJson}

Тон: эмпатичный, без оценок и приговоров. Короткие фразы, по делу, без канцелярита и «воды». Не ставь диагнозов.

Верни СТРОГО валидный JSON без markdown:
{
  "summary": "3–4 предложения — общий портрет пары",
  "strengths": [{"title": "коротко", "text": "2–3 предложения, почему это сила и как беречь"}],
  "weaknesses": [{"title": "коротко", "text": "2–3 предложения, без обвинений"}],
  "growthPoints": [{"title": "коротко", "text": "зона роста", "action": "конкретный шаг на эту неделю"}],
  "perspectives": "2–3 предложения — куда может вырасти пара",
  "breakupRisks": [{"risk": "коротко", "cause": "почему может случиться", "prevention": "как предотвратить"}]
}`
}

export function parseAnalysisJSON(content: string): CoupleAnalysisData {
  let text = content.trim()
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) text = fenceMatch[1].trim()
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1)
  }
  let parsed: Partial<CoupleAnalysisData>
  try {
    parsed = JSON.parse(text) as Partial<CoupleAnalysisData>
  } catch {
    parsed = {}
  }
  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary : 'Портрет пары: пока не удалось сформулировать. Попробуйте ещё раз.',
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    growthPoints: Array.isArray(parsed.growthPoints) ? parsed.growthPoints : [],
    perspectives: typeof parsed.perspectives === 'string' ? parsed.perspectives : '',
    breakupRisks: Array.isArray(parsed.breakupRisks) ? parsed.breakupRisks : [],
  }
}