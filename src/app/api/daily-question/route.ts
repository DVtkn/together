import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, requireCouple, unauthorized } from '@/lib/api-auth'
import { z } from 'zod'
import { notify, nameOf } from '@/lib/notify'

const QUESTION_BANK = [
  'Что тебя сегодня порадовало?',
  'За что ты сегодня благодарен(на)?',
  'Что бы ты хотел(а), чтобы я делал(а) чаще?',
  'Какое маленькое приключение ты хочешь попробовать?',
  'Что тебя сейчас больше всего тревожит?',
  'Что я делаю, что тебе особенно нравится?',
  'Какое воспоминание у нас самое тёплое?',
  'Что ты хочешь, чтобы я знал(а) о твоём дне?',
  'Какая твоя любимая черта во мне?',
  'Если бы у нас был свободный вечер, куда бы ты пошёл(а)?',
  'Что для тебя значит «поддержка»?',
  'О чём ты мечтаешь на год вперёд?',
  'Что бы ты хотел(а) изменить в нашем ритме?',
  'Какая мелочь делает твой день лучше?',
  'Что ты хочешь, чтобы мы делали только вдвоём?',
]

const answerSchema = z.object({
  answer: z.string().min(1).max(1000).transform((s) => s.trim()),
})

const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function GET(request: NextRequest) {
  const rl = await rateLimit('default', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()
  const noCouple = requireCouple(ctx)
  if (noCouple) return noCouple

  const date = todayKey()
  let question = await prisma.dailyQuestion.findUnique({
    where: { coupleId_date: { coupleId: ctx.couple!.id, date } },
  })

  if (!question) {
    const count = await prisma.dailyQuestion.count({ where: { coupleId: ctx.couple!.id } })
    question = await prisma.dailyQuestion.create({
      data: {
        id: `dq_${Math.random().toString(36).slice(2, 14)}`,
        coupleId: ctx.couple!.id,
        date,
        question: QUESTION_BANK[count % QUESTION_BANK.length],
      },
    })
  }

  const isPartnerA = ctx.couple!.partnerAId === ctx.user.id
  return NextResponse.json({
    question: {
      id: question.id,
      date: question.date,
      text: question.question,
      myAnswer: isPartnerA ? question.answerA : question.answerB,
      partnerAnswer: isPartnerA ? question.answerB : question.answerA,
      myAnswered: Boolean(isPartnerA ? question.answerA : question.answerB),
      partnerAnswered: Boolean(isPartnerA ? question.answerB : question.answerA),
      answerMineKey: isPartnerA ? 'answerA' : 'answerB',
    },
  })
}

export async function POST(request: NextRequest) {
  const rl = await rateLimit('default', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()
  const noCouple = requireCouple(ctx)
  if (noCouple) return noCouple

  const body = await request.json()
  const validation = answerSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: 'Ответ не может быть пустым' }, { status: 400 })
  }

  const date = todayKey()
  let question = await prisma.dailyQuestion.findUnique({
    where: { coupleId_date: { coupleId: ctx.couple!.id, date } },
  })
  if (!question) {
    const count = await prisma.dailyQuestion.count({ where: { coupleId: ctx.couple!.id } })
    question = await prisma.dailyQuestion.create({
      data: {
        id: `dq_${Math.random().toString(36).slice(2, 14)}`,
        coupleId: ctx.couple!.id,
        date,
        question: QUESTION_BANK[count % QUESTION_BANK.length],
      },
    })
  }

  const isPartnerA = ctx.couple!.partnerAId === ctx.user.id
  const updated = await prisma.dailyQuestion.update({
    where: { id: question.id },
    data: isPartnerA ? { answerA: validation.data.answer } : { answerB: validation.data.answer },
  })

  if (ctx.partner) {
    await notify(
      ctx.partner.id,
      'daily_answered',
      `${nameOf(ctx.user)} ответил(а) на вопрос дня`,
      '/dashboard/daily'
    )
  }

  return NextResponse.json({ ok: true, myAnswer: isPartnerA ? updated.answerA : updated.answerB })
}

export const dynamic = 'force-dynamic'