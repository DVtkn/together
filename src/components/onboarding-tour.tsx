'use client'

import { useEffect, useRef, useState } from 'react'

const STEPS = [
  { title: 'Здесь разделы', text: 'Дом · Пара · Свидание · День · Психолог. Всё в пяти вкладках — каждая сущность живёт в одном месте.' },
  { title: 'Уведомления', text: 'Колокольчик показывает действия партнёра: сообщения, письма, сигналы и подарки.' },
  { title: 'Ваш следующий шаг', text: 'Градиентная кнопка — главное действие на этом экране. Остальное — вторичное.' },
  { title: 'Меню аватара', text: 'Здесь профиль, настройки, история пары и выход из аккаунта.' },
]

function targetFor(step: number): string {
  switch (step) {
    case 0: return '.tb'
    case 1: return '.bell'
    case 2: return '.btn-primary'
    case 3: return '.avs'
    default: return ''
  }
}

export function OnboardingTour() {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (window.location.pathname !== '/dashboard') return
    fetch('/api/user/onboarding').then(r => r.json()).then((d) => {
      if (d && !d.done) setShow(true)
    }).catch(() => {})
  }, [])

  const refreshRect = () => {
    const el = document.querySelector(targetFor(step))
    if (!el) { setRect(null); return }
    const r = el.getBoundingClientRect()
    setRect({ x: r.x, y: r.y, w: r.width, h: r.height })
  }

  useEffect(() => {
    if (!show) return
    setTimeout(refreshRect, 0)
    const t = setInterval(refreshRect, 500)
    const onResize = () => refreshRect()
    window.addEventListener('resize', onResize)
    return () => { clearInterval(t); window.removeEventListener('resize', onResize) }
  }, [show, step])

  const next = () => {
    if (step >= STEPS.length - 1) {
      fetch('/api/user/onboarding', { method: 'POST' }).catch(() => {})
      setShow(false)
      return
    }
    setStep((s) => s + 1)
  }

  const skip = () => {
    fetch('/api/user/onboarding', { method: 'POST' }).catch(() => {})
    setShow(false)
  }

  if (!show) return null

  const tip = STEPS[step]

  return (
    <div className="tour" aria-hidden="false">
      <div className="tour-mask" />
      {rect && <div className="tour-spot" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }} />}
      <div className="tour-bubble" style={{ bottom: rect && rect.y > window.innerHeight - 140 ? 'auto' : 96, top: rect && rect.y > window.innerHeight - 140 ? rect.y - 140 : undefined }}>
        <div className="tour-k">{step + 1} из {STEPS.length}</div>
        <b>{tip.title}</b>
        <p>{tip.text}</p>
        <div className="tour-actions">
          <button className="btn btn-primary" onClick={next}>{step >= STEPS.length - 1 ? 'Готово' : 'Далее'}</button>
          <button className="link-btn" onClick={skip}>Пропустить</button>
        </div>
      </div>
    </div>
  )
}