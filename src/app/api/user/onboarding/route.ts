import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiContext, unauthorized } from '@/lib/api-auth'

export async function GET() {
  const ctx = await getApiContext()
  if (!ctx) return unauthorized()
  return NextResponse.json({ done: ctx.user.onboardingDone ?? false })
}

export async function POST() {
  const ctx = await getApiContext()
  if (!ctx) return unauthorized()
  await prisma.user.update({ where: { id: ctx.user.id }, data: { onboardingDone: true } })
  return NextResponse.json({ ok: true })
}

export const dynamic = 'force-dynamic'