'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  '/dashboard/couple': ['/dashboard/couple', '/dashboard/assessments', '/dashboard/report', '/dashboard/astro'],
  '/dashboard/daily': ['/dashboard/daily', '/dashboard/pulse', '/dashboard/challenges', '/dashboard/partner'],
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
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const { data: profileData } = useProfile()
  const swrCouple = useCouple()

  useEffect(() => {
    registerServiceWorker()
  }, [])

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
              {myCouple && <div className="av p" title={partnerName ?? undefined} aria-label={`Профиль партнёра: ${partnerName ?? ''}`}>{initials(partnerName)}</div>}
            </div>
            <Link href="/dashboard/settings" aria-label="Настройки" className="icon-btn">
              ⚙
            </Link>
            <button className="icon-btn" aria-label="Выйти" title="Выйти" onClick={() => signOut({ callbackUrl: '/' })}>
              ⎋
            </button>
          </div>
        </div>
      </header>

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
    </div>
  )
}
