'use client'

import { ReactNode, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils/cn'
import { useCouple, useProfile } from '@/lib/hooks'
import { registerServiceWorker } from '@/lib/push-client'

const NAV_ITEMS = [
  { key: 'home', href: '/dashboard', label: 'Дом', icon: '🏠' },
  { key: 'couple', href: '/dashboard/couple', label: 'Мы', icon: '💞' },
  { key: 'date', href: '/dashboard/date', label: 'Свидание', icon: '📍' },
  { key: 'daily', href: '/dashboard/daily', label: 'Будни', icon: '⚡' },
  { key: 'ai', href: '/dashboard/ai', label: 'Сова', icon: '🦉' },
]

const GROUPS: Record<string, string[]> = {
  '/dashboard/couple': ['/dashboard/couple', '/dashboard/assessments'],
  '/dashboard/daily': ['/dashboard/daily'],
  '/dashboard/date': ['/dashboard/date'],
  '/dashboard/ai': ['/dashboard/ai'],
}

interface NotificationItem {
  id: string
  type: string
  text: string
  href: string | null
  read: boolean
  createdAt: string
}

const NOTIF_ICON: Record<string, string> = {
  couple_requested: '💞',
  couple_accepted: '💞',
  couple_rejected: '💞',
  date_invited: '📍',
  date_planned: '📍',
  craving_added: '🎁',
  craving_picked: '🎁',
  mood_changed: '🫀',
  assessment_completed: '🧪',
  challenge_completed: '🌙',
  couple_message: '💬',
  daily_answered: '☀️',
  memory_added: '📸',
  ritual_added: '🕊️',
  ritual_done: '✓',
  letter_sent: '💌',
  signal_received: '🤗',
  pause_started: '🛑',
  pause_ended: '⏸️',
  warmth_added: '💌',
  daily_revealed: '🔮',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'только что'
  if (min < 60) return `${min} мин назад`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours} ч назад`
  const days = Math.floor(hours / 24)
  return `${days} дн назад`
}

interface DashboardLayoutProps {
  children: ReactNode
  user?: {
    name: string | null
    email: string
    image?: string | null
  }
  couple?: {
    id: string
    partnerA: { name: string | null }
    partnerB: { name: string | null }
    status: string
  } | null
}

function initials(name: string | null | undefined): string {
  if (!name) return 'Д'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0]?.slice(0, 2).toUpperCase() || 'Д'
}

export function DashboardLayout({ children, user, couple }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const [notif, setNotif] = useState<{ items: NotificationItem[]; unread: number }>({ items: [], unread: 0 })
  const [notifOpen, setNotifOpen] = useState(false)
  const [pause, setPause] = useState<{ active: boolean; secondsLeft: number }>({ active: false, secondsLeft: 0 })
  const [pauseOpen, setPauseOpen] = useState(false)
  const { data: profileData } = useProfile()
  const swrCouple = useCouple()

  useEffect(() => {
    registerServiceWorker()
    const t = setInterval(() => {
      fetch('/api/pause').then(r => r.json()).then(p => {
        if (p) setPause({ active: p.active ?? false, secondsLeft: p.secondsLeft ?? 0 })
      }).catch(() => {})
    }, 10000)
    return () => clearInterval(t)
  }, [])

  const startPause = async () => {
    const r = await fetch('/api/pause', { method: 'POST' }).catch(() => null)
    if (r && r.ok) {
      const j = await r.json()
      setPause({ active: true, secondsLeft: j.secondsLeft ?? 1200 })
      setPauseOpen(true)
      window.dispatchEvent(new Event('together:refresh'))
    }
  }

  const cancelPause = async () => {
    const r = await fetch('/api/pause', { method: 'DELETE' }).catch(() => null)
    if (r && r.ok) {
      setPause({ active: false, secondsLeft: 0 })
      setPauseOpen(false)
      window.dispatchEvent(new Event('together:refresh'))
    }
  }

  const pauseFmt = pause.active && pause.secondsLeft > 0
    ? `${Math.floor(pause.secondsLeft / 60)}:${String(pause.secondsLeft % 60).padStart(2, '0')}`
    : ''

  const loadNotif = useCallback(() => {
    fetch('/api/notifications?limit=30').then((r) => r.json()).then((d) => {
      if (d && Array.isArray(d.items)) setNotif({ items: d.items, unread: d.unread ?? 0 })
    }).catch(() => {})
  }, [])

  useEffect(() => {
    loadNotif()
    const t = setInterval(loadNotif, 20000)
    const refresh = () => loadNotif()
    window.addEventListener('together:refresh', refresh)
    return () => {
      clearInterval(t)
      window.removeEventListener('together:refresh', refresh)
    }
  }, [loadNotif])

  const readAll = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' })
    setNotif((p) => ({ items: p.items.map((i) => ({ ...i, read: true })), unread: 0 }))
  }

  const openItem = async (n: NotificationItem) => {
    if (!n.read) {
      setNotif((p) => ({ items: p.items.map((i) => (i.id === n.id ? { ...i, read: true } : i)), unread: Math.max(0, p.unread - 1) }))
      fetch(`/api/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {})
    }
    setNotifOpen(false)
    if (n.href) router.push(n.href)
  }

  const me = {
    name: user?.name ?? profileData?.user?.name ?? null,
    email: user?.email ?? profileData?.user?.email ?? '',
  }
  const myCouple = swrCouple ?? couple ?? null

  const isActive = (href: string) => {
    if (pathname === href || pathname.startsWith(href + '/')) return true
    const group = GROUPS[href]
    return !!group && group.includes(pathname)
  }
  const partnerName = myCouple
    ? myCouple.partnerA.name !== me.name
      ? myCouple.partnerA.name
      : myCouple.partnerB.name
    : null

  return (
    <div className="app">
      {/* ДЕСКТОПНЫЙ HEADER */}
      <header className="hd">
        <div className="hd-in">
          <Link href="/dashboard" className="logo">
            <i></i>Together
          </Link>
          <nav className="nav" aria-label="Основная навигация">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={cn('nv', isActive(item.href) && 'on')}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
            <div className="hd-r">
              <div className="avs">
                <div className="av" title={me.name ?? undefined} aria-label={`Мой профиль: ${me.name ?? 'без имени'}`}>{initials(me.name)}</div>
                {myCouple && myCouple.status !== 'DELETED' && myCouple.status !== 'ARCHIVED' && <div className="av p" title={partnerName ?? undefined} aria-label={`Профиль партнёра: ${partnerName ?? ''}`}>{initials(partnerName)}</div>}
              </div>
              <Link href="/dashboard/settings" aria-label="Настройки" className="icon-btn">
                ⚙
              </Link>
              <button
                className={cn('icon-btn', pause.active && 'on')}
                aria-label={pause.active ? `Пауза активна · ${pauseFmt}` : 'Слово-стоп: пауза на 20 минут'}
                title={pause.active ? `Пауза · осталось ${pauseFmt}` : 'Слово-стоп: пауза на 20 минут'}
                onClick={() => pause.active ? setPauseOpen(true) : startPause()}
              >
                🛑
              </button>
              <button className="icon-btn" aria-label="Выйти" title="Выйти" onClick={() => signOut({ callbackUrl: '/' })}>
                ⎋
              </button>
            </div>
          </div>
        </header>

        {/* УВЕДОМЛЕНИЯ — фиксированные поверх всех экранов */}
        <button className="bell" aria-label="Уведомления" onClick={() => setNotifOpen(!notifOpen)}>
          🔔{notif.unread > 0 && <span className="bell-badge">{notif.unread > 9 ? '9+' : notif.unread}</span>}
        </button>

        {notifOpen && (
          <div className="bell-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
              <b style={{ fontSize: 14 }}>Уведомления</b>
              <button className="link-btn" style={{ margin: 0 }} onClick={readAll}>Прочитать все</button>
            </div>
            {notif.items.length === 0 && <div className="dim" style={{ padding: 20, textAlign: 'center', fontSize: 13 }}>Пока тихо</div>}
            {notif.items.map((n) => (
              <div key={n.id} className={`bell-item ${n.read ? '' : 'unread'}`} onClick={() => openItem(n)}>
                <span className="bell-ic">{NOTIF_ICON[n.type] ?? '💜'}</span>
                <div style={{ flex: 1 }}>
                  <b>{n.text}</b>
                  <span className="small">{timeAgo(n.createdAt)}</span>
                </div>
                {!n.read && <i className="bell-dot" />}
              </div>
            ))}
          </div>
        )}

      {/* ЭКРАН */}
      <div className="sc on">
        <div className="wrap">{children}</div>
      </div>

      {/* МОБИЛЬНЫЙ ТАБ-БАР */}
      <nav className="tb" aria-label="Основная навигация">
        {NAV_ITEMS.slice(0, 2).map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={cn('tbi', isActive(item.href) && 'on')}
            aria-current={isActive(item.href) ? 'page' : undefined}
          >
            <i>{item.icon}</i>
            <b>{item.label}</b>
          </Link>
        ))}
        <Link
          href="/dashboard/date"
          className={cn('tbi fab-m', isActive('/dashboard/date') && 'on')}
          aria-current={isActive('/dashboard/date') ? 'page' : undefined}
          aria-label="Свидание"
        >
          <i>📍</i>
          <b>Свидание</b>
        </Link>
        {NAV_ITEMS.slice(3).map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={cn('tbi', isActive(item.href) && 'on')}
            aria-current={isActive(item.href) ? 'page' : undefined}
          >
            <i>{item.icon}</i>
            <b>{item.label}</b>
          </Link>
        ))}
      </nav>

      {/* ТРЕВОЖНАЯ КНОПКА */}
      <button
        className="fab"
        onClick={() => setEmergencyOpen(true)}
        title="Техника деэскалации"
        aria-label="Техника деэскалации"
      >
        🕊️
      </button>

      {/* МОДАЛКА */}
      <div
        className={cn('modal', emergencyOpen && 'active')}
        onClick={(e) => {
          if (e.target === e.currentTarget) setEmergencyOpen(false)
        }}
      >
        <div className="modal-c">
          <h3>🕊️ Техника деэскалации</h3>
          <p>Когда эмоции зашкаливают, используйте метод «Я-высказывание»:</p>
          <ol className="modal-steps">
            <li><b>Когда ты</b> [конкретное действие без обвинений]</li>
            <li><b>Я чувствую</b> [ваша эмоция: тревога, обида, злость]</li>
            <li><b>Мне важно</b> [ваша потребность: безопасность, уважение]</li>
            <li><b>Давай</b> [конкретное предложение]</li>
          </ol>
          <button className="btn btn-p btn-w" style={{ marginTop: 20 }} onClick={() => setEmergencyOpen(false)}>
            Я готов(а) продолжить
          </button>
        </div>
      </div>

      {/* ПАУЗА (СТОП-СЛОВО) */}
      <div
        className={cn('modal', pauseOpen && 'active')}
        onClick={(e) => {
          if (e.target === e.currentTarget) setPauseOpen(false)
        }}
      >
        <div className="modal-c">
          <h3>🛑 Пауза</h3>
          {pause.active ? (
            <>
              <p className="dim">Стоп-слово сработало. Пауза активна ещё <b>{pauseFmt}</b>.</p>
              <p className="small dim" style={{ marginTop: 8 }}>
                Дышите. Когда будете готовы — вернитесь к разговору мягко.
              </p>
              <button className="btn btn-s btn-w" style={{ marginTop: 16 }} onClick={cancelPause}>Снять паузу</button>
            </>
          ) : (
            <>
              <p className="dim">Пауза даёт 20 минут, чтобы успокоиться, когда эмоции зашкаливают.</p>
              <button className="btn btn-p btn-w" style={{ marginTop: 16 }} onClick={startPause}>Начать паузу</button>
            </>
          )}
          <button className="link-btn" style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: 10 }} onClick={() => setPauseOpen(false)}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
