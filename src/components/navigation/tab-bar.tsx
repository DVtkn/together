'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export function TabBar() {
  const [selectedTab, setSelectedTab] = useState('home')

  const TABS = [
    { key: 'home', href: '/dashboard', label: 'Дом', icon: '🏠' },
    { key: 'chat', href: '/dashboard/chat', label: 'Чат', icon: '💬' },
    { key: 'date', href: '/dashboard/date', label: 'Свидание', icon: '💜', isCenter: true },
    { key: 'couple', href: '/dashboard/couple', label: 'Пара', icon: '👥' },
    { key: 'ai', href: '/dashboard/ai', label: 'Психолог', icon: '🦉' },
  ]
  const centerIndex = TABS.findIndex(t => t.isCenter)

  useEffect(() => {
    const doc = document.documentElement
    doc.style.setProperty('--tab-selected', selectedTab)
  }, [selectedTab])

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-4 pb-4 safe-area-inset-bottom"
      aria-label="Основная навигация"
    >
      <div className="relative w-full flex justify-center">
        <span className="absolute -top-2 w-10 h-10 rounded-full bg-gradient-to-br from-[#5d48db] to-[#9685ff] flex items-center justify-center text-white text-xl shadow-lg shadow-[0_8px_24px_rgba(93,72,219,0.35)]">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14l-7 7L5 20l7-7 7 7L2 6l7-7 7 7z" />
            <circle cx="5" cy="5" r="3" />
          </svg>
        </span>
      </div>
      <div className="flex gap-2">
        {TABS.filter(t => !t.isCenter).map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className="flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors duration-200"
            onClick={() => setSelectedTab(t.key)}
            aria-label={t.label}
          >
            <i className="inline-block text-2xl">{t.icon}</i>
            <span className="mt-1 truncate">{t.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}