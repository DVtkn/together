import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Couple, User } from '@/generated/prisma/client'

export type ApiContext = {
  user: User
  couple: Couple | null
  partner: User | null
}

export function unauthorized() {
  return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
}

export async function getApiContext(): Promise<ApiContext | null> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return null

  const couple = await prisma.couple.findFirst({
    where: {
      OR: [{ partnerAId: user.id }, { partnerBId: user.id }],
      status: { notIn: ['ARCHIVED', 'DELETED'] },
    },
  })
  let partner: User | null = null

  if (couple) {
    const partnerId = couple.partnerAId === user.id ? couple.partnerBId : couple.partnerAId
    partner = await prisma.user.findUnique({ where: { id: partnerId } })
  }

  return { user, couple, partner }
}

export function requireCouple(ctx: ApiContext) {
  if (!ctx.couple || !ctx.partner) {
    return NextResponse.json({ error: 'Вы не в паре' }, { status: 400 })
  }
  return null
}