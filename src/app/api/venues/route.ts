import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { venueCreateSchema } from '@/lib/utils/validation'
import { validationError } from '@/lib/utils/http'

// Города с населением > 100 000
const CITIES_100K = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
  'Нижний Новгород', 'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону',
  'Уфа', 'Красноярск', 'Воронеж', 'Пермь', 'Волгоград',
  'Калининград', 'Кострома', 'Курск', 'Липецк', 'Магнитогорск',
  'Нальчик', 'Нижний Тагил', 'Норильск', 'Орел', 'Пенза',
  'Первоуральск', 'Пятигорск', 'Райчихинск', 'Саров', 'Смоленск',
  'Ставрополь', 'Тверь', 'Томск', 'Тюмень', 'Улан-Удэ',
  'Хабаровск', 'Чебоксары', 'Элиста', 'Якутск', 'Ярославль',
]

function isValidCity(city: string): boolean {
  const normalized = city.toLowerCase().trim()
  return CITIES_100K.some(c => c.toLowerCase() === normalized)
}

function canonicalCity(city: string): string | null {
  const normalized = city.toLowerCase().trim()
  return CITIES_100K.find(c => c.toLowerCase() === normalized) ?? null
}

// Вспомогательная функция расчета статистики
const getVenueStats = async (venueId: string) => {
  const ratings = await prisma.communityVenueRating.findMany({ where: { venueId } })
  return {
    avgRating: ratings.length > 0
      ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
      : null,
    ratingsCount: ratings.length,
  }
}

const formatVenue = (v: any, stats: { avgRating: number | null; ratingsCount: number }) => ({
  id: v.id,
  name: v.name,
  address: v.address,
  phone: v.phone,
  comment: v.comment,
  avgRating: stats.avgRating,
  ratingsCount: stats.ratingsCount,
  picks: v.picks ?? 0,
  addedBy: v.createdBy,
  isNew: v.avgRating == null,
})

// 1) Рейтинговые (≥4.3, топ-7)
export async function GET(request: NextRequest) {
  const rl = await rateLimit('venues', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()

  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city')?.trim()
  const dish = searchParams.get('dish')?.trim().toLowerCase() || ''

  const canonical = city ? canonicalCity(city) : null
  if (!canonical) {
    return NextResponse.json(
      { error: 'Укажите корректный город из списка (≥100 тыс. чел.)' },
      { status: 400 }
    )
  }

  // Получаем все venue в городе
  const all = await prisma.communityVenue.findMany({
    where: { cityName: canonical },
    take: 200,
  })

  // Считаем статистику для каждого (avgRating — вычисляемое поле, не хранится в БД)
  const withStats = await Promise.all(all.map(async (v: any) => {
    const stats = await getVenueStats(v.id)
    return { venue: v, stats }
  }))

  // Рейтинговые (≥4.3, топ-7)
  const top = withStats
    .filter(({ stats }) => stats.avgRating != null && stats.avgRating >= 4.3)
    .sort((a, b) => (b.stats.avgRating ?? 0) - (a.stats.avgRating ?? 0))
    .slice(0, 7)
    .map(({ venue, stats }) => formatVenue(venue, stats))

  // Новые без рейтинга (чтобы база росла)
  const freshVenues = all
    .filter((v: any) => !withStats.find(({ venue }) => venue.id === v.id)?.stats.avgRating)
    .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 3)
  const freshResult = freshVenues.map((v: any) => ({
    id: v.id,
    name: v.name,
    address: v.address,
    phone: v.phone,
    comment: v.comment,
    avgRating: null,
    ratingsCount: 0,
    picks: v.picks ?? 0,
    addedBy: v.createdBy,
    isNew: true,
  }))

  return NextResponse.json({ top, fresh: freshResult })
}

// 2) Создание заведения
export async function POST(request: NextRequest) {
  const rl = await rateLimit('venues', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()

  const body = await request.json()
  const validation = venueCreateSchema.safeParse(body)
  if (!validation.success) {
    return validationError()
  }

  const { cityName, dish, name, address, phone, comment } = validation.data

  // Валидации
  const canonical = canonicalCity(cityName ?? '')
  if (!canonical) {
    return NextResponse.json(
      { error: 'Город должен из списка городов ≥100 тыс. чел.' },
      { status: 400 }
    )
  }
  // дубликат (city+dish+name, без учёта регистра) → 409
  const existing = await prisma.communityVenue.findFirst({
    where: { cityName: canonical, dish: dish || '', name: { mode: 'insensitive', equals: name } },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'Заведение с таким названием уже есть в этом городе по этому блюду. Оцените его или добавьте другое.' },
      { status: 409 }
    )
  }
  // лимит: ≤ 5 добавлений в сутки на пользователя
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const countToday = await prisma.communityVenue.count({
    where: { createdBy: ctx.user.id, createdAt: { gte: today } },
  })
  if (countToday >= 5) {
    return NextResponse.json({ error: 'Лимит добавлений: максимум 5 заведений в сутки' }, { status: 429 })
  }

  const venue = await prisma.communityVenue.create({
    data: {
      cityName: canonical,
      dish,
      name,
      address,
      phone,
      comment,
      createdBy: ctx.user.id,
    },
  })

  return NextResponse.json({ venue }, { status: 201 })
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
