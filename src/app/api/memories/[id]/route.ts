import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getApiContext, requireCouple, unauthorized } from '@/lib/api-auth'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params
  const memory = await prisma.memory.findUnique({ where: { id } })
  if (!memory || memory.coupleId !== ctx.couple!.id) {
    return NextResponse.json({ error: 'Воспоминание не найдено' }, { status: 404 })
  }
  if (memory.userId !== ctx.user.id) {
    return NextResponse.json({ error: 'Удалить может только автор' }, { status: 403 })
  }

  await prisma.memory.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export const dynamic = 'force-dynamic'