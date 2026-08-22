'use client'

import { useState, useEffect } from 'react'

// Large Title scroll state - shrinks when user scrolls down
function useLargeTitle() {
  const [isSmall, setIsSmall] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const top = window.pageYOffset
      if (top > 100) setIsSmall(true)
      else setIsSmall(false)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return { isSmall }
}

// Large Title header (96px with scrolling effect)
function LargeTitle({ title, onBack }: { title: string; onBack?: () => void }) {
  const { isSmall } = useLargeTitle()
  const height = isSmall ? 72 : 96

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-height duration-200"
      style={{ height: height }}
    >
      <div className="max-w-7xl mx-auto px-6 h-full">
        <div className="h-16/12 -bottom-1/12 left-0 right-0 flex items-baseline justify-between">
          <h1 className="text-3xl font-bold text-ios-orange dark:text-white">
            {title}
          </h1>
          {onBack && (
            <button
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={onBack}
              aria-label="Назад"
            >
              ← Назад
            </button>
          )}
        </div>
        <div className="h-44/12 border-t border-2 border-black/10 dark:border-black/10"></div>
      </div>
    </header>
  )
}

// Inline Title header (44px)
function InlineTitle({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-14 pb-2 backdrop-blur-xl bg-white/70 border-b border-2 border-black/10 dark:bg-[rgba(22,22,22,0.9)] dark:border-black/10"
      >
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-ios-orange dark:text-white">
            {title}
          </h2>
        </div>
        <div className="flex items-center">
          {onBack && (
            <button
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={onBack}
              aria-label="Назад"
            >
              ← Назад
            </button>
          )}
          <a
            href="/dashboard/settings"
            className="ml-4 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Настройки"
          >
            ⚙️
          </a>
        </div>
      </div>
    </header>
  )
}

export function TopNav({ title, mode, onBack }: { title: string; mode: 'large' | 'inline'; onBack?: () => void }) {
  const { isSmall } = useLargeTitle()

  const navHeight = mode === 'large' ? (isSmall ? 72 : 96) : 44

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-height duration-200"
      style={{ height: navHeight }}
    >
      {mode === 'large' ? (
        <LargeTitle title={title} onBack={onBack} />
      ) : (
        <InlineTitle title={title} onBack={onBack} />
      )}
    </header>
  )
}