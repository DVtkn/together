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
import { Topbar } from './topbar'

const NAV_ITEMS = [
  { key: 'home', href: '/dashboard', label: 'Дом', icon: '🏠' },
  { key: 'couple', href: '/dashboard/couple', label: 'Пара', icon: '💞' },
  { key: 'date', href: '/dashboard/date', label: 'Свидание', icon: '📍' },
  { key: 'ai', href: '/dashboard/ai', label: 'Психолог', icon: '🦉' },
]

const GROUPS: Record<string, string[]> = {
  '/dashboard/couple': ['/dashboard/couple', '/dashboard/assessments'],
  '/dashboard/date': ['/dashboard/date'],
  '/dashboard/ai': ['/dashboard/ai'],
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
  const [pause, setPause] = useState<{ active: boolean; secondsLeft: number }>({ active: false, secondsLeft: 0 })
  const [pauseOpen, setPauseOpen] = useState(false)
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
      try {
        localStorage.setItem('loop:theme', value)
        document.cookie = `loop:theme=${value};path=/;max-age=31536000;samesite=lax`
      } catch { /* ignore */ }
    }
    const load = () => {
      fetch('/api/user/theme').then(r => r.json()).then(d => apply(d?.theme ?? 'aurora')).catch(() => {})
    }
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

      <Topbar user={me} couple={myCouple} />

      <div className="sc on">
        <div className="wrap">{children}</div>
      </div>

      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}
      </div>

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

      {moodOpen && <MoodModal onClose={() => setMoodOpen(false)} onSaved={setMyMood} />}

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
                ? `🤍 ${partnerName} откликнулся(ась) · {timeAgo(signalStatus.lastSent.at)}`
                : `⏳ Отправлено · ждём отклика · {timeAgo(signalStatus.lastSent.at)}`}
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

      <OnboardingTour />
    </div>
  )
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