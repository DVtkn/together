import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import webpush from 'web-push'

function keyHealth(): { ok: boolean; error?: string } {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    const subject = process.env.VAPID_SUBJECT || 'mailto:push@loop.app'

    if (!publicKey || !privateKey) {
      return { ok: false, error: 'VAPID_PUBLIC_KEY или VAPID_PRIVATE_KEY не заданы в env' }
    }
    if (publicKey.length < 80 || privateKey.length < 30) {
      return { ok: false, error: 'VAPID ключи выглядят некорректно (слишком короткие)' }
    }
    webpush.setVapidDetails(subject, publicKey, privateKey)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: `VAPID ошибка: ${e instanceof Error ? e.message : String(e)}` }
  }
}

export async function POST() {
  const health = keyHealth()
  if (!health.ok) {
    return NextResponse.json({ ok: false, error: health.error }, { status: 200 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: session.user.id },
  })
  if (!subs.length) {
    return NextResponse.json({ error: 'no-subscription', debug: { subsCount: 0, hint: 'Сначала включите пуши на клиенте' } }, { status: 200 })
  }

  try {
    const body = JSON.stringify({
      title: 'Loop 🔔',
      body: 'Тест-уведомление работает',
      url: '/dashboard/chat',
      tag: 'test',
    })

    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          const result = await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.keysP256dh, auth: sub.keysAuth } },
            body,
            { TTL: 86400 }
          )
          await prisma.pushSubscription.update({
            where: { id: sub.id },
            data: { lastNotifiedAt: new Date() },
          })
          return { ok: true, subId: sub.id, statusCode: result.statusCode }
        } catch (err) {
          const e = err as { statusCode?: number; message?: string; body?: string }
          if (e.statusCode === 404 || e.statusCode === 410) {
            await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint, userId: session.user.id } }).catch(() => {})
            return { ok: false, subId: sub.id, error: 'subscription expired', statusCode: e.statusCode }
          }
          if (e.statusCode === 403) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
            return { ok: false, subId: sub.id, error: 'forbidden (keys mismatch?)', statusCode: 403 }
          }
          return { ok: false, subId: sub.id, error: e.message, statusCode: e.statusCode }
        }
      })
    )

    const sent = results.filter(r => r.status === 'fulfilled' && r.value.ok).length
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)).length

    return NextResponse.json({
      ok: sent > 0,
      sent,
      failed,
      details: results.map(r => r.status === 'fulfilled' ? r.value : { ok: false, error: r.reason?.message })
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'push-failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}