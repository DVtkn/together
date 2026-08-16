import { parseAnalysisJSON, profileHash } from '@/lib/ai/analysis-core'

describe('analysis', () => {
  it('parseAnalysisJSON strips markdown fences', () => {
    const content = '```json\n{"summary":"Вы умеете молчать рядом","strengths":[],"weaknesses":[],"growthPoints":[],"perspectives":"","breakupRisks":[]}\n```'
    const result = parseAnalysisJSON(content)
    expect(result.summary).toBe('Вы умеете молчать рядом')
    expect(result.strengths).toEqual([])
    expect(result.weaknesses).toEqual([])
    expect(result.growthPoints).toEqual([])
    expect(result.breakupRisks).toEqual([])
  })

  it('parseAnalysisJSON trims surrounding text', () => {
    const content = 'Вот результат:\n{"summary":"Ок","strengths":[{"title":"Сила","text":"Берегите"}],"weaknesses":[],"growthPoints":[],"perspectives":"дальше","breakupRisks":[]}\nКонец'
    const result = parseAnalysisJSON(content)
    expect(result.summary).toBe('Ок')
    expect(result.strengths).toEqual([{ title: 'Сила', text: 'Берегите' }])
    expect(result.perspectives).toBe('дальше')
  })

  it('parseAnalysisJSON falls back on invalid input', () => {
    const result = parseAnalysisJSON('просто текст')
    expect(result.summary).toContain('Портрет пары')
    expect(result.strengths).toEqual([])
  })

  it('profileHash is deterministic and order-insensitive', () => {
    const a = {
      dimensions: [
        { test: 'T', axis: 'money', dimension: 'saving', me: 4, partner: 3, score: 9 },
        { test: 'T', axis: 'trust', dimension: 'trust', me: 2, partner: 5, score: 7 },
      ],
      risks: [{ text: 'Риск А', axis: 'money', me: 4, partner: 4 }],
    }
    const b = {
      dimensions: [
        { test: 'T', axis: 'trust', dimension: 'trust', me: 2, partner: 5, score: 7 },
        { test: 'T', axis: 'money', dimension: 'saving', me: 4, partner: 3, score: 9 },
      ],
      risks: [{ text: 'Риск А', axis: 'money', me: 4, partner: 4 }],
    }
    expect(profileHash(a)).toBe(profileHash(b))
    expect(profileHash(a)).toHaveLength(32)
  })

  it('profileHash changes when data changes', () => {
    const a = {
      dimensions: [{ test: 'T', axis: 'money', dimension: 'saving', me: 4, partner: 3, score: 9 }],
      risks: [],
    }
    const b = {
      dimensions: [{ test: 'T', axis: 'money', dimension: 'saving', me: 5, partner: 3, score: 8 }],
      risks: [],
    }
    expect(profileHash(a)).not.toBe(profileHash(b))
  })
})