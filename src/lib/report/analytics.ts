import { prisma } from '@/lib/prisma'
import type { ApiContext } from '@/lib/api-auth'

export interface DimensionMeta {
  key: string
  title: string
  emoji: string
  strength: string
  weak: string
  risk: string
  prevention: string
}

export const DIM_META: Record<string, DimensionMeta> = {
  communication: {
    key: 'communication',
    title: 'Общение',
    emoji: '💬',
    strength: 'Вы умеете говорить друг с другом так, чтобы слышать, а не спорить.',
    weak: 'Разговоры чаще похожи на обмен доводами, чем на диалог: кто-то перебивает или не договаривает.',
    risk: 'Накопленные недоговорённости превращаются в молчаливые обиды, и поводы для ссоры находятся сами собой.',
    prevention: 'Договаривайтесь о «честных 15 минутах» в день: без телефона, по очереди, с правилом «сначала понять, потом отвечать».',
  },
  conflicts: {
    key: 'conflicts',
    title: 'Конфликты',
    emoji: '⚡',
    strength: 'Вы ссоритесь «по-человечески»: без крика, взаимных уколов и замалчивания.',
    weak: 'В споре вы чаще защищаетесь или замыкаетесь, чем ищете решение вместе.',
    risk: 'Повторяющиеся ссоры «по одному сценарию» истощают: критика, оборона, отстранение и презрение съедают близость.',
    prevention: 'Возьмите правило стоп-слова: как только спор переходит в крик или упрёки — пауза на 20 минут, и только потом разговор.',
  },
  money: {
    key: 'money',
    title: 'Деньги',
    emoji: '💰',
    strength: 'Вы прозрачны в финансах и смотрите на траты и накопления в одном направлении.',
    weak: 'Финансовые привычки и цели различаются, а тема денег часто остаётся «неловкой».',
    risk: 'Скрытые траты и разные финансовые цели — одна из главных бомб в паре: накопленная тревога выстреливает в самый неподходящий момент.',
    prevention: 'Раз в неделю 10 минут «финансового свидания»: что купили, что планируем, что напрягает. Без оценок, только информация.',
  },
  trust: {
    key: 'trust',
    title: 'Доверие',
    emoji: '🔐',
    strength: 'Вы спокойно отпускаете друг друга и не проверяете без повода — рядом с вами безопасно.',
    weak: 'Появляется тревога: проверки телефона, вопросы «где ты», желание контролировать время друг друга.',
    risk: 'Недоверие заставляет контролировать, а контроль разрушает то самое доверие, которого не хватает. Замкнутый круг.',
    prevention: 'Говорите о тревоге прямо, вместо проверок: «Мне тревожно, когда ты долго не отвечаешь — давай договоримся о том, как это мягче».',
  },
  support: {
    key: 'support',
    title: 'Поддержка',
    emoji: '🫂',
    strength: 'Вы умеете поддержать друг друга в трудный день — и просить о помощи, когда нужно самим.',
    weak: 'В стрессе вы чаще замыкаетесь или ждёте, что партнёр сам догадается, чего вам хочется.',
    risk: 'Непрочитанные потребности копятся: один устаёт «поддерживать вслепую», второй чувствует себя одиноким в стрессе.',
    prevention: 'Скажите вслух свою «инструкцию»: «когда мне плохо, мне помогает вот это — побыть одному / чтобы ты обнял / поговорить».',
  },
  intimacy: {
    key: 'intimacy',
    title: 'Близость',
    emoji: '💞',
    strength: 'Вам комфортно быть близкими, не растворяясь друг в друге, — есть и глубина, и воздух.',
    weak: 'Кто-то из вас тянется к сближению, а кто-то держит дистанцию — и это легко читается как «ты меня не любишь».',
    risk: 'Цикл «преследователь-отстраняющийся»: один просит больше близости, второй уходит, первый просит ещё громче.',
    prevention: 'Не путайте потребность в пространстве с холодностью. Обсудите: сколько близости вам нужно, а сколько воздуха — и найдите свою «дозу».',
  },
  values: {
    key: 'values',
    title: 'Ценности',
    emoji: '💎',
    strength: 'Вы смотрите на жизнь, семью и приоритеты в одном направлении — это прочный фундамент.',
    weak: 'В важном вы расходитесь: семья, карьера, свобода, порядок. Расхождения пока не обсуждены всерьёз.',
    risk: 'Разные ценности не ломают пару сами по себе — их ломает молчание о них: решения принимаются в разнобой.',
    prevention: 'Раз в месяц устраивайте «разговор о важном»: дети, деньги, родители, работа. Не договариваться, а просто сверять компасы.',
  },
  future: {
    key: 'future',
    title: 'Будущее',
    emoji: '🔮',
    strength: 'Вы видите себя вместе через несколько лет и смотрите в одну сторону, когда планируете.',
    weak: 'Образ будущего размыт или не совпадает: сроки, переезды, крупные шаги пока не названы.',
    risk: 'Непроговорённое будущее приводит к «внезапным» расхождениям спустя годы — когда вкладываться уже больно.',
    prevention: 'Назовите свои «пять лет» вслух: где живём, чем занимаемся, есть ли дети. Совпало не всё? Это начало разговора, а не приговор.',
  },
}

