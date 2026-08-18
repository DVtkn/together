import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const resetSchema = z.object({
  token: z.string().min(10).max(200),
  password: z.string().min(4).max(100),
})

export async function POST(request: NextRequest) {
  const rl = await rateLimit('register', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  let body: { token?: string; password?: string } = {}
  try {
    body = resetSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Неверные данные' }, { status: 400 })
  }

  const user = await prisma.user.findFirst({ where: { resetToken: body.token } })
  if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
    return NextResponse.json({ error: 'Ссылка устарела или недействительна. Запросите сброс заново.' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(body.password!, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpires: null },
  })

  return NextResponse.json({ ok: true })
}

export const dynamic = 'force-dynamic'
export const revalidate = 0