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

  let sent = 0
  let failed = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.keysP256dh, auth: sub.keysAuth } },
        body,
        { TTL: 86400 }
      )
      sent += 1
      await prisma.pushSubscription.update({
        where: { id: sub.id },
        data: { lastNotifiedAt: new Date() },
      })
    } catch (err: unknown) {
      failed += 1
      const code = (err as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
      }
    }
  }

  return { sent, failed }
}

export async function deletePushSubscription(endpoint: string, userId: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } })
}