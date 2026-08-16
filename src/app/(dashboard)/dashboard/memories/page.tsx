'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

interface Memory {
  id: string
  caption: string
  imageUrl: string | null
  date: string | null
  authorId: string
  authorName: string
  createdAt: string
}

const fmtDate = (iso: string | null) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function MemoriesPage() {
  const [items, setItems] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [hasCouple, setHasCouple] = useState(false)
  const [me, setMe] = useState<{ id: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [caption, setCaption] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [date, setDate] = useState('')

  const load = useCallback(() => {
    fetch('/api/user/profile').then(r => r.json()).then(d => {
      setMe({ id: d.user.id })
      setHasCouple(Boolean(d.couple?.partnerName))
    }).catch(() => {})
    fetch('/api/memories').then(r => r.json()).then(d => {
      setItems(d.items ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const addMemory = async () => {
    if (!caption.trim()) return
    setBusy(true); setErr(null)
    try {
      const r = await fetch('/api/memories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: caption.trim(), imageUrl, date: date || null }),
      })
      const j = await r.json()
      if (!r.ok) { setErr(j?.error ?? 'Не получилось'); return }
      setItems(prev => [j.item, ...prev])
      setCaption(''); setImageUrl(''); setDate(''); setOpen(false)
      window.dispatchEvent(new Event('together:refresh'))
    } catch { setErr('Сеть недоступна') }
    finally { setBusy(false) }
  }

  const removeMemory = async (id: string) => {
    await fetch(`/api/memories/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  if (loading) return (
    <DashboardLayout>
      <div className="loading-screen"><div className="loading-icon">📸</div><div className="loading-text">Загружаем</div></div>
    </DashboardLayout>
  )

  if (!hasCouple) return (
    <DashboardLayout>
      <div className="h1">Воспоминания</div>
      <div className="dim">Моменты, которые стоит сохранить.</div>
      <div className="cd static pair-hero">
        <div className="pair-emoji">📸</div>
        <div className="h2" style={{ marginBottom: 6 }}>Сначала создайте пару</div>
        <span className="dim">Галерея откроется, когда вы соединитесь с партнёром.</span>
        <Link className="btn btn-p btn-w mt" href="/dashboard/couple">Создать пару</Link>
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout>
      <div className="h1">Воспоминания</div>
      <div className="dim">Моменты, которые стоит сохранить.</div>

      {err && <div className="notice notice-amber" style={{ marginTop: 12 }}>{err}</div>}

      {!open && (
        <button className="btn btn-p btn-w" style={{ marginTop: 14 }} onClick={() => setOpen(true)}>
          + Добавить воспоминание
        </button>
      )}

      {open && (
        <div className="cd static" style={{ marginTop: 12 }}>
          <div className="k">Новое воспоминание</div>
          <label className="field-label">Подпись</label>
          <textarea className="mood-note" placeholder="Например: первое лето вдвоём 🌊"
            value={caption} onChange={e => setCaption(e.target.value)} />
          <label className="field-label">Ссылка на фото (необязательно)</label>
          <input className="input" type="url" placeholder="https://…" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
          <label className="field-label">Дата (необязательно)</label>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-p" style={{ flex: 1 }} disabled={busy || !caption.trim()} onClick={addMemory}>
              {busy ? 'Сохраняем…' : 'Сохранить'}
            </button>
            <button className="btn btn-s" style={{ flex: 1 }} onClick={() => setOpen(false)}>Отмена</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="cd static" style={{ marginTop: 16, textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📸</div>
          <div className="h2" style={{ marginBottom: 6 }}>Пока пусто</div>
          <span className="dim">Добавьте первое воспоминание — фото, подпись, дату.<br />Галерея появится здесь.</span>
        </div>
      ) : (
        <div className="mem-grid" style={{ marginTop: 16 }}>
          {items.map((m) => (
            <div className="mem-card" key={m.id}>
              {m.imageUrl ? (
                <div className="mem-img" style={{ backgroundImage: `url(${m.imageUrl})` }} />
              ) : (
                <div className="mem-img mem-ph" />
              )}
              <div className="mem-body">
                <b>{m.caption}</b>
                <span className="small">
                  {m.authorName}{m.date ? ` · ${fmtDate(m.date)}` : ''}
                </span>
              </div>
              {m.authorId === me?.id && (
                <button className="link-btn mem-del" onClick={() => removeMemory(m.id)} aria-label="Удалить">✕</button>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}