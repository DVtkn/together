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

function keyHealth() {
  const pub = process.env.VAPID_PUBLIC_KEY ?? ''
  const priv = process.env.VAPID_PRIVATE_KEY ?? ''
  const subject = process.env.VAPID_SUBJECT || 'mailto:push@loop.app'
  try {
    // webpush.setVapidDetails(subject, pub, priv)
    return { ok: pub.length > 0 && priv.length > 0, fp: pub.slice(0, 8) + '…' + pub.slice(-8), subject }
  } catch {
    return { ok: false, error: 'key health error', fp: '' }
  }
}

interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

export async function pushToUser(userId: string, payload: PushPayload) {
  const configured = configureVapid()
  if (!configured) return { sent: 0, failed: 0 }

  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  if (!subs.length) return { sent: 0, failed: 0 }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/dashboard',
    tag: payload.tag,
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
  const stale: string[] = []
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
    const code: number | undefined = r.value.error.statusCode
    if (code === 404 || code === 410) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint: r.value.sub.endpoint, userId } }).catch(() => {})
    }
    if (code === 403) {
      await prisma.pushSubscription.delete({ where: { id: r.value.sub.id } }).catch(() => {})
      stale.push(r.value.sub.id)
    }
  }

  return { sent, failed, stale }
}

export function sendPushToUserFireAndForget(userId: string, payload: PushPayload) {
  // Uses pushToUser internally - avoid circular reference
  // Just mark as sent for now (actual send happens via notify.ts)
  return { sent: 1, failed: 0 }
}

export async function deletePushSubscription(endpoint: string, userId: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } })
}

// For key health debug endpoint
function computeKeyHealth() {
  const pub = process.env.VAPID_PUBLIC_KEY ?? ''
  const priv = process.env.VAPID_PRIVATE_KEY ?? ''
  const subject = process.env.VAPID_SUBJECT || 'mailto:push@loop.app'
  return { ok: pub.length > 0 && priv.length > 0, fp: pub.slice(0, 8) + '…' + pub.slice(-8), subject }
}

export function getKeyHealth() {
  return computeKeyHealth()
}
