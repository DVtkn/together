import { prisma } from '@/lib/prisma'

export async function notify(userId: string, type: string, text: string, href?: string) {
  if (!userId) return
  try {
    await prisma.notification.create({
      data: { userId, type, text, href },
    })
  } catch (error) {
    console.error('Notify error:', error)
  }
}

export function nameOf(user: { name?: string | null; username?: string | null } | null | undefined): string {
  return user?.name || user?.username || 'Партнёр'
}