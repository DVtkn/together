import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

export const registerSchema = z.object({
  username: z.string().min(3, 'Логин минимум 3 символа').max(20, 'Логин максимум 20 символов').regex(/^[a-zA-Z0-9_]+$/, 'Только буквы, цифры и подчёркивание'),
  password: z.string().min(8, 'Пароль минимум 8 символов'),
  name: z.string().min(2, 'Имя минимум 2 символа').max(50, 'Имя максимум 50 символов').optional(),
  role: z.enum(['DRIVER', 'PASSENGER']).default('PASSENGER'),
  preferredGender: z.string().optional().default('any'),
  petFriendly: z.boolean().default(false),
  smokeFree: z.boolean().default(true),
  conversationLevel: z.string().optional().default('any'),
  musicPreference: z.string().optional().default('any'),
})

export async function POST(request: NextRequest) {
  const rl = await rateLimit('register', request.headers.get('x-forwarded-for') || 'anon')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много попыток регистрации. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  try {
    const body = await request.json()
    const validation = registerSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Ошибка валидации' },
        { status: 400 }
      )
    }

    const { username, password, name, role, preferredGender, petFriendly, smokeFree, conversationLevel, musicPreference } = validation.data

    const existingUser = await prisma.user.findUnique({
      where: { username },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким логином уже существует' },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        name,
        role,
        preferredGender,
        petFriendly,
        smokeFree,
        conversationLevel,
        musicPreference,
        emailVerified: false,
      },
    })

    return NextResponse.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      preferredGender: user.preferredGender,
      petFriendly: user.petFriendly,
      smokeFree: user.smokeFree,
      emailVerified: user.emailVerified,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'