import { prisma } from '@/lib/prisma'

const EVENT_EMOJI: Record<string, string> = {
  couple_created: '💞',
  first_test: '🧪',
  both_tests: '🧪',
  report_generated: '📄',
  first_date: '📍',
  challenge_completed: '🌙',
  anniversary: '🎂',
  date_visited: '📸',
}

export async function emitEvent(
  coupleId: string,
  type: string,
  title: string,
  meta?: Record<string, unknown>
) {
  try {
    await prisma.coupleEvent.create({
      data: {
        id: `ce_${Math.random().toString(36).slice(2, 14)}`,
        coupleId,
        type,
        title,
        meta: meta ? (meta as object) : undefined,
      },
    })
  } catch (error) {
    console.error('Emit event error:', error)
  }
}

export function eventEmoji(type: string): string {
  return EVENT_EMOJI[type] ?? '✨'
}