import { parseRuDate, toRuDate, relationshipParts, formatTogether } from './dates'

describe('parseRuDate', () => {
  it('parses ДД.ММ.ГГГГ', () => {
    const d = parseRuDate('14.02.2024')
    expect(d).toBeInstanceOf(Date)
    expect(d!.getFullYear()).toBe(2024)
    expect(d!.getMonth()).toBe(1)
    expect(d!.getDate()).toBe(14)
  })

  it('rejects invalid dates and formats', () => {
    expect(parseRuDate('32.01.2024')).toBeNull()
    expect(parseRuDate('14.13.2024')).toBeNull()
    expect(parseRuDate('29.02.2023')).toBeNull()
    expect(parseRuDate('14.02.2024 12:00')).toBeNull()
    expect(parseRuDate('2024-02-14')).toBeNull()
  })

  it('accepts 29.02 in leap years', () => {
    expect(parseRuDate('29.02.2024')).not.toBeNull()
  })

  it('round-trips toRuDate', () => {
    expect(toRuDate('2024-02-14')).toBe('14.02.2024')
    expect(toRuDate(null)).toBe('')
  })
})

describe('relationshipParts', () => {
  it('counts months across month boundaries (14.02 → 14.03 = 1 мес)', () => {
    const parts = relationshipParts(new Date(2024, 1, 14), new Date(2024, 2, 14))
    expect(parts).toEqual({ y: 0, m: 1, d: 0 })
    expect(formatTogether(parts)).toBe('1 мес 0 дн')
  })

  it('counts days when less than a month', () => {
    const parts = relationshipParts(new Date(2024, 1, 14), new Date(2024, 2, 10))
    expect(parts).toEqual({ y: 0, m: 0, d: 25 })
    expect(formatTogether(parts)).toBe('25 дн')
  })

  it('borrows days from the previous month correctly', () => {
    const parts = relationshipParts(new Date(2024, 1, 14), new Date(2024, 2, 13))
    expect(parts).toEqual({ y: 0, m: 0, d: 28 })
  })

  it('handles years with month borrow', () => {
    const parts = relationshipParts(new Date(2024, 10, 20), new Date(2025, 0, 10))
    expect(parts).toEqual({ y: 0, m: 1, d: 21 })
  })

  it('formats years', () => {
    const parts = relationshipParts(new Date(2024, 0, 14), new Date(2025, 2, 28))
    expect(formatTogether(parts)).toBe('1 г 2 мес 14 дн')
  })
})