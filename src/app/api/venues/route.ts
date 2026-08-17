import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'

// Города с населением > 100 000
const CITIES_100K = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
  'Нижний Новгород', 'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону',
  'Уфа', 'Красноярск', 'Воронеж', 'Пермь', 'Волгоград',
  'Калининград', 'Кострома', 'Курск', 'Ли bed', 'Магнитогорск',
  'Нальчик', 'Нижний Тагил', 'Норильск', 'Орел', 'Пенза',
  'Первоуральск', 'Пяквит', 'Райчихинск', 'Sarov', 'Смоленск',
  'Ставрополь', 'Тверь', 'Томск', 'Тюмень', 'Ulan-Ude',
  'Хабаровск', 'Чебоксары', 'Эльтист', 'Якутск', 'Янтаруй',
]

function isValidCity(city: string): boolean {
  const normalized = city.toLowerCase().trim()
  return CITIES_100K.some(c => c.toLowerCase() === normalized)
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

  if (!city || !isValidCity(city)) {
    return NextResponse.json(
      { error: 'Укажите корректный город из списка (≥100 тыс. чел.)' },
      { status: 400 }
    )
  }

  // Получаем все venue в городе
  const all = await prisma.communityVenue.findMany({
    where: { cityName: city },
    take: 200,
  })

  // Рейтинговые (≥4.3, топ-7) — фильтруем клиент-side
  const topAll = all
    .filter((v: any) => (v as any).avgRating && (v as any).avgRating >= 4.3)
    .sort((a: any, b: any) => (b as any).avgRating - (a as any).avgRating)
    .slice(0, 7)
    .map(async (v: any) => {
      const stats = await getVenueStats(v.id)
      return formatVenue(v, stats)
    })
  const top = await Promise.all(topAll)

  // Новые без рейтинга (чтобы база росла)
  const fresh = await prisma.communityVenue.findMany({
    where: { cityName: city },
    take: 3,
    orderBy: { createdAt: 'desc' },
  })
  const freshResult = fresh.map((v: any) => ({
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
  const { cityName, dish, name, address, phone, comment } = body

  // Валидации
  if (!isValidCity(cityName)) {
    return NextResponse.json(
      { error: 'Город должен из списка городов ≥100 тыс. чел.' },
      { status: 400 }
    )
  }
  if (name.length < 2) {
    return NextResponse.json({ error: 'Название заведения минимум 2 символа' }, { status: 400 })
  }
  // дубликат (city+dish+name, без учёта регистра) → 409
  const existing = await prisma.communityVenue.findFirst({
    where: { cityName: cityName, dish: dish || '', name: { mode: 'insensitive', equals: name } },
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
      cityName,
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
