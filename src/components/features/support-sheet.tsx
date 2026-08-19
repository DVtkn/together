'use client'

import { useState } from 'react'
import { toast } from '@/lib/toast'

export const SUPPORT_PHRASES = ['Я рядом 🤍', 'Ты у меня самая лучшая', 'Давай вечером просто обнимемся']

interface SupportSheetProps {
  open: boolean
  partnerName: string
  partnerMoodText?: string | null
  onClose: () => void
}

export function SupportSheet({ open, partnerName, partnerMoodText, onClose }: SupportSheetProps) {
  const [ownText, setOwnText] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) return null

  async function sendSupport(text: string) {
    const value = text.trim()
    if (value.length < 2 || busy) return
    setBusy(true)
    try {
      const r = await fetch('/api/warmth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value }),
      })
      if (r.ok) {
        toast('Поддержка отправлена 💌')
        setOwnText('')
        onClose()
        window.dispatchEvent(new Event('together:refresh'))
      } else {
        const d = await r.json().catch(() => null)
        toast(d?.error ?? 'Не получилось отправить')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sheet" role="dialog" aria-label="Поддержать партнёра">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <b>Поддержать: {partnerName} сейчас «{partnerMoodText ?? '—'}»</b>
        <button className="link-btn" style={{ margin: 0, padding: 0, flexShrink: 0 }} onClick={onClose} aria-label="Закрыть">✕</button>
      </div>
      <div style={{ marginTop: 12 }}>
        {SUPPORT_PHRASES.map(p => (
          <button className="sheet-item sheet-btn" key={p} disabled={busy} onClick={() => sendSupport(p)}>{p}</button>
        ))}
      </div>
      <textarea
        className="auth-input"
        style={{ marginTop: 10, width: '100%' }}
        placeholder="Своими словами…"
        value={ownText}
        onChange={e => setOwnText(e.target.value)}
      />
      <button
        className="btn btn-p btn-w"
        style={{ marginTop: 10 }}
        disabled={ownText.trim().length < 2 || busy}
        onClick={() => sendSupport(ownText)}
      >
        Отправить
      </button>
    </div>
  )
}