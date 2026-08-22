import { prisma } from '@/lib/prisma'
import { pushToUser } from '@/lib/push'

const PREF_KEY: Record<string, keyof { notifyMessages: boolean; notifyStatus: boolean; notifyDates: boolean; notifyChallenges: boolean }> = {
  couple_message: 'notifyMessages',
  mood_changed: 'notifyStatus',
  signal_received: 'notifyStatus',
  date_invite: 'notifyDates',
  date_planned: 'notifyDates',
  date_accepted: 'notifyDates',
  challenge_created: 'notifyChallenges',
}

export async function notify(userId: string, type: string, text: string, href?: string) {
  if (!userId) return
  try {
    await prisma.notification.create({
      data: { userId, type, text, href },
    })

    const prefKey = PREF_KEY[type]
    if (prefKey) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { [prefKey]: true, pushEnabled: true },
      })
      if (user?.pushEnabled && user[prefKey]) {
        pushToUser(userId, { title: 'Loop', body: text, url: href || '/dashboard' }).catch(
          (err) => console.error('[push] notify failed:', err)
        )
      }
    }
  } catch (error) {
    console.error('Notify error:', error)
  }
}

export function nameOf(user: { name?: string | null; username?: string | null } | null | undefined): string {
  return user?.name || user?.username || 'Партнёр'
}