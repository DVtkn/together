import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized } from '@/lib/api-auth'
import { notify } from '@/lib/notify'

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

  if (!ctx.couple || !ctx.partner) {
    return NextResponse.json({ ok: false })
  }

  await notify(
    ctx.partner.id,
    'mood_remind',
    `${ctx.user.name ?? ctx.user.username ?? 'Партнёр'} мягко напоминает: отметь настроение 💜`,
    '/dashboard/daily'
  )

  return NextResponse.json({ ok: true })
}

export const dynamic = 'force-dynamic'