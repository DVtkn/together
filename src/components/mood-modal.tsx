'use client'

import { useState } from 'react'

const MOODS = [
  { emoji: '😄', text: 'Всё супер' },
  { emoji: '🙂', text: 'Нормально' },
  { emoji: '😐', text: 'Спокойно' },
  { emoji: '🥺', text: 'Мне грустно' },
  { emoji: '😰', text: 'Тревожусь' },
  { emoji: '😤', text: 'Раздражён' },
]

export function MoodModal({ onClose, onSaved }: { onClose: () => void; onSaved: (m: { emoji: string }) => void }) {
  const [saved, setSaved] = useState(false)

  async function tap(m: { emoji: string; text: string }) {
    try {
      await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji: m.emoji, text: m.text }),
      })
      setSaved(true)
      window.dispatchEvent(new Event('together:refresh'))
      setTimeout(() => {
        onSaved({ emoji: m.emoji })
        onClose()
      }, 700)
    } catch {
      onClose()
    }
  }

  return (
    <div className="modal active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-c">
        <h3 style={{ textAlign: 'center', marginBottom: 14 }}>Как ты?</h3>
        <div className="mood-row">
          {MOODS.map((m) => (
            <button key={m.emoji} className="mood-big" onClick={() => tap(m)}>
              <i>{m.emoji}</i>
              <b>{m.text}</b>
            </button>
          ))}
        </div>
        <div className="autosave-hint">{saved ? '✓ Записано. Партнёр увидит.' : '💜 Один тап — и записано'}</div>
      </div>
    </div>
  )
}