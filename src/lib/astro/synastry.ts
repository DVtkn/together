import { PlanetPositionData } from './ephemeris'

const ASPECTS = [
  { name: 'conjunction', angle: 0, orb: 8, type: 'major', applying: false },
  { name: 'sextile', angle: 60, orb: 6, type: 'major', applying: false },
  { name: 'square', angle: 90, orb: 8, type: 'major', applying: false },
  { name: 'trine', angle: 120, orb: 8, type: 'major', applying: false },
  { name: 'opposition', angle: 180, orb: 8, type: 'major', applying: false },
  { name: 'semi_sextile', angle: 30, orb: 3, type: 'minor', applying: false },
  { name: 'semi_square', angle: 45, orb: 3, type: 'minor', applying: false },
  { name: 'quincunx', angle: 150, orb: 4, type: 'minor', applying: false },
] as const

const ELEMENTS: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
}

const MODALITIES: Record<string, 'cardinal' | 'fixed' | 'mutable'> = {
  Aries: 'cardinal', Cancer: 'cardinal', Libra: 'cardinal', Capricorn: 'cardinal',
  Taurus: 'fixed', Leo: 'fixed', Scorpio: 'fixed', Aquarius: 'fixed',
  Gemini: 'mutable', Virgo: 'mutable', Sagittarius: 'mutable', Pisces: 'mutable',
}

const PLANET_WEIGHTS: Record<string, number> = {
  Sun: 10, Moon: 10, Mercury: 6, Venus: 8, Mars: 8,
  Jupiter: 5, Saturn: 5, Uranus: 3, Neptune: 3, Pluto: 3,
}

interface AspectResult {
  planet1: string
  planet2: string
  aspect: string
  orb: number
  applying: boolean
  interpretation: string
}

interface SynastryResult {
  aspects: AspectResult[]
  elementBalance: Record<'fire' | 'earth' | 'air' | 'water', number>
  modalityBalance: Record<'cardinal' | 'fixed' | 'mutable', number>
  sunMoonAspect: AspectResult | null
  venusMarsAspect: AspectResult | null
  mercuryMercuryAspect: AspectResult | null
  chineseCompatibility: {
    score: number
    description: string
    harmonyElements: string[]
  }
  overallScore: number
  textualSummary: {
    strengths: string[]
    growthAreas: string[]
  }
}

function getLongitude(planet: PlanetPositionData): number {
  const signIndex = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'].indexOf(planet.sign)
  return signIndex * 30 + planet.degree
}

function getAspect(longitude1: number, longitude2: number): { aspect: typeof ASPECTS[number] | null; orb: number } {
  let diff = Math.abs(longitude1 - longitude2)
  if (diff > 180) diff = 360 - diff

  for (const aspect of ASPECTS) {
    if (Math.abs(diff - aspect.angle) <= aspect.orb) {
      return { aspect, orb: Math.abs(diff - aspect.angle) }
    }
  }
  return { aspect: null, orb: 0 }
}

function getInterpretation(planet1: string, planet2: string, aspectName: string): string {
  const key = `${planet1}-${planet2}-${aspectName}`
  const interpretations: Record<string, string> = {
    'Sun-Moon-conjunction': 'Глубокая эмоциональная связь, взаимопонимание без слов',
    'Sun-Moon-trine': 'Естественная гармония, партнёры поддерживают друг друга',
    'Sun-Moon-sextile': 'Приятное дополнение, легко находить общий язык',
    'Sun-Moon-square': 'Напряжение между эго и эмоциями, нужны компромиссы',
    'Sun-Moon-opposition': 'Притяжение противоположностей, зеркальные уроки',
    'Venus-Mars-conjunction': 'Сильное физическое и романтическое притяжение',
    'Venus-Mars-trine': 'Гармоничные сексуальные и романтические отношения',
    'Venus-Mars-sextile': 'Приятная химия, легко выражать любовь',
    'Venus-Mars-square': 'Напряжение в близости, разные темпы и потребности',
    'Venus-Mars-opposition': 'Магнитное притяжение через конфликт, страсть',
    'Mercury-Mercury-conjunction': 'Одинаковый стиль мышления, легкое общение',
    'Mercury-Mercury-trine': 'Плавный диалог, взаимное понимание идей',
    'Mercury-Mercury-sextile': 'Стимулирующий обмен мыслями',
    'Mercury-Mercury-square': 'Разные стили общения, частые недопонимания',
    'Mercury-Mercury-opposition': 'Дополняющие точки зрения, дебаты вместо споров',
  }
  return interpretations[key] || `${planet1} ${aspectName} ${planet2}: аспект требует внимания`
}

