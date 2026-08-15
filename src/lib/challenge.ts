import { prisma } from '@/lib/prisma'
import type { Couple } from '@/generated/prisma/client'

const CHALLENGE_TEMPLATES = [
  {
    title: '10 минут без телефонов',
    description: 'Простейший способ снова почувствовать друг друга рядом.',
    instruction: 'Сядьте рядом, отложите телефоны и поговорите о том, как прошёл ваш день. Без оценок и советов — только слушайте.',
    examplePhrase: 'Расскажи, что сегодня было самым приятным моментом?',
    axis: 'communication',
    difficulty: 1,
    durationMin: 10,
  },
  {
    title: 'Благодарность за мелочь',
    description: 'Замечать то, что партнёр делает каждый день — важно для близости.',
    instruction: 'Найдите одну маленькую вещь, которую партнёр сделал для вас на этой неделе, и скажите спасибо конкретно за неё.',
    examplePhrase: 'Спасибо, что приготовила кофе, не спросив — я очень ценю это.',
    axis: 'support',
    difficulty: 1,
    durationMin: 5,
  },
  {
    title: 'Вечерний чек-ин без «проблем»',
    description: 'Научиться говорить о чувствах, а не только о делах.',
    instruction: 'Вечером задайте друг другу один вопрос о чувствах и по-настоящему выслушайте ответ.',
    examplePhrase: 'Как ты себя чувствуешь после этой недели?',
    axis: 'intimacy',
    difficulty: 2,
    durationMin: 15,
  },
  {
    title: 'Идеальный день вдвоём',
    description: 'Фантазии о будущем сближают и снимают напряжение.',
    instruction: 'Придумайте вместе идеальный день без ограничений бюджета. Запишите план из 5 пунктов.',
    examplePhrase: 'Начнём с позднего завтрака у моря...',
    axis: 'future',
    difficulty: 2,
    durationMin: 30,
  },
  {
    title: 'Спокойный разговор о конфликте',
    description: 'Один из самых ценных навыков — обсуждать разногласия без взрыва.',
    instruction: 'Вспомните недавнее разногласие. Обсудите его с правилом: сначала чувства каждого, потом решение. Без перебивания.',
    examplePhrase: 'Когда ты не отвечала на сообщения, я чувствовал тревогу. Что ты чувствовала?',
    axis: 'conflict',
    difficulty: 3,
    durationMin: 20,
  },
  {
    title: 'Письмо себе из будущего',
    description: 'Понять, куда вы движетесь как пара и что для вас важно.',
    instruction: 'Каждый напишет короткое письмо «нам через год». Потом прочитайте вслух друг другу.',
    examplePhrase: 'Через год я хочу, чтобы мы...',
    axis: 'future',
    difficulty: 2,
    durationMin: 25,
  },
]

export async function ensureChallengeForWeek(couple: Couple, weekNumber: number, year: number): Promise<void> {
  const existing = await prisma.challenge.findUnique({
    where: {
      coupleId_weekNumber_year: {
        coupleId: couple.id,
        weekNumber,
        year,
      },
    },
  })
  if (existing) return

  const idx = ((weekNumber + year + couple.partnerAId.length) % CHALLENGE_TEMPLATES.length + CHALLENGE_TEMPLATES.length) % CHALLENGE_TEMPLATES.length
  const tpl = CHALLENGE_TEMPLATES[idx]

  await prisma.challenge.create({
    data: {
      id: `ch_${Math.random().toString(36).slice(2, 14)}`,
      coupleId: couple.id,
      weekNumber,
      year,
      title: tpl.title,
      description: tpl.description,
      instruction: tpl.instruction,
      examplePhrase: tpl.examplePhrase,
      axis: tpl.axis,
      difficulty: tpl.difficulty,
      durationMin: tpl.durationMin,
      status: 'ACTIVE',
    },
  })
}