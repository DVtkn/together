// src/lib/push-client.ts
'use client'

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean
}

const VAPID_PUBLIC_KEY =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) || null

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function checkPushStatus(): Promise<{
  supported: boolean
  standalone: boolean
  permission: NotificationPermission | 'no-api'
  subscribed: boolean
}> {
  const supported =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as NavigatorWithStandalone).standalone === true

  const permission: NotificationPermission | 'no-api' = supported
    ? Notification.permission
    : 'no-api'

  let subscribed = false
  if (supported) {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      subscribed = !!sub
    } catch {
      subscribed = false
    }
  }

  return { supported, standalone, permission, subscribed }
}

export interface EnablePushResult {
  ok: boolean
  message: string
}

export interface DisablePushResult {
  ok: boolean
  message: string
}

export interface PushStatus {
  supported: boolean
  standalone: boolean
  permission: NotificationPermission | 'no-api'
  subscribed: boolean
}

export async function enablePush(): Promise<EnablePushResult> {
  // 1. Поддержка API
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, message: '❌ Браузер не поддерживает Push API' }
  }

  // 2. Standalone-режим (критично для iOS)
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as NavigatorWithStandalone).standalone === true
  if (!standalone) {
    return {
      ok: false,
      message: '❌ Добавьте Loop на экран \'Домой\' и откройте с иконки',
    }
  }

  // 3. VAPID-ключ
  if (!VAPID_PUBLIC_KEY) {
    return { ok: false, message: '❌ NEXT_PUBLIC_VAPID_PUBLIC_KEY не задан' }
  }

  // 4. Разрешение (строго по тапу пользователя)
  let permission: NotificationPermission
  try {
    permission = await Notification.requestPermission()
  } catch {
    return { ok: false, message: '❌ Ошибка запроса разрешения' }
  }
  if (permission !== 'granted') {
    return {
      ok: false,
      message: '❌ Разрешение отклонено. Включите в Настройки iPhone → Уведомления → Loop',
    }
  }

  // 5. Ждём готовности SW
  let reg: ServiceWorkerRegistration
  try {
    reg = await navigator.serviceWorker.ready
  } catch {
    return { ok: false, message: '❌ Service Worker не активен' }
  }

  // 6. Удаляем старую подписку, если есть
  try {
    const oldSub = await reg.pushManager.getSubscription()
    if (oldSub) await oldSub.unsubscribe()
  } catch {}

  // 7. Создаём новую подписку
  let sub: PushSubscription
  try {
    const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appServerKey as BufferSource,
    })
  } catch (err) {
    console.error('subscribe failed', err)
    return { ok: false, message: `❌ Ошибка подписки: ${(err as Error).message}` }
  }

  // 8. Отправляем на сервер
  try {
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    })
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, message: `❌ Сервер не сохранил: ${res.status} ${text.slice(0, 200)}` }
    }
  } catch (err) {
    return { ok: false, message: `❌ Сеть: ${(err as Error).message}` }
  }

  return { ok: true, message: '✅ Push-уведомления включены' }
}

export async function disablePush(): Promise<DisablePushResult> {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await sub.unsubscribe()
      await fetch('/api/push/unsubscribe', { method: 'POST' })
    }
    return { ok: true, message: 'Отключено' }
  } catch (err) {
    return { ok: false, message: `❌ Ошибка: ${(err as Error).message}` }
  }
}

export async function subscribeToPush(): Promise<EnablePushResult> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, message: '❌ Браузер не поддерживает Push API' }
  }
  if (!VAPID_PUBLIC_KEY) {
    return { ok: false, message: '❌ NEXT_PUBLIC_VAPID_PUBLIC_KEY не задан' }
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    const subscription = existing || (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    }))

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON()),
    })
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, message: `❌ Сервер не сохранил: ${res.status} ${text.slice(0, 200)}` }
    }
    return { ok: true, message: '✅ Push-уведомления включены' }
  } catch (error) {
    console.error('Push subscribe failed:', error)
    return { ok: false, message: `❌ Ошибка: ${(error as Error).message}` }
  }
}

export async function unsubscribeFromPush(): Promise<{ ok: boolean; message: string }> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, message: '❌ Браузер не поддерживает Push API' }
  }
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      const endpoint = subscription.endpoint
      await subscription.unsubscribe()
      await fetch('/api/push/unsubscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      })
    }
    return { ok: true, message: 'Отключено' }
  } catch (error) {
    console.error('Push unsubscribe failed:', error)
    return { ok: false, message: `❌ Ошибка: ${(error as Error).message}` }
  }
}

export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    await navigator.serviceWorker.register('/sw.js')
  } catch (error) {
    console.error('SW registration failed:', error)
  }
}

export async function testPush(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/push/test', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error || 'Ошибка отправки' }
    return { ok: data.sent === true }
  } catch (error) {
    return { ok: false, error: 'Ошибка сети' }
  }
}