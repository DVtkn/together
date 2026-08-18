import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import crypto from 'crypto'
import { z } from 'zod'

const forgotSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  const rl = await rateLimit('register', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  let body: { email?: string } = {}
  try {
    body = forgotSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Введите корректный email' }, { status: 400 })
  }

  const email = body.email!.toLowerCase()
  const user = await prisma.user.findUnique({ where: { email } })

  if (user) {
    const token = crypto.randomBytes(32).toString('hex')
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
      },
    })

    const base = process.env.NEXT_PUBLIC_APP_URL || 'https://together-app-sepia.vercel.app'
    const link = `${base}/reset-password?token=${token}`
    await sendEmail(
      email,
      'Сброс пароля — Loop',
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2>Восстановление пароля</h2>
        <p>Перейдите по ссылке, чтобы задать новый пароль (действует 1 час):</p>
        <p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#8B5CF6;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">Задать новый пароль</a></p>
        <p style="color:#888;font-size:13px">Если вы не запрашивали сброс — просто проигнорируйте это письмо.</p>
      </div>`
    )
  }

  return NextResponse.json({ ok: true })
}

export const dynamic = 'force-dynamic'
export const revalidate = 0