function computeChineseCompatibility(animal1: string, element1: string, animal2: string, element2: string) {
  const compatibility: Record<string, Record<string, { score: number; description: string }>> = {
    Rat: { Dragon: { score: 90, description: 'Идеальная пара: общая целеустремлённость' }, Monkey: { score: 85, description: 'Интеллектуальное соперничество' }, Ox: { score: 70, description: 'Стабильность и надёжность' } },
    Ox: { Snake: { score: 90, description: 'Глубокое понимание и поддержка' }, Rooster: { score: 85, description: 'Общие ценности и трудолюбие' }, Rat: { score: 70, description: 'Надёжный союз' } },
    Tiger: { Horse: { score: 90, description: 'Общая энергия и страсть' }, Dog: { score: 85, description: 'Лояльность и защита' }, Pig: { score: 75, description: 'Доброта и щедрость' } },
    Rabbit: { Goat: { score: 90, description: 'Гармония и эстетика' }, Pig: { score: 85, description: 'Уют и забота' }, Dog: { score: 75, description: 'Дружеская поддержка' } },
    Dragon: { Rat: { score: 90, description: 'Мощный союз лидеров' }, Monkey: { score: 85, description: 'Творческое партнёрство' }, Rooster: { score: 70, description: 'Уважение к талантам' } },
    Snake: { Ox: { score: 90, description: 'Стратегическое мышление' }, Rooster: { score: 85, description: 'Эстетика и точность' }, Monkey: { score: 60, description: 'Интригующая динамика' } },
    Horse: { Tiger: { score: 90, description: 'Общая стремление к свободе' }, Dog: { score: 85, description: 'Партнёрство в действиях' }, Goat: { score: 75, description: 'Баланс энергий' } },
    Goat: { Rabbit: { score: 90, description: 'Творческое вдохновение' }, Pig: { score: 85, description: 'Эмоциональная безопасность' }, Horse: { score: 75, description: 'Дополняющие силы' } },
    Monkey: { Rat: { score: 90, description: 'Интеллектуальная искра' }, Dragon: { score: 85, description: 'Амбициозные проекты' }, Snake: { score: 60, description: 'Сложная, но интересная динамика' } },
    Rooster: { Ox: { score: 90, description: 'Общая дисциплина' }, Snake: { score: 85, description: 'Эстетические стандарты' }, Dragon: { score: 70, description: 'Уважение к силе' } },
    Dog: { Tiger: { score: 90, description: 'Лояльность и справедливость' }, Horse: { score: 85, description: 'Совместные приключения' }, Rabbit: { score: 75, description: 'Заботливая дружба' } },
    Pig: { Rabbit: { score: 90, description: 'Гармония и комфорт' }, Goat: { score: 85, description: 'Взаимная забота' }, Tiger: { score: 75, description: 'Защита и поддержка' } },
  }

  const base = compatibility[animal1]?.[animal2] || { score: 50, description: 'Нейтральная совместимость' }
  
  let elementBonus = 0
  const harmonyElements: string[] = []
  if (element1 === element2) {
    elementBonus = 5
    harmonyElements.push(`Одинаковый элемент ${element1}: естественное понимание`)
  } else if (
    (element1 === 'Wood' && element2 === 'Fire') ||
    (element1 === 'Fire' && element2 === 'Earth') ||
    (element1 === 'Earth' && element2 === 'Metal') ||
    (element1 === 'Metal' && element2 === 'Water') ||
    (element1 === 'Water' && element2 === 'Wood')
  ) {
    elementBonus = 10
    harmonyElements.push(`${element1} питает ${element2}: поддерживающая динамика`)
  } else if (
    (element1 === 'Fire' && element2 === 'Water') ||
    (element1 === 'Water' && element2 === 'Fire') ||
    (element1 === 'Wood' && element2 === 'Earth') ||
    (element1 === 'Earth' && element2 === 'Wood') ||
    (element1 === 'Metal' && element2 === 'Fire') ||
    (element1 === 'Fire' && element2 === 'Metal')
  ) {
    elementBonus = -10
    harmonyElements.push(`${element1} и ${element2}: потенциальный конфликт элементов`)
  }

  return {
    score: Math.min(100, Math.max(0, base.score + elementBonus)),
    description: base.description,
    harmonyElements,
  }
}

