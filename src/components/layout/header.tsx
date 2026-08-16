'use client'

import Link from 'next/link'
import { useState } from 'react'

const LANDING_LINKS = [
  { href: '#features', label: 'Возможности' },
  { href: '#how', label: 'Как это работает' },
  { href: '#science', label: 'Методики' },
]

function MobileMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 bg-[rgba(11,15,25,.95)] backdrop-blur-md"
      onClick={onClose}
      style={{ pointerEvents: isOpen ? 'all' : 'none', opacity: isOpen ? 1 : 0, transition: 'opacity .25s ease' }}
    >
      <div className="flex items-center justify-center h-full">
        <nav className="flex flex-col gap-6 py-12 mx-auto w-full max-w-md items-center">
          <Link href="/" className="logo" aria-label="Together Home" onClick={onClose}>
            <i></i>Together
          </Link>
          {LANDING_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="nv" onClick={onClose}>
              {l.label}
            </Link>
          ))}
          <div className="flex flex-col gap-3 w-64 mt-4">
            <Link href="/signin" className="btn btn-s" onClick={onClose}>
              Войти
            </Link>
            <Link href="/register" className="btn btn-p" onClick={onClose}>
              Начать бесплатно
            </Link>
          </div>
        </nav>
      </div>
    </div>
  )
}

const Header = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="lp-h">
      <div className="lp-h-in">
        <Link href="/" className="logo">
          <i></i>Together
        </Link>
        <nav className="lp-nav" aria-label="Основная навигация">
          {LANDING_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="nv">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hd-r" style={{ marginLeft: 'auto' }}>
          <Link href="/signin" className="btn btn-s btn-sm">
            Войти
          </Link>
          <Link href="/register" className="btn btn-p btn-sm">
            Начать
          </Link>
        </div>
        <button className="lp-burger" onClick={() => setIsOpen(true)} aria-label="Открыть меню">
          ☰
        </button>
      </div>
      <MobileMenu isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </header>
  )
}

export { Header }
