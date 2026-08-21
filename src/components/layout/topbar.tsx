'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils/cn'
import { useProfile } from '@/lib/hooks'

interface TopbarProps {
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

export function Topbar({ user, couple }: TopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notif, setNotif] = useState<{ items: Array<{ id: string; type: string; text: string; href: string | null; read: boolean; createdAt: string }>; unread: number }>({ items: [], unread: 0 })
  const { data: profileData } = useProfile()

  const me = {
    name: user?.name ?? profileData?.user?.name ?? null,
    email: user?.email ?? profileData?.user?.email ?? '',
  }

  const myCouple = couple
  const partnerName = myCouple
    ? myCouple.partnerA.name !== me.name
      ? myCouple.partnerA.name
      : myCouple.partnerB.name
    : null

  const loadNotif = () => {
    fetch('/api/notifications?limit=30').then((r) => r.json()).then((d) => {
      if (d && Array.isArray(d.items)) setNotif({ items: d.items, unread: d.unread ?? 0 })
    }).catch(() => {})
  }

  useEffect(() => {
    loadNotif()
    const t = setInterval(loadNotif, 20000)
    const refresh = () => loadNotif()
    window.addEventListener('together:refresh', refresh)
    return () => {
      clearInterval(t)
      window.removeEventListener('together:refresh', refresh)
    }
  }, [])

  const readAll = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' })
    setNotif((p) => ({ items: p.items.map((i) => ({ ...i, read: true })), unread: 0 }))
  }

  const openItem = async (n: { id: string; type: string; text: string; href: string | null; read: boolean; createdAt: string }) => {
    if (!n.read) {
      setNotif((p) => ({ items: p.items.map((i) => (i.id === n.id ? { ...i, read: true } : i)), unread: Math.max(0, p.unread - 1) }))
      fetch(`/api/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {})
    }
    setNotifOpen(false)
    if (n.href) router.push(n.href)
  }

  const timeAgo = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return 'только что'
    if (min < 60) return `${min} мин назад`
    const hours = Math.floor(min / 60)
    if (hours < 24) return `${hours} ч назад`
    const days = Math.floor(hours / 24)
    return `${days} дн назад`
  }

  const NOTIF_ICON: Record<string, string> = {
    couple_requested: '💞', couple_accepted: '💞', couple_rejected: '💞',
    date_invited: '📍', date_planned: '📍',
    craving_added: '🎁', craving_picked: '🎁',
    mood_changed: '🫀', assessment_completed: '🧪', challenge_completed: '🌙',
    couple_message: '💬', daily_answered: '☀️', memory_added: '📸',
    ritual_added: '🕊️', ritual_done: '✓', letter_sent: '💌',
    signal_received: '🤗', signal_accepted: '🤍',
    pause_started: '🛑', pause_ended: '⏸️', warmth_added: '💌',
    daily_revealed: '🔮',
  }

  return (
    <>
      <header className="topbar" role="banner">
        <Link href="/dashboard" className="logo" aria-label="Loop — Дом">
          <i>∞</i>Loop
        </Link>
        <div className="topbar-r">
          <button
            className="icon-btn"
            aria-label={notif.unread > 0 ? `Уведомления, ${notif.unread} непрочитанных` : 'Уведомления'}
            onClick={() => setNotifOpen(!notifOpen)}
          >
            🔔{notif.unread > 0 && <span className="bell-badge">{notif.unread > 9 ? '9+' : notif.unread}</span>}
          </button>
          <button
            className="avatar-btn"
            aria-label="Меню профиля"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {initials(me.name)}
            {myCouple && myCouple.status !== 'DELETED' && myCouple.status !== 'ARCHIVED' && <span className="avatar-partner">{initials(partnerName)}</span>}
          </button>
        </div>
      </header>

      {notifOpen && (
        <div className="bell-panel" role="dialog" aria-label="Уведомления">
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

      {menuOpen && (
        <div className="menu-panel" role="menu" onClick={(e) => { if (e.target === e.currentTarget) setMenuOpen(false) }}>
          <Link href="/dashboard/settings" className="menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>👤 Профиль</Link>
          <Link href="/dashboard/settings" className="menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>⚙ Настройки</Link>
          <Link href="/dashboard/story" className="menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>📖 История пары</Link>
          <button className="menu-item" role="menuitem" onClick={() => signOut({ callbackUrl: '/' })}>⎋ Выйти</button>
        </div>
      )}
    </>
  )
}