'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { registerServiceWorker } from '@/lib/push-client'
import { LogOut, AlertCircle } from 'lucide-react'
import { signOut } from 'next-auth/react'

const NAV_ITEMS = [
  { key: 'home', href: '/dashboard', label: 'Дом', icon: '🏠', headerLabel: 'Главная' },
  { key: 'couple', href: '/dashboard/couple', label: 'Мы', icon: '💞', headerLabel: 'Пара' },
  { key: 'daily', href: '/dashboard/daily', label: 'Будни', icon: '⚡', headerLabel: 'Будни' },
  { key: 'date', href: '/dashboard/date', label: 'Свидание', icon: '📍', headerLabel: 'Свидание' },
  { key: 'ai', href: '/dashboard/ai', label: 'Сова', icon: '🦉', headerLabel: 'Чат' },
]

interface DashboardLayoutProps {
  children: ReactNode
  user: {
    name: string | null
    email: string
    image: string | null
  }
  couple: {
    id: string
    partnerA: { name: string | null }
    partnerB: { name: string | null }
    status: string
  } | null
}

export function DashboardLayout({ children, user, couple }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [emergencyOpen, setEmergencyOpen] = useState(false)

  useEffect(() => {
    registerServiceWorker()
  }, [])

  const currentUserName = user.name || user.email.split('@')[0]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const handleDateClick = () => {
    router.push('/dashboard/date')
  }

  return (
    <div className="app">
      {/* ДЕСКТОПНЫЙ HEADER */}
      <header className="header">
        <div className="header-in">
          <Link href="/dashboard" className="logo">
            <i></i>Together
          </Link>
          <nav className="nav" aria-label="Основная навигация">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={cn('nav-btn', isActive(item.href) && 'on')}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hd-r">
            <div className="avs"><div className="av">Д</div><div className="av p">А</div></div>
            <Link href="/dashboard/settings" aria-label="Настройки">
              <button className="icon-btn">⚙</button>
            </Link>
          </div>
        </div>
      </header>

      {/* ЭКРАН */}
      <div className="screen">{children}</div>

      {/* МОБИЛЬНЫЙ ТАБ-БАР */}
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
        {/* Центральная кнопка «Свидание» — большой fab */}
        <button className="tbi fab-m" aria-label="Свидание" onClick={handleDateClick}>
          <i>📍</i>
          <b>Свидание</b>
        </button>
      </nav>

      {/* ТРЕВОЖНАЯ КНОПКА */}
      <button className="emergency-btn" onClick={() => setEmergencyOpen(true)} title="Экстренная помощь" aria-label="Экстренная помощь">
        🕊️
      </button>

      {/* МОДАЛКА */}
      <div
        className={cn('modal', emergencyOpen && 'active')}
        onClick={(e) => {
          if (e.target === e.currentTarget) setEmergencyOpen(false)
        }}
      >
        <div className="modal-content">
          <h3>🕊️ Техника деэскалации</h3>
          <p>Когда эмоции зашкаливают, используйте метод «Я-высказывание»:</p>
          <ol className="modal-steps">
            <li><strong>Когда ты</strong> [конкретное действие без обвинений]</li>
            <li><strong>Я чувствую</strong> [ваша эмоция: тревога, обида, злость]</li>
            <li><strong>Мне важно</strong> [ваша потребность: безопасность, уважение]</li>
            <li><strong>Давай</strong> [конкретное предложение]</li>
          </ol>
          <button className="modal-close" onClick={() => setEmergencyOpen(false)}>
            Я готов(а) продолжить
          </button>
        </div>
      </div>
    </div>
  )
}