export const DIM_ORDER = [
  'communication',
  'conflicts',
  'money',
  'trust',
  'support',
  'intimacy',
  'values',
  'future',
] as const

const GRANULAR_TO_DIM: Record<string, string> = {
  communication: 'communication',
  language: 'communication',
  empathy: 'communication',
  awareness: 'communication',
  emotions: 'communication',
  openness: 'communication',
  extraversion: 'communication',
  conflicts: 'conflicts',
  attack: 'conflicts',
  stonewall: 'conflicts',
  contempt: 'conflicts',
  defensiveness: 'conflicts',
  repair: 'conflicts',
  regulation: 'conflicts',
  saving: 'money',
  goals: 'money',
  transparency: 'money',
  trust: 'trust',
  space: 'trust',
  digital: 'trust',
  support: 'support',
  care: 'support',
  recovery: 'support',
  reaction: 'support',
  anxiety: 'intimacy',
  avoidance: 'intimacy',
  values: 'values',
  conscientiousness: 'values',
  agreeableness: 'values',
  future: 'future',
  neuroticism: 'future',
}

function avg(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

export interface DimResult {
  key: string
  title: string
  emoji: string
  me: number
  partner: number
  align: number
  level: number
  score: number
}

export interface AnalyticsResult {
  compatibility: number | null
  dimensions: DimResult[]
  strengths: Array<{ key: string; title: string; emoji: string; score: number; text: string }>
  weaknesses: Array<{ key: string; title: string; emoji: string; score: number; text: string; reason: 'не совпадаете' | 'навык проседает' }>
  risks: Array<{ key: string; title: string; emoji: string; risk: string; prevention: string }>
  perspectives: string
  partnerPending: boolean
}

function pctFromAnswer(answer: number, reverseScored: boolean): number {
  const value = Math.max(1, Math.min(5, reverseScored ? 6 - answer : answer))
  return ((value - 1) / 4) * 100
}

export async function buildAnalytics(ctx: ApiContext): Promise<AnalyticsResult> {
  const { user, partner } = ctx
  const userIds = [user.id, ...(partner ? [partner.id] : [])]

  const questions = await prisma.question.findMany()
  const qMeta = new Map<string, { dimension: string; reverseScored: boolean }>()
  for (const q of questions) {
    qMeta.set(q.id, { dimension: q.dimension || 'main', reverseScored: q.reverseScored })
  }

  const responses = await prisma.assessmentResponse.findMany({
    where: { userId: { in: userIds } },
  })

  const buckets = new Map<string, Map<'me' | 'partner', number[]>>()
  for (const r of responses) {
    const meta = qMeta.get(r.questionId)
    if (!meta || typeof r.answer !== 'number') continue
    const dim = GRANULAR_TO_DIM[meta.dimension] || meta.dimension
    const who: 'me' | 'partner' = r.userId === user.id ? 'me' : 'partner'
    let bucket = buckets.get(dim)
    if (!bucket) {
      bucket = new Map<'me' | 'partner', number[]>()
      buckets.set(dim, bucket)
    }
    const list = bucket.get(who) ?? []
    list.push(pctFromAnswer(r.answer, meta.reverseScored))
    bucket.set(who, list)
  }

  const dimensions: DimResult[] = []
  for (const key of DIM_ORDER) {
    const bucket = buckets.get(key)
    if (!bucket) continue
    const meList = bucket.get('me') ?? []
    const partnerList = bucket.get('partner') ?? []
    if (!meList.length || !partnerList.length) continue

    const me = avg(meList)
    const partner = avg(partnerList)
    const align = 100 - Math.abs(me - partner)
    const level = (me + partner) / 2
    const score = Math.round(0.6 * align + 0.4 * level)
    dimensions.push({ key, title: DIM_META[key].title, emoji: DIM_META[key].emoji, me, partner, align, level, score })
  }

  const partnerPending = Boolean(partner && dimensions.length === 0)

  const byScoreDesc = [...dimensions].sort((a, b) => b.score - a.score)
  const strengths = byScoreDesc
    .filter((d) => d.score >= 70)
    .slice(0, 3)
    .map((d) => ({ key: d.key, title: d.title, emoji: d.emoji, score: d.score, text: DIM_META[d.key].strength }))

  const byScoreAsc = [...dimensions].sort((a, b) => a.score - b.score)
  const weaknesses = byScoreAsc
    .filter((d) => d.score < 60)
    .slice(0, 3)
    .map((d) => ({
      key: d.key,
      title: d.title,
      emoji: d.emoji,
      score: d.score,
      text: DIM_META[d.key].weak,
      reason: d.align < d.level ? ('не совпадаете' as const) : ('навык проседает' as const),
    }))

  const risks = weaknesses
    .slice(0, 2)
    .map((w) => ({ key: w.key, title: w.title, emoji: w.emoji, risk: DIM_META[w.key].risk, prevention: DIM_META[w.key].prevention }))

  const compatibility = dimensions.length ? Math.round(avg(dimensions.map((d) => d.score))) : null

  const warmthRecent = await prisma.warmthEntry.count({
    where: { coupleId: ctx.couple!.id, createdAt: { gte: new Date(Date.now() - 14 * 86400000) } },
  })
  const moodTrend = warmthRecent > 0 ? 'вы недавно обменивались теплом — это хороший знак' : 'попробуйте добавить тепла в повседневность'

  const perspectives = (() => {
    if (compatibility === null) return 'Ответьте на тесты вместе, чтобы увидеть перспективы.'
    if (compatibility >= 85) {
      return `Совместимость ${compatibility}% — вы редкая пара: почти во всём смотрите в одну сторону. У вас ${strengths.length} ярких сильных сторон. Держите этот темп: ${moodTrend}.`
    }
    if (compatibility >= 70) {
      return `Совместимость ${compatibility}% — у вас крепкая основа и ${strengths.length} сильных стороны. Осталось подтянуть пару зон роста, и союз станет заметно легче. ${strengths.length ? 'Опирайтесь на сильные стороны, когда будете обсуждать разногласия.' : moodTrend}.`
    }
    if (compatibility >= 50) {
      return `Совместимость ${compatibility}% — вы разные, и это не приговор, а задача. Приоритет — обсудить зоны роста, пока они не стали привычкой. ${moodTrend}.`
    }
    return `Совместимость ${compatibility}% — похоже, вы давно не сверяли курсы. Начните с одного разговора о зонах роста: ${moodTrend}.`
  })()

  return {
    compatibility,
    dimensions,
    strengths,
    weaknesses,
    risks,
    perspectives,
    partnerPending,
  }
}