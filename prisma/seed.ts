import 'dotenv/config'
import { PrismaClient, Prisma } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { QuestionType, VenueType } from '../src/generated/prisma/enums'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const id = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 14)}`

type QuestionSeed = {
  order: number
  text: string
  type: QuestionType
  options?: string[] | null
  dimension?: string | null
  reverseScored?: boolean
  visibleToPartner?: boolean
  isRiskMarker?: boolean
}

type AssessmentSeed = {
  id: string
  key: string
  title: string
  description: string
  order: number
  questions: QuestionSeed[]
}

const ASSESSMENTS: AssessmentSeed[] = [
  {
    id: 'ass_attachment',
    key: 'attachment',
    title: 'Стиль привязанности',
    description:
      'Оцените, как вы чувствуете себя в близких отношениях. Это поможет понять ваши потребности в близости и автономии.',
    order: 1,
    questions: [
      { order: 1, text: 'Я спокоен(на), когда мой партнёр временно недоступен.', type: QuestionType.LIKERT_1_5, dimension: 'anxiety', reverseScored: true },
      { order: 2, text: 'Я боюсь, что меня могут бросить.', type: QuestionType.LIKERT_1_5, dimension: 'anxiety', isRiskMarker: true },
      { order: 3, text: 'Мне комфортно полагаться на партнёра.', type: QuestionType.LIKERT_1_5, dimension: 'avoidance', reverseScored: true },
      { order: 4, text: 'Мне трудно полностью открываться другому человеку.', type: QuestionType.LIKERT_1_5, dimension: 'avoidance', isRiskMarker: true },
      { order: 5, text: 'Я ищу подтверждения, что меня любят.', type: QuestionType.LIKERT_1_5, dimension: 'anxiety' },
      { order: 6, text: 'Мне нужна свобода даже в близких отношениях.', type: QuestionType.LIKERT_1_5, dimension: 'avoidance' },
      { order: 7, text: 'Я доверяю партнёру и не сомневаюсь в его чувствах.', type: QuestionType.LIKERT_1_5, dimension: 'anxiety', reverseScored: true },
      { order: 8, text: 'Я чувствую близость, даже когда мы на расстоянии.', type: QuestionType.LIKERT_1_5, dimension: 'avoidance', reverseScored: true },
      { order: 9, text: 'Меня тревожит, если партнёр долго не отвечает на сообщения.', type: QuestionType.LIKERT_1_5, dimension: 'anxiety' },
      { order: 10, text: 'Мне проще справляться со стрессом в одиночку.', type: QuestionType.LIKERT_1_5, dimension: 'avoidance' },
    ],
  },
  {
    id: 'ass_love_languages',
    key: 'love_languages',
    title: 'Языки любви',
    description:
      'Определите, как вы чаще всего выражаете и воспринимаете любовь: слова, время, подарки, помощь или прикосновения.',
    order: 2,
    questions: [
      { order: 1, text: 'Что для вас приятнее всего получить от партнёра?', type: QuestionType.SINGLE_CHOICE, options: ['Комплименты и тёплые слова', 'Совместно проведённое время', 'Подарок или сюрприз', 'Помощь в делах', 'Объятия и прикосновения'], dimension: 'language' },
      { order: 2, text: 'Как вы чаще всего проявляете любовь?', type: QuestionType.SINGLE_CHOICE, options: ['Говорю о чувствах', 'Планирую время вместе', 'Дарю приятные мелочи', 'Помогаю по дому и в делах', 'Обнимаю и проявляю нежность'], dimension: 'language' },
      { order: 3, text: 'Что ранит вас сильнее всего?', type: QuestionType.SINGLE_CHOICE, options: ['Критика и грубые слова', 'Постоянная занятость партнёра', 'Забытые даты и обещания', 'Отказ в просьбе о помощи', 'Холодность и дистанция'], dimension: 'language' },
      { order: 4, text: 'Какой вечер кажется вам самым «любящим»?', type: QuestionType.SINGLE_CHOICE, options: ['Долгий разговор по душам', 'Совместная прогулка или фильм', 'Вручение подготовленного подарка', 'Партнёр взял на себя ваши заботы', 'Вечер объятий на диване'], dimension: 'language' },
      { order: 5, text: 'Что для вас значит «уделить внимание»?', type: QuestionType.SINGLE_CHOICE, options: ['Слушать без отвлечений', 'Быть рядом, занимаясь общим делом', 'Отметить важный день подарком', 'Помочь завершить проект', 'Чувствовать его/её рядом'], dimension: 'language' },
      { order: 6, text: 'Какой знак любви запоминается вам дольше всего?', type: QuestionType.SINGLE_CHOICE, options: ['Написанное признание', 'Поездка вдвоём', 'Подарок, о котором я мечтал(а)', 'Неожиданная помощь в трудный день', 'Тёплые объятия без повода'], dimension: 'language' },
      { order: 7, text: 'Выберите фразу, которую приятнее всего услышать:', type: QuestionType.SINGLE_CHOICE, options: ['«Я тебя люблю»', '«Давай проведём выходные вместе»', '«Я тебе это купил(а)»', '«Отдохни, я всё сделаю»', '«Иди ко мне, я рядом»'], dimension: 'language' },
      { order: 8, text: 'Что вам хочется сделать, когда партнёр расстроен?', type: QuestionType.SINGLE_CHOICE, options: ['Найти нужные слова поддержки', 'Побыть рядом и выслушать', 'Сделать маленький подарок', 'Предложить конкретную помощь', 'Обнять и не отпускать'], dimension: 'language' },
    ],
  },
  {
    id: 'ass_gottman_conflict',
    key: 'gottman_conflict',
    title: 'Конфликты и связь (по Готтману)',
    description:
      'Как вы ведёте себя в ссорах и напряжённых разговорах. Помогает выявить «четырёх всадников» и точки напряжения.',
    order: 3,
    questions: [
      { order: 1, text: 'Во время спора я стараюсь услышать партнёра, а не перебивать.', type: QuestionType.LIKERT_1_5, dimension: 'communication', reverseScored: true },
      { order: 2, text: 'Я могу повысить голос, когда мы спорим.', type: QuestionType.LIKERT_1_5, dimension: 'attack' },
      { order: 3, text: 'В ссоре я чаще замыкаюсь в себе и перестаю разговаривать.', type: QuestionType.LIKERT_1_5, dimension: 'stonewall', isRiskMarker: true },
      { order: 4, text: 'Я иногда говорю партнёру колкости или высмеиваю его.', type: QuestionType.LIKERT_1_5, dimension: 'contempt', isRiskMarker: true },
      { order: 5, text: 'Я могу спокойно обсудить, что меня расстроило, без обвинений.', type: QuestionType.LIKERT_1_5, dimension: 'communication', reverseScored: true },
      { order: 6, text: 'После ссоры мы быстро восстанавливаем контакт.', type: QuestionType.LIKERT_1_5, dimension: 'repair', reverseScored: true },
      { order: 7, text: 'Я защищаюсь и объясняю, что я не виноват(а).', type: QuestionType.LIKERT_1_5, dimension: 'defensiveness' },
      { order: 8, text: 'Мы умеем смеяться над собой, когда спорим.', type: QuestionType.LIKERT_1_5, dimension: 'repair', reverseScored: true },
      { order: 9, text: 'Меня ранит критика, и я перестаю участвовать в разговоре.', type: QuestionType.LIKERT_1_5, dimension: 'stonewall' },
      { order: 10, text: 'Я довожу конфликт до конца и мы приходим к решению.', type: QuestionType.LIKERT_1_5, dimension: 'communication', reverseScored: true },
      { order: 11, text: 'Бывает, что я игнорирую просьбы партнёра.', type: QuestionType.LIKERT_1_5, dimension: 'contempt' },
    ],
  },
  {
    id: 'ass_values',
    key: 'values',
    title: 'Ценности пары',
    description:
      'Насколько вы совпадаете по ключевым жизненным ценностям: семья, карьера, финансы, свобода, здоровье и традиции.',
    order: 4,
    questions: [
      { order: 1, text: 'Семья для меня — главный приоритет в жизни.', type: QuestionType.LIKERT_1_5, dimension: 'values' },
      { order: 2, text: 'Карьера и самореализация важнее стабильности.', type: QuestionType.LIKERT_1_5, dimension: 'values', reverseScored: true },
      { order: 3, text: 'Я хочу, чтобы у нас были общие цели в финансах.', type: QuestionType.LIKERT_1_5, dimension: 'values' },
      { order: 4, text: 'Мне важно сохранять личное пространство и свободу.', type: QuestionType.LIKERT_1_5, dimension: 'values' },
      { order: 5, text: 'Здоровый образ жизни — значимая часть наших отношений.', type: QuestionType.LIKERT_1_5, dimension: 'values' },
      { order: 6, text: 'Я считаю важным поддерживать традиции своей семьи.', type: QuestionType.LIKERT_1_5, dimension: 'values' },
      { order: 7, text: 'Я готов(а) переехать ради возможностей партнёра.', type: QuestionType.LIKERT_1_5, dimension: 'future' },
      { order: 8, text: 'Я хочу, чтобы мы вместе планировали крупные покупки.', type: QuestionType.LIKERT_1_5, dimension: 'values' },
      { order: 9, text: 'Мне важно, чтобы партнёр поддерживал мои увлечения.', type: QuestionType.LIKERT_1_5, dimension: 'support' },
      { order: 10, text: 'Наши взгляды на детей совпадают.', type: QuestionType.LIKERT_1_5, dimension: 'future', isRiskMarker: true },
      { order: 11, text: 'Я вижу наше будущее вместе через пять лет.', type: QuestionType.LIKERT_1_5, dimension: 'future', reverseScored: true },
    ],
  },
  {
    id: 'ass_big_five',
    key: 'big_five',
    title: 'Большая пятёрка',
    description:
      'Короткий опросник личности. Помогает увидеть, где вы дополняете друг друга, а где можете конфликтовать.',
    order: 5,
    questions: [
      { order: 1, text: 'Я люблю пробовать новое и менять планы.', type: QuestionType.LIKERT_1_5, dimension: 'openness' },
      { order: 2, text: 'Я аккуратен(на) и довожу начатое до конца.', type: QuestionType.LIKERT_1_5, dimension: 'conscientiousness' },
      { order: 3, text: 'Я заряжаюсь энергией от общения с людьми.', type: QuestionType.LIKERT_1_5, dimension: 'extraversion' },
      { order: 4, text: 'Я стараюсь идти на компромиссы ради мира.', type: QuestionType.LIKERT_1_5, dimension: 'agreeableness' },
      { order: 5, text: 'Я часто тревожусь о том, что будет дальше.', type: QuestionType.LIKERT_1_5, dimension: 'neuroticism', isRiskMarker: true },
      { order: 6, text: 'Мне комфортнее, когда всё идёт по привычному распорядку.', type: QuestionType.LIKERT_1_5, dimension: 'openness', reverseScored: true },
      { order: 7, text: 'Я предпочитаю спонтанность строгому плану.', type: QuestionType.LIKERT_1_5, dimension: 'conscientiousness', reverseScored: true },
      { order: 8, text: 'Я устаю от больших шумных компаний.', type: QuestionType.LIKERT_1_5, dimension: 'extraversion', reverseScored: true },
      { order: 9, text: 'Мне трудно отказывать людям.', type: QuestionType.LIKERT_1_5, dimension: 'agreeableness', reverseScored: true },
      { order: 10, text: 'Я спокоен(на) даже в стрессовых ситуациях.', type: QuestionType.LIKERT_1_5, dimension: 'neuroticism', reverseScored: true },
    ],
  },
]

const FLOWERS = [
  { slug: 'rose', name: 'Роза', latinName: 'Rosa', emoji: '🌹', meaning: 'Любовь и страсть', season: 'лето', hexColor: '#E63946', order: 1 },
  { slug: 'peony', name: 'Пион', latinName: 'Paeonia', emoji: '🌸', meaning: 'Нежность и благополучие', season: 'весна', hexColor: '#F48FB1', order: 2 },
  { slug: 'lily', name: 'Лилия', latinName: 'Lilium', emoji: '🌷', meaning: 'Чистота и преданность', season: 'лето', hexColor: '#FFC2D1', order: 3 },
  { slug: 'tulip', name: 'Тюльпан', latinName: 'Tulipa', emoji: '🌷', meaning: 'Признание в любви', season: 'весна', hexColor: '#E76F51', order: 4 },
  { slug: 'orchid', name: 'Орхидея', latinName: 'Orchidaceae', emoji: '🌺', meaning: 'Красота и совершенство', season: 'круглый год', hexColor: '#9B5DE5', order: 5 },
  { slug: 'sunflower', name: 'Подсолнух', latinName: 'Helianthus', emoji: '🌻', meaning: 'Верность и тепло', season: 'лето', hexColor: '#F9C74F', order: 6 },
  { slug: 'chamomile', name: 'Ромашка', latinName: 'Matricaria', emoji: '🌼', meaning: 'Простота и искренность', season: 'лето', hexColor: '#FFFBEA', order: 7 },
  { slug: 'carnation', name: 'Гвоздика', latinName: 'Dianthus', emoji: '🌸', meaning: 'Восхищение', season: 'лето', hexColor: '#F72585', order: 8 },
  { slug: 'hydrangea', name: 'Гортензия', latinName: 'Hydrangea', emoji: '💐', meaning: 'Благодарность', season: 'лето', hexColor: '#4CC9F0', order: 9 },
  { slug: 'lavender', name: 'Лаванда', latinName: 'Lavandula', emoji: '💜', meaning: 'Спокойствие и преданность', season: 'лето', hexColor: '#B08BBB', order: 10 },
  { slug: 'lotus', name: 'Лотос', latinName: 'Nelumbo', emoji: '🪷', meaning: 'Возрождение и чистота', season: 'лето', hexColor: '#FDE7F1', order: 11 },
  { slug: 'mimosa', name: 'Мимоза', latinName: 'Acacia', emoji: '🌼', meaning: 'Чувствительность и радость', season: 'весна', hexColor: '#F4D03F', order: 12 },
  { slug: 'iris', name: 'Ирис', latinName: 'Iris', emoji: '💠', meaning: 'Надежда и мудрость', season: 'весна', hexColor: '#5A6FE0', order: 13 },
  { slug: 'jasmine', name: 'Жасмин', latinName: 'Jasminum', emoji: '🤍', meaning: 'Грация и чувственность', season: 'лето', hexColor: '#F8F0E3', order: 14 },
  { slug: 'magnolia', name: 'Магнолия', latinName: 'Magnolia', emoji: '🌺', meaning: 'Достоинство и терпение', season: 'весна', hexColor: '#E5C3D1', order: 15 },
  { slug: 'daisy', name: 'Маргаритка', latinName: 'Bellis', emoji: '🌼', meaning: 'Невинность и верность', season: 'лето', hexColor: '#FDF5E6', order: 16 },
  { slug: 'anemone', name: 'Анемона', latinName: 'Anemone', emoji: '🌬️', meaning: 'Ожидание и трепет', season: 'весна', hexColor: '#C77DFF', order: 17 },
  { slug: 'camellia', name: 'Камелия', latinName: 'Camellia', emoji: '🌸', meaning: 'Восхищение и любовь', season: 'зима', hexColor: '#FF477E', order: 18 },
  { slug: 'gardenia', name: 'Гардения', latinName: 'Gardenia', emoji: '🤍', meaning: 'Тайная любовь', season: 'лето', hexColor: '#F5F1E6', order: 19 },
  { slug: 'daffodil', name: 'Нарцисс', latinName: 'Narcissus', emoji: '🌼', meaning: 'Новые начала', season: 'весна', hexColor: '#FFE66D', order: 20 },
  { slug: 'hyacinth', name: 'Гиацинт', latinName: 'Hyacinthus', emoji: '🌷', meaning: 'Искренность чувств', season: 'весна', hexColor: '#7B2CBF', order: 21 },
  { slug: 'gerbera', name: 'Гербера', latinName: 'Gerbera', emoji: '🌼', meaning: 'Радость и оптимизм', season: 'круглый год', hexColor: '#FF9E00', order: 22 },
  { slug: 'protea', name: 'Протея', latinName: 'Protea', emoji: '🌸', meaning: 'Смелость и трансформация', season: 'круглый год', hexColor: '#E56B6F', order: 23 },
  { slug: 'calla', name: 'Калла', latinName: 'Zantedeschia', emoji: '🤍', meaning: 'Безупречная красота', season: 'лето', hexColor: '#F8EDEB', order: 24 },
]

const CITIES = [
  { id: 'city_moscow', slug: 'moscow', name: 'Москва', emoji: '🏙️', timezone: 'Europe/Moscow', lat: 55.7558, lon: 37.6173, order: 1 },
  { id: 'city_spb', slug: 'saint-petersburg', name: 'Санкт-Петербург', emoji: '🌉', timezone: 'Europe/Moscow', lat: 59.9311, lon: 30.3609, order: 2 },
  { id: 'city_kazan', slug: 'kazan', name: 'Казань', emoji: '🕌', timezone: 'Europe/Moscow', lat: 55.7963, lon: 49.1088, order: 3 },
  { id: 'city_sochi', slug: 'sochi', name: 'Сочи', emoji: '🌴', timezone: 'Europe/Moscow', lat: 43.5855, lon: 39.7231, order: 4 },
  { id: 'city_nsk', slug: 'novosibirsk', name: 'Новосибирск', emoji: '🏗️', timezone: 'Asia/Novosibirsk', lat: 55.0302, lon: 82.9204, order: 5 },
  { id: 'city_ekb', slug: 'yekaterinburg', name: 'Екатеринбург', emoji: '⛰️', timezone: 'Asia/Yekaterinburg', lat: 56.8389, lon: 60.6057, order: 6 },
  { id: 'city_kld', slug: 'kaliningrad', name: 'Калининград', emoji: '🌊', timezone: 'Europe/Kaliningrad', lat: 54.7104, lon: 20.4522, order: 7 },
  { id: 'city_nn', slug: 'nizhny-novgorod', name: 'Нижний Новгород', emoji: '🏛️', timezone: 'Europe/Moscow', lat: 56.2965, lon: 43.9361, order: 8 },
]

const VENUES: Array<{
  cityId: string
  type: VenueType
  name: string
  description?: string
  emoji: string
  area?: string
  address?: string
  priceLevel: number
  romantic: boolean
  recommendation?: string
  order: number
}> = [
  // Москва
  { cityId: 'city_moscow', type: VenueType.RESTAURANT, name: 'Мари Vanna', description: 'Домашняя русская кухня с уютным залом и десертами по рецептам бабушки хозяйки.', emoji: '🍽️', area: 'Пресня', address: 'ул. Спиридоновка, 24', priceLevel: 3, romantic: true, recommendation: 'Идеально для спокойного ужина вдвоём с фирменной шарлоткой.', order: 1 },
  { cityId: 'city_moscow', type: VenueType.PARK, name: 'Парк Горького', description: 'Лучшее место для неспешной прогулки, пикника на набережной и вечерней подсветки.', emoji: '🌳', area: 'Якиманка', address: 'Крымский Вал, 9', priceLevel: 1, romantic: true, recommendation: 'Приходите на закате — самый романтичный свет.', order: 2 },
  { cityId: 'city_moscow', type: VenueType.BAR, name: 'Delicatessen', description: 'Бар с авторскими коктейлями и виниловыми пластинками.', emoji: '🍸', area: 'Пресненский', address: 'Садовая-Кудринская, 24а', priceLevel: 3, romantic: false, recommendation: 'Попробуйте их фирменный джин с розмарином.', order: 3 },
  { cityId: 'city_moscow', type: VenueType.WALK, name: 'Набережная Москвы-реки', description: 'Пешеходный маршрут от «Красного Октября» до Патриаршего моста с видами на Кремль.', emoji: '🚶', area: 'Болотный остров', address: 'Болотная набережная', priceLevel: 1, romantic: true, recommendation: 'Самый красивый вид — с Патриаршего моста.', order: 4 },
  { cityId: 'city_moscow', type: VenueType.MUSEUM, name: 'Третьяковская галерея', description: 'Главное собрание русской живописи. Есть ночные экскурсии.', emoji: '🖼️', area: 'Замоскворечье', address: 'Лаврушинский пер., 10', priceLevel: 2, romantic: false, recommendation: 'Ночная экскурсия при свечах — незабываемо.', order: 5 },
  { cityId: 'city_moscow', type: VenueType.CINEMA, name: 'КАРО 11 Октябрь', description: 'Большой кинотеатр с удобными залами для свиданий.', emoji: '🎬', area: 'Краснопресненская', address: 'ул. Новая Арбат, 24', priceLevel: 2, romantic: false, recommendation: 'Зал-лаунж с диванами — отличный вариант для пары.', order: 6 },
  { cityId: 'city_moscow', type: VenueType.CAFE, name: 'Пинч', description: 'Кофейня с идеальным эспрессо и десертами для лёгкого утреннего свидания.', emoji: '☕', area: 'Патриаршие', address: 'М. Бронная, 18', priceLevel: 2, romantic: true, recommendation: 'Приходите на рассвете — город просыпается.', order: 7 },
  { cityId: 'city_moscow', type: VenueType.SPA, name: 'The Saigon Spa', description: 'Спа-комплекс с парными процедурами и хаммамом для пар.', emoji: '💆', area: 'Цветной бульвар', address: 'Цветной б-р, 25', priceLevel: 4, romantic: true, recommendation: 'Забронируйте кабинет с ванной для двоих.', order: 8 },
  // Санкт-Петербург
  { cityId: 'city_spb', type: VenueType.RESTAURANT, name: 'Палкинъ', description: 'Классический петербургский ресторан русской кухни с живой музыкой.', emoji: '🍽️', area: 'Центр', address: 'Невский пр., 47', priceLevel: 3, romantic: true, recommendation: 'Ужин под скрипку в историческом интерьере.', order: 1 },
  { cityId: 'city_spb', type: VenueType.PARK, name: 'Летний сад', description: 'Старейший парк города с фонтанами и тенистыми аллеями.', emoji: '🌳', area: 'Центральный', address: 'Летний сад', priceLevel: 1, romantic: true, recommendation: 'Лучшее место для утренней прогулки и кофе с собой.', order: 2 },
  { cityId: 'city_spb', type: VenueType.WALK, name: 'Крыша «Кузнечный»', description: 'Смотровая площадка с панорамой города и закатными видами.', emoji: '🌇', area: 'Лиговский', address: 'Кузнечный пер., 3', priceLevel: 2, romantic: true, recommendation: 'Лучший закат в городе без толп туристов.', order: 3 },
  { cityId: 'city_spb', type: VenueType.BAR, name: 'Хаски Бар', description: 'Уютный бар с разливными крафтами и живой музыкой.', emoji: '🍺', area: 'Петроградская', address: 'Каменноостровский пр., 32', priceLevel: 2, romantic: false, recommendation: 'По пятницам играют живьём — приходите пораньше.', order: 4 },
  { cityId: 'city_spb', type: VenueType.MUSEUM, name: 'Эрмитаж', description: 'Один из величайших музеев мира. Вечерние экскурсии для двоих.', emoji: '🏛️', area: 'Дворцовая', address: 'Дворцовая пл., 2', priceLevel: 2, romantic: true, recommendation: 'Сходите на ночную экскурсию по парадным залам.', order: 5 },
  { cityId: 'city_spb', type: VenueType.CAFE, name: 'Кофейня «Больше кофе»', description: 'Камерная кофейня с домашней выпечкой у Исаакиевского собора.', emoji: '☕', area: 'Адмиралтейский', address: 'ул. Малая Морская, 11', priceLevel: 1, romantic: true, recommendation: 'Сырники и капучино — то, что нужно для свидания.', order: 6 },
  // Казань
  { cityId: 'city_kazan', type: VenueType.RESTAURANT, name: 'Чирэм', description: 'Современная татарская кухня в историческом особняке.', emoji: '🍽️', area: 'Старо-Татарская слобода', address: 'ул. Нариманова, 15', priceLevel: 3, romantic: true, recommendation: 'Попробуйте эчпочмак и чай с бэлешем.', order: 1 },
  { cityId: 'city_kazan', type: VenueType.PARK, name: 'Кремлёвская набережная', description: 'Пешеходная набережная с видами на Казанский кремль.', emoji: '🏞️', area: 'Кремль', address: 'наб. Кремлёвская', priceLevel: 1, romantic: true, recommendation: 'Гуляйте на закате — виды на кремль волшебные.', order: 2 },
  { cityId: 'city_kazan', type: VenueType.WALK, name: 'Улица Баумана', description: 'Пешеходная улица с кафе, арт-объектами и уличными музыкантами.', emoji: '🚶', area: 'Центр', address: 'ул. Баумана', priceLevel: 1, romantic: false, recommendation: 'Хороша для вечерней прогулки после ужина.', order: 3 },
  // Сочи
  { cityId: 'city_sochi', type: VenueType.RESTAURANT, name: 'Раджа', description: 'Ресторан с видом на море и закатной террасой.', emoji: '🍽️', area: 'Центральный', address: 'Курортный пр., 99', priceLevel: 3, romantic: true, recommendation: 'Бронируйте столик на террасе к закату.', order: 1 },
  { cityId: 'city_sochi', type: VenueType.WALK, name: 'Парк «Ривьера»', description: 'Зелёный парк у моря с аллеями и фонтанами.', emoji: '🌴', area: 'Ривьера', address: 'ул. Егорова, 1', priceLevel: 1, romantic: true, recommendation: 'Прокатитесь на колесе обозрения для двоих.', order: 2 },
  { cityId: 'city_sochi', type: VenueType.SPA, name: 'Морская усадьба', description: 'Спа-центр с бассейнами и массажами на берегу.', emoji: '💆', area: 'Дагомыс', address: 'ул. Батумское шоссе, 34', priceLevel: 4, romantic: true, recommendation: 'Совместный массаж и купель для двоих.', order: 3 },
  // Новосибирск
  { cityId: 'city_nsk', type: VenueType.RESTAURANT, name: 'Порт Артур', description: 'Ресторан дальневосточной и паназиатской кухни с панорамным видом.', emoji: '🍽️', area: 'Левый берег', address: 'ул. Станционная, 60/1', priceLevel: 3, romantic: true, recommendation: 'Закат на Обском море за ужином.', order: 1 },
  { cityId: 'city_nsk', type: VenueType.PARK, name: 'Центральный парк', description: 'Главный парк города с аттракционами и прудами.', emoji: '🎡', area: 'Центр', address: 'ул. Мичурина, 6', priceLevel: 1, romantic: false, recommendation: 'Вечером включается подсветка — романтично.', order: 2 },
  // Екатеринбург
  { cityId: 'city_ekb', type: VenueType.RESTAURANT, name: 'Манилов', description: 'Современный ресторан уральской кухни в доме купца Манилова.', emoji: '🍽️', area: 'Центр', address: 'пр. Ленина, 27', priceLevel: 3, romantic: true, recommendation: 'Фирменные пельмени и настойки на травах.', order: 1 },
  { cityId: 'city_ekb', type: VenueType.WALK, name: 'Плотинка', description: 'Исторический центр города у городского пруда.', emoji: '🚶', area: 'Плотинка', address: 'ул. Горького, 4', priceLevel: 1, romantic: true, recommendation: 'Прогулка по плотине и к «Дому Севастьянова».', order: 2 },
  // Калининград
  { cityId: 'city_kld', type: VenueType.RESTAURANT, name: 'Морская уха', description: 'Ресторан балтийской кухни с видом на реку Преголю.', emoji: '🦪', area: 'Рыбная деревня', address: 'наб. Петра Великого, 4', priceLevel: 2, romantic: true, recommendation: 'Уха из балтийской трески и янтарный лимонад.', order: 1 },
  { cityId: 'city_kld', type: VenueType.WALK, name: 'Куршская коса', description: 'Национальный парк с песчаными дюнами и закатами у моря.', emoji: '🏖️', area: 'Зеленоградский район', address: 'пос. Лесной', priceLevel: 1, romantic: true, recommendation: 'Поднимитесь на дюну Эфа к закату.', order: 2 },
  // Нижний Новгород
  { cityId: 'city_nn', type: VenueType.RESTAURANT, name: 'Библиотека', description: 'Ресторан в старинном особняке с видом на Стрелку.', emoji: '📚', area: 'Верхне-Волжская', address: 'Верхне-Волжская наб., 12', priceLevel: 3, romantic: true, recommendation: 'Ужин с панорамой слияния Оки и Волги.', order: 1 },
  { cityId: 'city_nn', type: VenueType.WALK, name: 'Чкаловская лестница', description: 'Пешеходный спуск к Волге с лучшими видами на город.', emoji: '🌉', area: 'Кремль', address: 'Чкаловская лестница', priceLevel: 1, romantic: true, recommendation: 'Спускайтесь к закату — город открывается красиво.', order: 2 },
]

async function main() {
  console.log('Начинаю сид...')

  for (const assessment of ASSESSMENTS) {
    await prisma.assessment.upsert({
      where: { key: assessment.key },
      update: {
        title: assessment.title,
        description: assessment.description,
        order: assessment.order,
        isActive: true,
      },
      create: {
        id: assessment.id,
        key: assessment.key,
        title: assessment.title,
        description: assessment.description,
        order: assessment.order,
      },
    })

    await prisma.question.deleteMany({ where: { assessmentId: assessment.id } })
    await prisma.question.createMany({
      data: assessment.questions.map((q) => ({
        id: id('q'),
        assessmentId: assessment.id,
        order: q.order,
        text: q.text,
        type: q.type,
        options: q.options ?? Prisma.JsonNull,
        dimension: q.dimension ?? null,
        reverseScored: q.reverseScored ?? false,
        visibleToPartner: q.visibleToPartner ?? true,
        isRiskMarker: q.isRiskMarker ?? false,
      })),
    })

    console.log(`  ✓ Опросник «${assessment.title}» (${assessment.questions.length} вопросов)`)
  }

  for (const flower of FLOWERS) {
    await prisma.flower.upsert({
      where: { slug: flower.slug },
      update: {
        name: flower.name,
        latinName: flower.latinName,
        emoji: flower.emoji,
        meaning: flower.meaning,
        season: flower.season,
        hexColor: flower.hexColor,
        order: flower.order,
      },
      create: {
        ...flower,
        id: id('f'),
      },
    })
  }
  console.log(`  ✓ Цветы (${FLOWERS.length})`)

  for (const city of CITIES) {
    await prisma.city.upsert({
      where: { slug: city.slug },
      update: {
        name: city.name,
        emoji: city.emoji,
        timezone: city.timezone,
        lat: city.lat,
        lon: city.lon,
        order: city.order,
      },
      create: {
        ...city,
      },
    })
  }
  console.log(`  ✓ Города (${CITIES.length})`)

  const venueGroups = new Map<string, typeof VENUES>()
  for (const venue of VENUES) {
    const list = venueGroups.get(venue.cityId) ?? []
    list.push(venue)
    venueGroups.set(venue.cityId, list)
  }
  for (const [cityId, venues] of venueGroups) {
    await prisma.venue.deleteMany({ where: { cityId } })
    await prisma.venue.createMany({
      data: venues.map((v) => ({ id: id('v'), ...v })),
    })
  }
  console.log(`  ✓ Заведения (${VENUES.length})`)

  const counts = {
    assessments: await prisma.assessment.count(),
    questions: await prisma.question.count(),
    flowers: await prisma.flower.count(),
    cities: await prisma.city.count(),
    venues: await prisma.venue.count(),
  }
  console.log('Сид завершён:', counts)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })