'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils/cn'
import { registerServiceWorker } from '@/lib/push-client'
import {
  LayoutDashboard,
  BarChart2,
  HeartPulse,
  Target,
  Bot,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  MapPin,
  Heart,
} from 'lucide-react'
import { signOut } from 'next-auth/react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/dashboard/partner', label: 'Партнёр', icon: Heart },
  { href: '/dashboard/report', label: 'Отчёт', icon: BarChart2 },
  { href: '/dashboard/pulse', label: 'Пульс', icon: HeartPulse },
  { href: '/dashboard/challenges', label: 'Челленджи', icon: Target },
  { href: '/dashboard/venues', label: 'Места', icon: MapPin },
  { href: '/dashboard/ai', label: 'ИИ-ассистент', icon: Bot },
  { href: '/dashboard/settings', label: 'Настройки', icon: Settings },
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
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    registerServiceWorker()
  }, [])

  const currentUserName = user.name || user.email.split('@')[0]
  const partner = couple
    ? couple.partnerA.name !== currentUserName
      ? couple.partnerA
      : couple.partnerB
    : null

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
          <Link href="/dashboard" className="flex items-center space-x-2" aria-label="Together Dashboard">
            <svg className="h-8 w-8 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {sidebarOpen && <span className="text-xl font-semibold text-slate-950 dark:text-slate-50">Together</span>}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Свернуть меню' : 'Развернуть меню'}
            className="text-slate-500 hover:text-slate-950 dark:hover:text-slate-100"
          >
            {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </Button>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto" aria-label="Dashboard navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            )
          })}

          {couple && couple.status === 'PENDING' && (
            <div className="mx-2 mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
              <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <span>Ожидание партнёра</span>
              </div>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.image || undefined} alt={currentUserName} />
              <AvatarFallback>{currentUserName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-950 dark:text-slate-50 truncate">{currentUserName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
              </div>
            )}
          </div>
          {sidebarOpen && partner && (
            <div className="mt-2 px-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ваш партнёр</p>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                <Avatar className="h-7 w-7">
                  <AvatarFallback>{partner.name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-slate-950 dark:text-slate-50 truncate">{partner.name || 'Партнёр'}</span>
              </div>
            </div>
          )}
          {sidebarOpen && (
            <Button
              variant="ghost"
              className="w-full mt-4 justify-start text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
              onClick={() => signOut({ callbackUrl: '/signin' })}
            >
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Выйти
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          'flex-1 flex flex-col overflow-hidden transition-all duration-300',
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
        )}
      >
        <div className="flex-1 overflow-y-auto pt-16 lg:pt-0">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}