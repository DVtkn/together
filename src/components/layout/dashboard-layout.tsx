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
  const [moodOpen, setMoodOpen] = useState(false)
  const [myMood, setMyMood] = useState<{ emoji: string } | null>(null)
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([])
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
    return () => window.removeEventListener('together:toast', onToast)
  }, [])

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
        {NAV_ITEMS.map((item) => (
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
      <OnboardingTour />
    </div>
  )
}