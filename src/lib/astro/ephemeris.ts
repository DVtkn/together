import {
  Body,
  MakeTime,
  AstroTime,
  Ecliptic,
  GeoVector,
  HelioVector,
  SunPosition,
} from 'astronomy-engine'

const PLANETS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'
] as const

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
] as const

type PlanetName = typeof PLANETS[number]
type ZodiacSign = typeof ZODIAC_SIGNS[number]

export interface PlanetPositionData {
  planet: string
  sign: ZodiacSign
  degree: number
  house?: number
  retrograde: boolean
}

export interface AstroProfileData {
  sunSign: ZodiacSign
  moonSign: ZodiacSign
  risingSign?: ZodiacSign
  mercurySign: ZodiacSign
  venusSign: ZodiacSign
  marsSign: ZodiacSign
  jupiterSign: ZodiacSign
  saturnSign: ZodiacSign
  planetPositions: PlanetPositionData[]
}

function longitudeToSign(longitude: number): { sign: ZodiacSign; degree: number } {
  const normalized = ((longitude % 360) + 360) % 360
  const signIndex = Math.floor(normalized / 30)
  const degree = Math.floor(normalized % 30)
  return { sign: ZODIAC_SIGNS[signIndex], degree }
}

function getPlanetBody(planet: PlanetName): Body {
  switch (planet) {
    case 'Sun': return Body.Sun
    case 'Moon': return Body.Moon
    case 'Mercury': return Body.Mercury
    case 'Venus': return Body.Venus
    case 'Mars': return Body.Mars
    case 'Jupiter': return Body.Jupiter
    case 'Saturn': return Body.Saturn
    case 'Uranus': return Body.Uranus
    case 'Neptune': return Body.Neptune
    case 'Pluto': return Body.Pluto
  }
}

function isRetrograde(planet: PlanetName, time: AstroTime): boolean {
  if (planet === 'Sun' || planet === 'Moon') return false
  
  const body = getPlanetBody(planet)
  const pos1 = HelioVector(body, time)
  const pos2 = HelioVector(body, time.AddDays(1))
  
  const lon1 = Math.atan2(pos1.y, pos1.x) * 180 / Math.PI
  const lon2 = Math.atan2(pos2.y, pos2.x) * 180 / Math.PI
  
  let diff = lon2 - lon1
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  
  return diff < 0
}

export function computeNatalChart(dateOfBirth: Date, birthTime?: Date): AstroProfileData {
  const birthTimestamp = birthTime ?? dateOfBirth
  const time = MakeTime(new Date(
    dateOfBirth.getUTCFullYear(),
    dateOfBirth.getUTCMonth(),
    dateOfBirth.getUTCDate(),
    birthTimestamp.getUTCHours(),
    birthTimestamp.getUTCMinutes(),
    birthTimestamp.getUTCSeconds()
  ))

  const planetPositions: PlanetPositionData[] = []

  for (const planet of PLANETS) {
    const body = getPlanetBody(planet)
    let lon: number
    if (body === Body.Sun) {
      lon = SunPosition(time).elon
    } else {
      lon = Ecliptic(GeoVector(body, time, true)).elon
    }
    const { sign, degree } = longitudeToSign(lon)
    const retrograde = isRetrograde(planet, time)

    planetPositions.push({
      planet,
      sign,
      degree,
      retrograde,
    })
  }

  const sunPos = planetPositions.find(p => p.planet === 'Sun')!
  const moonPos = planetPositions.find(p => p.planet === 'Moon')!
  const mercuryPos = planetPositions.find(p => p.planet === 'Mercury')!
  const venusPos = planetPositions.find(p => p.planet === 'Venus')!
  const marsPos = planetPositions.find(p => p.planet === 'Mars')!
  const jupiterPos = planetPositions.find(p => p.planet === 'Jupiter')!
  const saturnPos = planetPositions.find(p => p.planet === 'Saturn')!

  let risingSign: ZodiacSign | undefined
  // PRD FR-ASTRO-005: без точного времени/города — risingSign остаётся null.
  // Расчёт Ascendant по неполным данным не производится (дисклеймер в UI).

  return {
    sunSign: sunPos.sign,
    moonSign: moonPos.sign,
    risingSign,
    mercurySign: mercuryPos.sign,
    venusSign: venusPos.sign,
    marsSign: marsPos.sign,
    jupiterSign: jupiterPos.sign,
    saturnSign: saturnPos.sign,
    planetPositions,
  }
}

export function computePlanetPositions(dateOfBirth: Date, birthTime?: Date): PlanetPositionData[] {
  const chart = computeNatalChart(dateOfBirth, birthTime)
  return chart.planetPositions
}