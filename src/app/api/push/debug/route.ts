import webpush from 'web-push'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function keyHealth() {
  const pub = process.env.VAPID_PUBLIC_KEY ?? ''
  const priv = process.env.VAPID_PRIVATE_KEY ?? ''
  const subject = process.env.VAPID_SUBJECT || 'mailto:push@loop.app'
  try {
    webpush.setVapidDetails(subject, pub, priv)
    return { ok: true, fp: pub.slice(0, 8) + '…' + pub.slice(-8), subject }
  } catch {
    return { ok: false, error: 'key health error' }
  }
}

export async function GET(request: NextRequest) {
  try {
    const subs = await prisma.pushSubscription.count({ where: {} })
    let lastResult = '—'
    try {
      const testRes = await fetch('/api/push/test', { method: 'POST' })
      const testData = await testRes.json()
      if (testData.sent === true) {
        lastResult = 'ок'
      } else {
        lastResult = testData.error || 'нет подписок'
      }
    } catch {
      lastResult = 'ошибка запроса'
    }
    const dbg = keyHealth()
    return NextResponse.json({ count: subs, lastResult, keys: dbg })
  } catch (error) {
    console.error('Push debug error:', error)
    return NextResponse.json({ count: 0, lastResult: 'ошибка сервера', keys: { ok: false, error: 'unknown' } }, { status: 500 })
  }
}
