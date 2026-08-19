import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, unauthorized, requireCouple } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { notify, nameOf } from '@/lib/notify'
import { sendPushToUserFireAndForget } from '@/lib/push'
import { z } from 'zod'

const giftSchema = z.object({
  slug: z.string().min(1),
})

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
  const guard = requireCouple(ctx)
  if (guard) return guard
  const partner = ctx.partner!

  let body: { slug?: string } = {}
  try {
    body = giftSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Неверные данные' }, { status: 422 })
  }

  const flower = await prisma.flower.findUnique({ where: { slug: body.slug! } })
  if (!flower) return NextResponse.json({ error: 'Цветок не найден' }, { status: 404 })

  const fromName = nameOf(ctx.user) ?? 'Ваш партнёр'
  const text = `💐 ${fromName} дарит вам ${flower.name} — ${flower.meaning ?? 'символ внимания'}`

  notify(partner.id, 'flower_gift', text, '/dashboard')
  sendPushToUserFireAndForget(partner.id, {
    title: '💐 Подарок от партнёра',
    body: text,
    url: '/dashboard',
  })

  return NextResponse.json({ ok: true, flower: { slug: flower.slug, name: flower.name, emoji: flower.emoji } })
}

export const dynamic = 'force-dynamic'
export const revalidate = 0