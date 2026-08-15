const ZODIAC_SIGNS = [
  { sign: 'Aries', startMonth: 3, startDay: 21, endMonth: 4, endDay: 19 },
  { sign: 'Taurus', startMonth: 4, startDay: 20, endMonth: 5, endDay: 20 },
  { sign: 'Gemini', startMonth: 5, startDay: 21, endMonth: 6, endDay: 20 },
  { sign: 'Cancer', startMonth: 6, startDay: 21, endMonth: 7, endDay: 22 },
  { sign: 'Leo', startMonth: 7, startDay: 23, endMonth: 8, endDay: 22 },
  { sign: 'Virgo', startMonth: 8, startDay: 23, endMonth: 9, endDay: 22 },
  { sign: 'Libra', startMonth: 9, startDay: 23, endMonth: 10, endDay: 22 },
  { sign: 'Scorpio', startMonth: 10, startDay: 23, endMonth: 11, endDay: 21 },
  { sign: 'Sagittarius', startMonth: 11, startDay: 22, endMonth: 12, endDay: 21 },
  { sign: 'Capricorn', startMonth: 12, startDay: 22, endMonth: 1, endDay: 19 },
  { sign: 'Aquarius', startMonth: 1, startDay: 20, endMonth: 2, endDay: 18 },
  { sign: 'Pisces', startMonth: 2, startDay: 19, endMonth: 3, endDay: 20 },
]

const CHINESE_ZODIAC = [
  { animal: 'Rat', element: 'Water' },
  { animal: 'Ox', element: 'Earth' },
  { animal: 'Tiger', element: 'Wood' },
  { animal: 'Rabbit', element: 'Wood' },
  { animal: 'Dragon', element: 'Earth' },
  { animal: 'Snake', element: 'Fire' },
  { animal: 'Horse', element: 'Fire' },
  { animal: 'Goat', element: 'Earth' },
  { animal: 'Monkey', element: 'Metal' },
  { animal: 'Rooster', element: 'Metal' },
  { animal: 'Dog', element: 'Earth' },
  { animal: 'Pig', element: 'Water' },
]

const CHINESE_ELEMENTS = ['Wood', 'Fire', 'Earth', 'Metal', 'Water']

function getZodiacSign(date: Date): string {
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()

  for (const zodiac of ZODIAC_SIGNS) {
    if (zodiac.startMonth === zodiac.endMonth) {
      if (month === zodiac.startMonth && day >= zodiac.startDay && day <= zodiac.endDay) {
        return zodiac.sign
      }
    } else if (zodiac.startMonth < zodiac.endMonth) {
      if ((month === zodiac.startMonth && day >= zodiac.startDay) ||
          (month === zodiac.endMonth && day <= zodiac.endDay) ||
          (month > zodiac.startMonth && month < zodiac.endMonth)) {
        return zodiac.sign
      }
    } else {
      if ((month === zodiac.startMonth && day >= zodiac.startDay) ||
          (month === zodiac.endMonth && day <= zodiac.endDay) ||
          month > zodiac.startMonth ||
          month < zodiac.endMonth) {
        return zodiac.sign
      }
    }
  }
  return 'Aries'
}

function getChineseZodiac(year: number): { animal: string; element: string } {
  const baseYear = 1984
  const cyclePosition = ((year - baseYear) % 60 + 60) % 60
  const animalIndex = cyclePosition % 12
  const elementIndex = Math.floor(cyclePosition / 12) % 5

  return {
    animal: CHINESE_ZODIAC[animalIndex].animal,
    element: CHINESE_ELEMENTS[elementIndex],
  }
}

function getZodiacSignRussian(sign: string): string {
  const map: Record<string, string> = {
    Aries: 'Овен',
    Taurus: 'Телец',
    Gemini: 'Близнецы',
    Cancer: 'Рак',
    Leo: 'Лев',
    Virgo: 'Дева',
    Libra: 'Весы',
    Scorpio: 'Скорпион',
    Sagittarius: 'Стрелец',
    Capricorn: 'Козерог',
    Aquarius: 'Водолей',
    Pisces: 'Рыбы',
  }
  return map[sign] || sign
}

function getChineseAnimalRussian(animal: string): string {
  const map: Record<string, string> = {
    Rat: 'Крыса',
    Ox: 'Вол',
    Tiger: 'Тигр',
    Rabbit: 'Кролик',
    Dragon: 'Дракон',
    Snake: 'Змея',
    Horse: 'Лошадь',
    Goat: 'Коза',
    Monkey: 'Обезьяна',
    Rooster: 'Петух',
    Dog: 'Собака',
    Pig: 'Свинья',
  }
  return map[animal] || animal
}

function getChineseElementRussian(element: string): string {
  const map: Record<string, string> = {
    Wood: 'Дерево',
    Fire: 'Огонь',
    Earth: 'Земля',
    Metal: 'Металл',
    Water: 'Вода',
  }
  return map[element] || element
}

export function computeZodiac(dateOfBirth: Date | string): {
  zodiacSign: string
  zodiacSignRu: string
  chineseZodiac: string
  chineseZodiacRu: string
  chineseElement: string
  chineseElementRu: string
} {
  const date = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth
  const zodiacSign = getZodiacSign(date)
  const chinese = getChineseZodiac(date.getUTCFullYear())

  return {
    zodiacSign,
    zodiacSignRu: getZodiacSignRussian(zodiacSign),
    chineseZodiac: chinese.animal,
    chineseZodiacRu: getChineseAnimalRussian(chinese.animal),
    chineseElement: chinese.element,
    chineseElementRu: getChineseElementRussian(chinese.element),
  }
}

export function getZodiacSignByDate(date: Date): string {
  return getZodiacSign(date)
}

export function getChineseZodiacByYear(year: number): { animal: string; element: string } {
  return getChineseZodiac(year)
}

export const zodiacSigns = ZODIAC_SIGNS.map(z => z.sign)
export const chineseAnimals = CHINESE_ZODIAC.map(z => z.animal)
export const chineseElements = CHINESE_ELEMENTS