function calculateElementBalance(positions: PlanetPositionData[]): Record<'fire' | 'earth' | 'air' | 'water', number> {
  const balance: Record<'fire' | 'earth' | 'air' | 'water', number> = { fire: 0, earth: 0, air: 0, water: 0 }
  for (const pos of positions) {
    const element = ELEMENTS[pos.sign]
    const weight = PLANET_WEIGHTS[pos.planet] || 1
    balance[element] += weight
  }
  const total = Object.values(balance).reduce((a, b) => a + b, 0)
  if (total > 0) {
    for (const key of Object.keys(balance) as Array<'fire' | 'earth' | 'air' | 'water'>) {
      balance[key] = Math.round((balance[key] / total) * 100)
    }
  }
  return balance
}

function calculateModalityBalance(positions: PlanetPositionData[]): Record<'cardinal' | 'fixed' | 'mutable', number> {
  const balance: Record<'cardinal' | 'fixed' | 'mutable', number> = { cardinal: 0, fixed: 0, mutable: 0 }
  for (const pos of positions) {
    const modality = MODALITIES[pos.sign]
    const weight = PLANET_WEIGHTS[pos.planet] || 1
    balance[modality] += weight
  }
  const total = Object.values(balance).reduce((a, b) => a + b, 0)
  if (total > 0) {
    for (const key of Object.keys(balance) as Array<'cardinal' | 'fixed' | 'mutable'>) {
      balance[key] = Math.round((balance[key] / total) * 100)
    }
  }
  return balance
}

