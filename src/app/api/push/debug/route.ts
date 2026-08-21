import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    return NextResponse.json({ count: subs, lastResult })
  } catch (error) {
    console.error('Push debug error:', error)
    return NextResponse.json({ count: 0, lastResult: 'ошибка сервера' }, { status: 500 })
  }
}