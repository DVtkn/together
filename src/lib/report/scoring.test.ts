import { buildDimensions, classify, type DimResult } from '@/lib/report/scoring'

const ME = 'me-user'
const PARTNER = 'partner-user'

function meta(dim: string, reverseScored = false) {
  return new Map([[`q_${dim}`, { dimension: dim, reverseScored }]])
}

function dim(
  key: string,
  me: number,
  partner: number,
  align = 100 - Math.abs(me - partner)
): DimResult {
  const level = (me + partner) / 2
  return { key, title: key, emoji: '💬', me, partner, align, level, score: Math.round(0.6 * align + 0.4 * level) }
}

describe('buildDimensions', () => {
  it('scales answers to 0–100 and scores the dimension', () => {
    const res = buildDimensions(
      [
        { userId: ME, questionId: 'q_communication', answer: 5 },
        { userId: PARTNER, questionId: 'q_communication', answer: 5 },
      ],
      meta('communication'),
      ME,
      PARTNER
    )
    expect(res).toHaveLength(1)
    expect(res[0].me).toBe(100)
    expect(res[0].partner).toBe(100)
    expect(res[0].score).toBe(100)
  })

  it('reverse-scores reversed questions', () => {
    const res = buildDimensions(
      [
        { userId: ME, questionId: 'q_communication', answer: 5 },
        { userId: PARTNER, questionId: 'q_communication', answer: 5 },
      ],
      new Map([['q_communication', { dimension: 'communication', reverseScored: true }]]),
      ME,
      PARTNER
    )
    expect(res[0].me).toBe(0)
    expect(res[0].partner).toBe(0)
  })

  it('skips dimensions where one side has no answers', () => {
    const res = buildDimensions(
      [{ userId: ME, questionId: 'q_communication', answer: 5 }],
      meta('communication'),
      ME,
      PARTNER
    )
    expect(res).toHaveLength(0)
  })

  it('maps granular dimensions onto the umbrella dimension', () => {
    const res = buildDimensions(
      [
        { userId: ME, questionId: 'q_language', answer: 5 },
        { userId: PARTNER, questionId: 'q_language', answer: 5 },
      ],
      new Map([['q_language', { dimension: 'language', reverseScored: false }]]),
      ME,
      PARTNER
    )
    expect(res).toHaveLength(1)
    expect(res[0].key).toBe('communication')
  })

  it('ignores responses from users outside the pair', () => {
    const res = buildDimensions(
      [
        { userId: 'stranger', questionId: 'q_communication', answer: 5 },
        { userId: ME, questionId: 'q_communication', answer: 5 },
      ],
      meta('communication'),
      ME,
      PARTNER
    )
    expect(res).toHaveLength(0)
  })
})

describe('classify thresholds (strength ≥ 70, weakness < 60)', () => {
  it('marks score 70 and above as strengths', () => {
    const { strengths, weaknesses } = classify([dim('communication', 80, 80, 100)])
    expect(strengths.map((s) => s.key)).toEqual(['communication'])
    expect(weaknesses).toHaveLength(0)
  })

  it('does not treat score 60 as a weakness', () => {
    const { strengths, weaknesses } = classify([dim('conflicts', 0, 0)])
    expect(strengths).toHaveLength(0)
    expect(weaknesses).toHaveLength(0)
  })

  it('marks score below 60 as a weakness', () => {
    const { weaknesses } = classify([dim('money', 0, 25)])
    expect(weaknesses.map((w) => w.key)).toEqual(['money'])
    expect(weaknesses[0].score).toBeLessThan(60)
  })

  it('labels misaligned pairs as "не совпадаете"', () => {
    const d = dim('trust', 0, 100)
    const { weaknesses } = classify([d])
    expect(weaknesses[0].reason).toBe('не совпадаете')
  })

  it('labels aligned low pairs as "навык проседает"', () => {
    const d = dim('support', 0, 25)
    const { weaknesses } = classify([d])
    expect(weaknesses[0].reason).toBe('навык проседает')
  })

  it('caps strengths and weaknesses at 3 and risks at 2', () => {
    const keys = ['communication', 'conflicts', 'money', 'trust', 'support', 'intimacy', 'values', 'future']
    const high = keys.map((k) => dim(k, 100, 100))
    const { strengths } = classify(high)
    expect(strengths).toHaveLength(3)

    const low = keys.map((k) => dim(k, 0, 100))
    const { weaknesses, risks } = classify(low)
    expect(weaknesses).toHaveLength(3)
    expect(risks).toHaveLength(2)
  })

  it('computes compatibility as rounded average of dimension scores', () => {
    const { compatibility } = classify([dim('communication', 100, 100), dim('money', 0, 25)])
    expect(compatibility).toBe(75)
  })

  it('returns null compatibility for empty dimensions', () => {
    const { compatibility, strengths, weaknesses } = classify([])
    expect(compatibility).toBeNull()
    expect(strengths).toHaveLength(0)
    expect(weaknesses).toHaveLength(0)
  })
})