export function computeSynastry(
  positionsA: PlanetPositionData[],
  positionsB: PlanetPositionData[],
  chineseA: { animal: string; element: string },
  chineseB: { animal: string; element: string }
): SynastryResult {
  const aspects: AspectResult[] = []

  for (const posA of positionsA) {
    for (const posB of positionsB) {
      const lonA = getLongitude(posA)
      const lonB = getLongitude(posB)
      const { aspect, orb } = getAspect(lonA, lonB)

      if (aspect) {
        const applying = posA.retrograde !== posB.retrograde
        aspects.push({
          planet1: posA.planet,
          planet2: posB.planet,
          aspect: aspect.name,
          orb: Math.round(orb * 10) / 10,
          applying,
          interpretation: getInterpretation(posA.planet, posB.planet, aspect.name),
        })
      }
    }
  }

  aspects.sort((a, b) => a.orb - b.orb)

  const elementBalanceA = calculateElementBalance(positionsA)
  const elementBalanceB = calculateElementBalance(positionsB)
  const elementBalance: Record<'fire' | 'earth' | 'air' | 'water', number> = {
    fire: Math.round((elementBalanceA.fire + elementBalanceB.fire) / 2),
    earth: Math.round((elementBalanceA.earth + elementBalanceB.earth) / 2),
    air: Math.round((elementBalanceA.air + elementBalanceB.air) / 2),
    water: Math.round((elementBalanceA.water + elementBalanceB.water) / 2),
  }

  const modalityBalanceA = calculateModalityBalance(positionsA)
  const modalityBalanceB = calculateModalityBalance(positionsB)
  const modalityBalance: Record<'cardinal' | 'fixed' | 'mutable', number> = {
    cardinal: Math.round((modalityBalanceA.cardinal + modalityBalanceB.cardinal) / 2),
    fixed: Math.round((modalityBalanceA.fixed + modalityBalanceB.fixed) / 2),
    mutable: Math.round((modalityBalanceA.mutable + modalityBalanceB.mutable) / 2),
  }

  const sunMoonAspect = aspects.find(a => 
    (a.planet1 === 'Sun' && a.planet2 === 'Moon') || (a.planet1 === 'Moon' && a.planet2 === 'Sun')
  ) || null

  const venusMarsAspect = aspects.find(a =>
    (a.planet1 === 'Venus' && a.planet2 === 'Mars') || (a.planet1 === 'Mars' && a.planet2 === 'Venus')
  ) || null

  const mercuryMercuryAspect = aspects.find(a =>
    a.planet1 === 'Mercury' && a.planet2 === 'Mercury'
  ) || null

  const chineseCompatibility = computeChineseCompatibility(
    chineseA.animal, chineseA.element,
    chineseB.animal, chineseB.element
  )

  const harmoniousAspects = aspects.filter(a => ['trine', 'sextile', 'conjunction'].includes(a.aspect)).length
  const challengingAspects = aspects.filter(a => ['square', 'opposition'].includes(a.aspect)).length
  const totalMajorAspects = aspects.filter(a => ['conjunction', 'sextile', 'square', 'trine', 'opposition'].includes(a.aspect)).length
  
  let overallScore = 50
  if (totalMajorAspects > 0) {
    overallScore = Math.round(50 + (harmoniousAspects - challengingAspects) * 5 + (chineseCompatibility.score - 50) * 0.3)
  }
  overallScore = Math.min(100, Math.max(0, overallScore))

  const strengths: string[] = []
  const growthAreas: string[] = []

  if (sunMoonAspect && ['trine', 'sextile', 'conjunction'].includes(sunMoonAspect.aspect)) {
    strengths.push('Глубокая эмоциональная связь и взаимопонимание (Солнце–Луна)')
  } else if (sunMoonAspect) {
    growthAreas.push('Напряжение между эго и эмоциями требует работы (Солнце–Луна)')
  }

  if (venusMarsAspect && ['trine', 'sextile', 'conjunction'].includes(venusMarsAspect.aspect)) {
    strengths.push('Гармоничные романтические и сексуальные отношения (Венера–Марс)')
  } else if (venusMarsAspect) {
    growthAreas.push('Разные потребности в близости требуют диалога (Венера–Марс)')
  }

  if (mercuryMercuryAspect && ['trine', 'sextile', 'conjunction'].includes(mercuryMercuryAspect.aspect)) {
    strengths.push('Лёгкое и продуктивное общение (Меркурий–Меркурий)')
  } else if (mercuryMercuryAspect) {
    growthAreas.push('Стили общения различаются, практикуйте активное слушание (Меркурий–Меркурий)')
  }

  const harmonious = aspects.filter(a => ['trine', 'sextile'].includes(a.aspect)).slice(0, 3)
  for (const a of harmonious) {
    if (!strengths.some(s => s.includes(a.planet1) && s.includes(a.planet2))) {
      strengths.push(`${a.interpretation} (${a.planet1} ${a.aspect} ${a.planet2})`)
    }
  }

  const challenging = aspects.filter(a => ['square', 'opposition'].includes(a.aspect)).slice(0, 3)
  for (const a of challenging) {
    if (!growthAreas.some(s => s.includes(a.planet1) && s.includes(a.planet2))) {
      growthAreas.push(`${a.interpretation} (${a.planet1} ${a.aspect} ${a.planet2})`)
    }
  }

  if (chineseCompatibility.score >= 80) {
    strengths.push(`Отличная китайская совместимость: ${chineseA.animal} + ${chineseB.animal}`)
  } else if (chineseCompatibility.score < 50) {
    growthAreas.push(`Китайский зодиак указывает на потенциальные вызовы: ${chineseA.animal} + ${chineseB.animal}`)
  }

  return {
    aspects: aspects.slice(0, 20),
    elementBalance,
    modalityBalance,
    sunMoonAspect,
    venusMarsAspect,
    mercuryMercuryAspect,
    chineseCompatibility,
    overallScore,
    textualSummary: {
      strengths: strengths.slice(0, 5),
      growthAreas: growthAreas.slice(0, 5),
    },
  }
}

export { ASPECTS, ELEMENTS, MODALITIES }