import { computeZodiac, getZodiacSignByDate, getChineseZodiacByYear } from '@/lib/astro/zodiac'

describe('computeZodiac', () => {
  it('определяет Овна (21 марта)', () => {
    const r = computeZodiac(new Date(Date.UTC(1990, 2, 21)))
    expect(r.zodiacSign).toBe('Aries')
    expect(r.zodiacSignRu).toBe('Овен')
  })

  it('определяет Тельца (20 апреля)', () => {
    const r = computeZodiac(new Date(Date.UTC(1990, 3, 20)))
    expect(r.zodiacSign).toBe('Taurus')
    expect(r.zodiacSignRu).toBe('Телец')
  })

  it('определяет Козерога (переход через год, 5 января)', () => {
    const r = computeZodiac(new Date(Date.UTC(1991, 0, 5)))
    expect(r.zodiacSign).toBe('Capricorn')
    expect(r.zodiacSignRu).toBe('Козерог')
  })

  it('принимает строку даты', () => {
    const r = computeZodiac('1990-03-21')
    expect(r.zodiacSign).toBe('Aries')
  })
})

describe('getZodiacSignByDate', () => {
  it('Лев: 15 августа', () => {
    expect(getZodiacSignByDate(new Date(Date.UTC(2000, 7, 15)))).toBe('Leo')
  })

  it('Водолей: 10 февраля', () => {
    expect(getZodiacSignByDate(new Date(Date.UTC(2000, 1, 10)))).toBe('Aquarius')
  })
})

describe('getChineseZodiacByYear', () => {
  it('1984 — Крыса (Wood/Дерево)', () => {
    const r = getChineseZodiacByYear(1984)
    expect(r.animal).toBe('Rat')
    expect(r.element).toBe('Wood')
  })

  it('1996 — Крыса (Fire)', () => {
    const r = getChineseZodiacByYear(1996)
    expect(r.animal).toBe('Rat')
    expect(r.element).toBe('Fire')
  })

  it('2000 — Дракон (Metal)', () => {
    const r = getChineseZodiacByYear(2000)
    expect(r.animal).toBe('Dragon')
    expect(r.element).toBe('Metal')
  })

  it('2008 — Крыса (Earth)', () => {
    const r = getChineseZodiacByYear(2008)
    expect(r.animal).toBe('Rat')
    expect(r.element).toBe('Earth')
  })
})