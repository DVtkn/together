'use client'

import { ReactNode, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils/cn'
import { useCouple, useProfile } from '@/lib/hooks'
import { registerServiceWorker } from '@/lib/push-client'
import { OnboardingTour } from '@/components/onboarding-tour'
import { MoodModal } from '@/components/mood-modal'
import { toast } from '@/lib/toast'

const NAV_ITEMS = [
  { key: 'home', href: '/dashboard', label: 'Дом', icon: '🏠' },
  { key: 'couple', href: '/dashboard/couple', label: 'Пара', icon: '💞' },
  { key: 'date', href: '/dashboard/date', label: 'Свидание', icon: '📍' },
  { key: 'daily', href: '/dashboard/daily', label: 'День', icon: '⚡' },
  { key: 'ai', href: '/dashboard/ai', label: 'Психолог', icon: '🦉' },
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

interface Signal {
  id: string
  emoji: string
  meaning: string
  suggestedReply: string
}

interface SignalStatus {
  lastSent: { signalId: string; emoji: string; meaning: string; at: string; answered: boolean } | null
  incoming: { signalId: string; emoji: string; meaning: string; suggestedReply: string; at: string } | null
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
  signal_accepted: '🤍',
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [moodOpen, setMoodOpen] = useState(false)
  const [myMood, setMyMood] = useState<{ emoji: string } | null>(null)
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([])
  const [theme, setTheme] = useState<'aurora' | 'night'>('aurora')
  const [sigOpen, setSigOpen] = useState(false)
  const [signals, setSignals] = useState<Signal[]>([])
  const [signalStatus, setSignalStatus] = useState<SignalStatus>({ lastSent: null, incoming: null })
  const [confirmSignal, setConfirmSignal] = useState<Signal | null>(null)
  const { data: profileData } = useProfile()
  const swrCouple = useCouple()

  useEffect(() => {
    registerServiceWorker()
    const onToast = (e: Event) => {
      const text = (e as CustomEvent<{ text: string }>).detail?.text
      if (!text) return
      const id = Date.now() + Math.random()
      setToasts((p) => [...p, { id, text }])
      setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 2500)
    }
    window.addEventListener('together:toast', onToast)
    const t = setInterval(() => {
      fetch('/api/pause').then(r => r.json()).then(p => {
        if (p) setPause({ active: p.active ?? false, secondsLeft: p.secondsLeft ?? 0 })
      }).catch(() => {})
    }, 10000)
    return () => {
      clearInterval(t)
      window.removeEventListener('together:toast', onToast)
    }
  }, [])

  useEffect(() => {
    const apply = (t: string) => {
      const value: 'aurora' | 'night' = t === 'night' ? 'night' : 'aurora'
      document.body.classList.remove('aurora', 'night')
      document.body.classList.add(value)
      setTheme(value)
      try { localStorage.setItem('loop:theme', value) } catch { /* ignore */ }
    }
    const load = () => {
      fetch('/api/user/theme').then(r => r.json()).then(d => apply(d?.theme ?? 'aurora')).catch(() => {})
    }
    let cached: string | null = null
    try { cached = localStorage.getItem('loop:theme') } catch { /* ignore */ }
    apply(cached ?? 'aurora')
    load()
    const onTheme = () => load()
    window.addEventListener('together:theme', onTheme)
    return () => window.removeEventListener('together:theme', onTheme)
  }, [])

  const startPause = async () => {
    const r = await fetch('/api/pause', { method: 'POST' }).catch(() => null)
    if (r && r.ok) {
      const j = await r.json()
      setPause({ active: true, secondsLeft: j.secondsLeft ?? 1200 })
      setPauseOpen(true)
      toast('Стоп-слово: пауза на 20 минут 🛑')
      window.dispatchEvent(new Event('together:refresh'))
    }
  }

  const cancelPause = async () => {
    const r = await fetch('/api/pause', { method: 'DELETE' }).catch(() => null)
    if (r && r.ok) {
      setPause({ active: false, secondsLeft: 0 })
      setPauseOpen(false)
      toast('Пауза снята — можно продолжить 💜')
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

  const loadMood = useCallback(() => {
    fetch('/api/mood').then((r) => r.json()).then((m) => {
      if (m && m.mine) setMyMood({ emoji: m.mine.emoji })
    }).catch(() => {})
  }, [])

  useEffect(() => {
    loadMood()
    window.addEventListener('together:refresh', loadMood)
    return () => window.removeEventListener('together:refresh', loadMood)
  }, [loadMood])

  const loadSignal = useCallback(() => {
    fetch('/api/signals').then((r) => r.json()).then((d) => {
      if (!d) return
      setSignals(d.signals ?? [])
      setSignalStatus({ lastSent: d.lastSent ?? null, incoming: d.incoming ?? null })
    }).catch(() => {})
  }, [])

  useEffect(() => {
    loadSignal()
    const t = setInterval(loadSignal, 8000)
    const refresh = () => loadSignal()
    window.addEventListener('together:refresh', refresh)
    const onOpen = (e: Event) => {
      const type = (e as CustomEvent).detail?.type
      if (type === 'signal') setSigOpen(true)
      if (type === 'mood') setMoodOpen(true)
    }
    window.addEventListener('together:open', onOpen)
    return () => {
      clearInterval(t)
      window.removeEventListener('together:refresh', refresh)
      window.removeEventListener('together:open', onOpen)
    }
  }, [loadSignal])

  const respondToSignal = (inc: NonNullable<SignalStatus['incoming']>) => {
    fetch(`/api/signals/${inc.signalId}/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    }).catch(() => {})
    setSignalStatus((p) => ({ ...p, incoming: null }))
    toast('Отклик отправлен 🤍')
    window.dispatchEvent(new Event('together:refresh'))
    router.push(inc.suggestedReply ? `/dashboard/ai?reply=${encodeURIComponent(inc.suggestedReply)}` : '/dashboard/ai')
  }

  const dismissIncoming = () => {
    const inc = signalStatus.incoming
    if (!inc) return
    fetch(`/api/signals/${inc.signalId}/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'later' }),
    }).catch(() => {})
    setSignalStatus((p) => ({ ...p, incoming: null }))
    window.dispatchEvent(new Event('together:refresh'))
  }

  const sendSignal = async (s: Signal) => {
    const r = await fetch(`/api/signals/${s.id}/send`, { method: 'POST' }).catch(() => null)
    setConfirmSignal(null)
    if (r?.ok) toast('Сигнал отправлен партнёру 🤗')
    window.dispatchEvent(new Event('together:refresh'))
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
    if (pathname === href) return true
    if (href !== '/dashboard' && pathname.startsWith(href + '/')) return true
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
      <div className="bg" aria-hidden="true"><i /><i /><i /><i /></div>
      {/* ДЕСКТОПНЫЙ HEADER */}
      <header className="hd">
        <div className="hd-in">
          <Link href="/dashboard" className="logo">
            <i>∞</i>Loop
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
              <div className="avs-wrap">
                <div className="avs" role="button" tabIndex={0} aria-label="Меню профиля" onClick={() => setMenuOpen(o => !o)} onKeyDown={(e) => { if (e.key === 'Enter') setMenuOpen(o => !o) }}>
                  <div className="av" title={me.name ?? undefined} aria-hidden="true">{initials(me.name)}</div>
                  {myCouple && myCouple.status !== 'DELETED' && myCouple.status !== 'ARCHIVED' && <div className="av p" title={partnerName ?? undefined} aria-hidden="true">{initials(partnerName)}</div>}
                </div>
                {menuOpen && (
                  <div className="menu-panel" role="menu">
                    <Link href="/dashboard/settings" className="menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>👤 Профиль</Link>
                    <Link href="/dashboard/settings" className="menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>⚙ Настройки</Link>
                    <Link href="/dashboard/story" className="menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>📖 История пары</Link>
                    <button className="menu-item" role="menuitem" onClick={() => signOut({ callbackUrl: '/' })}>⎋ Выйти</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* УВЕДОМЛЕНИЯ — фиксированные поверх всех экранов */}
        <button className="bell" aria-label="Уведомления" onClick={() => setNotifOpen(!notifOpen)}>
          🔔{notif.unread > 0 && <span className="bell-badge">{notif.unread > 9 ? '9+' : notif.unread}</span>}
        </button>

        {/* НАСТРОЕНИЕ — быстрый тап с любой страницы */}
        <button className="mood-fab" aria-label="Отметить настроение" title="Как ты?" onClick={() => setMoodOpen(true)}>
          {myMood?.emoji ?? '🙂'}
        </button>

        {/* ТИХИЙ СИГНАЛ — быстрый доступ */}
        <button className="sig-fab" aria-label="Тихий сигнал" title="Тихий сигнал" onClick={() => setSigOpen(true)}>
          🕊️
          {signalStatus.incoming && <span className="sig-badge">{signalStatus.incoming.emoji}</span>}
        </button>

        {moodOpen && <MoodModal onClose={() => setMoodOpen(false)} onSaved={setMyMood} />}

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

      {/* ТОСТЫ */}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}
      </div>

      {/* ОНБОРДИНГ */}
      <OnboardingTour />

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

      {/* ТИХИЙ СИГНАЛ — bottom sheet */}
      <div
        className={cn('modal', sigOpen && 'active')}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSigOpen(false)
        }}
      >
        <div className="modal-c">
          <h3>🕊️ Тихий сигнал</h3>
          <p>Партнёр получит сигнал и подсказку, как ответить мягко.</p>

          {signalStatus.incoming && (
            <div className="signal-incoming">
              <div className="cd-r">
                <div className="cd-ic" style={{ fontSize: 22 }}>{signalStatus.incoming.emoji}</div>
                <div className="cd-t">
                  <b>{partnerName} просит поддержки</b>
                  <span>Сигнал «{signalStatus.incoming.meaning}» · {timeAgo(signalStatus.incoming.at)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-p btn-sm" onClick={() => respondToSignal(signalStatus.incoming!)}>Ответить мягко</button>
                <button className="btn btn-s btn-sm" onClick={dismissIncoming}>Сейчас не могу</button>
              </div>
            </div>
          )}

          {signals.length > 0 ? (
            <div className="signal-row">
              {signals.map((s) => {
                const status = signalStatus.lastSent?.signalId === s.id
                  ? (signalStatus.lastSent.answered ? 'confirmed' : 'sent')
                  : null
                return (
                  <button key={s.id} className={cn('signal-btn', status && (status === 'sent' ? 'sent' : 'confirmed'))}
                    onClick={() => setConfirmSignal(s)} title={s.meaning}>
                    <span>{s.emoji}</span>
                    <b>{s.meaning}</b>
                    <i className="small">{partnerName ? `${partnerName} увидит: «${s.suggestedReply}»` : s.suggestedReply}</i>
                    {status === 'sent' && <span className="signal-ok">⏳</span>}
                    {status === 'confirmed' && <span className="signal-ok">🤍</span>}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="dim" style={{ fontSize: 13 }}>Партнёра пока нет — сигналы появятся, когда вы соединитесь.</div>
          )}

          {signalStatus.lastSent && (
            <div className="signal-status">
              {signalStatus.lastSent.answered
                ? `🤍 ${partnerName} откликнулся(ась) · ${timeAgo(signalStatus.lastSent.at)}`
                : `⏳ Отправлено · ждём отклика · ${timeAgo(signalStatus.lastSent.at)}`}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--line)', margin: '16px 0', height: 0 }} />

          <button className="btn btn-s btn-w" onClick={() => { setSigOpen(false); if (pause.active) setPauseOpen(true); else startPause() }}>
            {pause.active ? `⏸️ Пауза активна · осталось ${pauseFmt}` : '🛑 Слово-стоп · пауза 20 минут'}
          </button>
          <button className="link-btn" style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: 10 }} onClick={() => { setSigOpen(false); router.push('/dashboard/settings#signals') }}>
            Настроить свои сигналы
          </button>
        </div>
      </div>

      {/* ПОДТВЕРЖДЕНИЕ СИГНАЛА */}
      {confirmSignal && (
        <div className="modal active" onClick={(e) => e.target === e.currentTarget && setConfirmSignal(null)}>
          <div className="modal-c" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44 }}>{confirmSignal.emoji}</div>
            <h3 style={{ margin: '8px 0 6px' }}>Отправить «{confirmSignal.meaning}»?</h3>
            <p className="dim" style={{ fontSize: 13 }}>{partnerName} получит уведомление с сигналом и подсказкой, как ответить мягко.</p>
            <button className="btn btn-p btn-w" style={{ marginTop: 14 }} onClick={() => sendSignal(confirmSignal)}>Отправить</button>
            <button className="btn btn-s btn-w" style={{ marginTop: 8 }} onClick={() => setConfirmSignal(null)}>Отмена</button>
          </div>
        </div>
      )}

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
