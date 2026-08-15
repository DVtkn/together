import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'

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

  try {
    const userId = ctx.user.id
    const [profile, responses, checkins, moods, cravings, wishes, conversations, pushSubs] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.assessmentResponse.findMany({
        where: { userId },
        include: { Question: { select: { text: true } }, Assessment: { select: { key: true, title: true } } },
      }),
      prisma.pulseCheckin.findMany({ where: { userId } }),
      prisma.moodStatus.findUnique({ where: { userId } }),
      prisma.smallCraving.findMany({ where: { userId } }),
      prisma.wishlistItem.findMany({ where: { userId } }),
      prisma.aIConversation.findMany({
        where: { Couple: { partnerAId: userId } },
        include: { AIMessage: true },
      }),
      prisma.pushSubscription.findMany({ where: { userId } }),
    ])

    const data = {
      exportedAt: new Date().toISOString(),
      profile,
      assessmentResponses: (responses ?? []).map((r) => ({
        assessment: r.Assessment?.key,
        question: r.Question?.text,
        answer: r.answer,
        answeredAt: r.answeredAt,
      })),
      pulseCheckins: checkins ?? [],
      moodStatus: moods,
      cravings: cravings ?? [],
      wishlist: wishes ?? [],
      aiConversations: (conversations ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        messages: (c.AIMessage ?? []).map((m) => ({ role: m.role, content: m.content, createdAt: m.createdAt })),
      })),
      pushSubscriptions: (pushSubs ?? []).map((s) => ({ createdAt: s.createdAt })),
    }

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="together-export.json"',
      },
    })
  } catch (error) {
    console.error('Export data error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'