'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

interface Ritual {
  id: string
  title: string
  emoji: string
  daysOfWeek: number[]
  mine: boolean
  partner: boolean
}

const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const RITUAL_IDEAS = [
  { t: 'Утренний кофе молча', e: '☕' },
  { t: 'Вечерний чек-ин', e: '🌙' },
  { t: 'Пятничное свидание', e: '📍' },
  { t: 'Совместная зарядка', e: '🏃' },
  { t: 'Воскресный обед', e: '🍲' },
  { t: 'Телефон — в ящик', e: '📵' },
]

export default function RitualsPage() {
  const [items, setItems] = useState<Ritual[]>([])
  const [loading, setLoading] = useState(true)
  const [hasCouple, setHasCouple] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('🕊️')

  const load = useCallback(() => {
    fetch('/api/user/profile').then(r => r.json()).then(d => {
      setHasCouple(Boolean(d.couple?.partnerName))
    }).catch(() => {})
    fetch('/api/rituals').then(r => r.json()).then(d => {
      setItems(d.items ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const addRitual = async (t?: string, e?: string) => {
    const ritualTitle = t ?? title.trim()
    if (!ritualTitle) return
    setBusy(true); setErr(null)
    try {
      const r = await fetch('/api/rituals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: ritualTitle, emoji: e ?? emoji }),
      })
      const j = await r.json()
      if (!r.ok) { setErr(j?.error ?? 'Не получилось'); return }
      setItems(prev => [...prev, j.item])
      setTitle(''); setOpen(false)
      window.dispatchEvent(new Event('together:refresh'))
    } catch { setErr('Сеть недоступна') }
    finally { setBusy(false) }
  }

  const toggleDone = async (id: string) => {
    const r = await fetch(`/api/rituals/${id}/done`, { method: 'POST' })
    const j = await r.json()
    if (j.ok) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, mine: j.mine } : i))
      window.dispatchEvent(new Event('together:refresh'))
    }
  }

  if (loading) return (
    <DashboardLayout>
      <div className="loading-screen"><div className="loading-icon">🕊️</div><div className="loading-text">Загружаем</div></div>
    </DashboardLayout>
  )

  if (!hasCouple) return (
    <DashboardLayout>
      <div className="h1">Ритуалы</div>
      <div className="dim">Маленькие повторяющиеся традиции пары.</div>
      <div className="cd static pair-hero">
        <div className="pair-emoji">🕊️</div>
        <div className="h2" style={{ marginBottom: 6 }}>Сначала создайте пару</div>
        <span className="dim">Ритуалы появятся, когда вы соединитесь с партнёром.</span>
        <Link className="btn btn-p btn-w mt" href="/dashboard/couple">Создать пару</Link>
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout>
      <div className="h1">Ритуалы</div>
      <div className="dim">Маленькие повторяющиеся традиции пары.</div>

      {err && <div className="notice notice-amber" style={{ marginTop: 12 }}>{err}</div>}

      <div className="k" style={{ marginTop: 8 }}>Идеи</div>
      <div className="rit-ideas">
        {RITUAL_IDEAS.map((idea) => (
          <button key={idea.t} className="rit-idea" disabled={busy} onClick={() => addRitual(idea.t, idea.e)}>
            <i>{idea.e}</i><b>{idea.t}</b>
          </button>
        ))}
      </div>

      {!open && (
        <button className="btn btn-p btn-w" style={{ marginTop: 14 }} onClick={() => setOpen(true)}>
          + Свой ритуал
        </button>
      )}

      {open && (
        <div className="cd static" style={{ marginTop: 12 }}>
          <div className="k">Новый ритуал</div>
          <label className="field-label">Название</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Например: вечерний чай на балконе" />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-p" style={{ flex: 1 }} disabled={busy || !title.trim()} onClick={() => addRitual()}>
              {busy ? 'Сохраняем…' : 'Сохранить'}
            </button>
            <button className="btn btn-s" style={{ flex: 1 }} onClick={() => setOpen(false)}>Отмена</button>
          </div>
        </div>
      )}

      <div className="k" style={{ marginTop: 16 }}>Сегодня</div>
      {items.length === 0 ? (
        <div className="cd static" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🕊️</div>
          <div className="h2" style={{ marginBottom: 6 }}>Пока нет ритуалов</div>
          <span className="dim">Добавьте первый — например, «Утренний кофе молча».</span>
        </div>
      ) : (
        items.map((r) => (
          <div className="cd static" key={r.id}>
            <div className="cd-r">
              <div className="cd-ic">{r.emoji}</div>
              <div className="cd-t">
                <b>{r.title}</b>
                <span>
                  {r.mine ? 'Вы — сделали ✓' : 'Вы — ещё нет'} · {r.partner ? 'Партнёр ✓' : 'Партнёр —'}
                </span>
              </div>
            </div>
            <button
              className={r.mine ? 'btn btn-p' : 'btn btn-s'}
              style={{ marginTop: 10, width: '100%' }}
              disabled={busy}
              onClick={() => toggleDone(r.id)}
            >
              {r.mine ? '✓ Отметить заново' : 'Отметить выполнение'}
            </button>
          </div>
        ))
      )}
    </DashboardLayout>
  )
}