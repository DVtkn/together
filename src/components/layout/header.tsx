'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface HeaderProps {
  variant?: 'landing' | 'dashboard'
}

function MobileMenu({ isOpen, onToggle, variant }: { isOpen: boolean; onToggle: () => void; variant: 'landing' | 'dashboard' }) {
  return (
    <div className="fixed inset-0 z-40 bg-slate-950/90 dark:bg-slate-900/90 backdrop-blur-sm transition-all duration-300 ease-in-out transform duration-200" onClick={onToggle} style={{ pointerEvents: isOpen ? 'all' : 'none' }}>
      <div className="flex items-center justify-center h-full">
        <nav className="flex flex-col gap-6 py-12 mx-auto w-full max-w-md">
          <Link href="/" className="text-2xl font-bold text-slate-950 dark:text-slate-50 hover:text-rose-500 transition-colors" aria-label="Together Home">
            Together
          </Link>
          <div className="flex flex-col gap-4">
            {variant === 'landing' ? (
              <>
                <Link href="/signin" className="text-lg font-medium text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-slate-100">Войти</Link>
                <Button asChild size="sm" onClick={onToggle}>
                  <Link href="/register">Начать</Link>
                </Button>
              </>
            ) : (
              <>
                <Link href="/dashboard" className="text-lg font-medium text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-slate-100">Дашборд</Link>
                <Link href="/dashboard/report" className="text-lg font-medium text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-slate-100">Отчёт</Link>
                <Link href="/dashboard/ai" className="text-lg font-medium text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-slate-100">ИИ-ассистент</Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </div>
  )
}

export function Header({ variant = 'landing' }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      variant === 'landing' ? 'bg-transparent' : 'bg-white/80 backdrop-blur-md border-b border-slate-200 dark:bg-slate-950/80 dark:border-slate-800'
    )}>
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2" aria-label="Together Home">
              <svg className="h-8 w-8 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span className="text-xl font-semibold text-slate-950 dark:text-slate-50">Together</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {variant === 'landing' ? (
              <>
                <Button onClick={() => setIsOpen(true)} size="sm" className="hidden sm:block">
                  Войти
                </Button>
                <Button asChild size="sm" onClick={() => setIsOpen(true)}>
                  <Link href="/register">Начать</Link>
                </Button>
              </>
            ) : (
              <>
                <Link href="/dashboard" className="text-sm font-medium text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-slate-100">
                  Дашборд
                </Link>
                <Link href="/dashboard/report" className="text-sm font-medium text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-slate-100">
                  Отчёт
                </Link>
                <Link href="/dashboard/ai" className="text-sm font-medium text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-slate-100">
                  ИИ-ассистент
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </nav>

      <MobileMenu isOpen={isOpen} onToggle={() => setIsOpen(false)} variant={variant} />
    </header>
  )
}