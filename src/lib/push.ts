import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

let vapidConfigured = false

function configureVapid() {
  if (vapidConfigured) return true
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@localhost'
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
  return true
}

interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const configured = configureVapid()
  if (!configured) return { sent: 0, failed: 0 }

  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  if (subs.length === 0) return { sent: 0, failed: 0 }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/dashboard',
    icon: payload.icon || '/icon.png',
    badge: '/icon.png',
  })

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keysP256dh, auth: sub.keysAuth } },
          body,
          { TTL: 86400 }
        )
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastNotifiedAt: new Date() },
        })
        return { ok: true as const, sub }
      } catch (err) {
        return { ok: false as const, sub, error: err as { statusCode?: number } }
      }
    })
  )

  let sent = 0
  let failed = 0
  for (const r of results) {
    if (r.status === 'rejected') {
      failed += 1
      continue
    }
    if (r.value.ok) {
      sent += 1
      continue
    }
    failed += 1
    const code = r.value.error.statusCode
    if (code === 404 || code === 410) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint: r.value.sub.endpoint, userId } }).catch(() => {})
    }
  }

  return { sent, failed }
}

export function sendPushToUserFireAndForget(userId: string, payload: PushPayload) {
  sendPushToUser(userId, payload).catch(() => {})
}

export async function deletePushSubscription(endpoint: string, userId: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } })
}