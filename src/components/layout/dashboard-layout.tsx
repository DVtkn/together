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
import { TabBar } from '@/components/navigation/tab-bar'
import { TopNav } from '@/components/navigation/top-nav'

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
    image?: null
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

function getNavMode(pathname: string): 'large' | 'inline' {
  if (pathname === '/dashboard' || pathname === '/dashboard/chat') return 'large'
  return 'inline'
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

  const navMode = getNavMode(pathname)
  const backHandler = navMode === 'inline'
    ? () => router.replace('/dashboard')
    : undefined

  return (
    <div className="app">
      <div className="bg" aria-hidden="true"><i /><i /><i /><i /></div>

      <Topbar user={me} couple={myCouple} />

      <TopNav
        title={navMode === 'large' ? 'Loop' : 'Loop'}
        mode={navMode}
        onBack={backHandler}
      />

      <div className="sc on">
        <div className="wrap">{children}</div>
      </div>

      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}
      </div>

      <TabBar />

      {moodOpen && <MoodModal onClose={() => setMoodOpen(false)} onSaved={setMyMood} />}
      <OnboardingTour />
    </div>
  )
}
