'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

interface Letter {
  id: string
  title: string
  content: string
  fromUserId: string
  fromName: string
  isMine: boolean
  read: boolean
  readAt: string | null
  createdAt: string
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

export default function LettersPage() {
  const [items, setItems] = useState<Letter[]>([])
  const [loading, setLoading] = useState(true)
  const [hasCouple, setHasCouple] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [writeOpen, setWriteOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/user/profile').then(r => r.json()).then(d => {
      setHasCouple(Boolean(d.couple?.partnerName))
    }).catch(() => {})
    fetch('/api/letters').then(r => r.json()).then(d => {
      setItems(d.items ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const sendLetter = async () => {
    if (!title.trim() || !content.trim()) return
    setBusy(true); setErr(null)
    try {
      const r = await fetch('/api/letters', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      })
      const j = await r.json()
      if (!r.ok) { setErr(j?.error ?? 'Не получилось'); return }
      setItems(prev => [j.item, ...prev])
      setTitle(''); setContent(''); setWriteOpen(false); setOpenId(j.item.id)
      window.dispatchEvent(new Event('together:refresh'))
    } catch { setErr('Сеть недоступна') }
    finally { setBusy(false) }
  }

  const markRead = async (id: string) => {
    await fetch(`/api/letters/${id}/read`, { method: 'POST' })
    setItems(prev => prev.map(i => i.id === id ? { ...i, read: true, readAt: new Date().toISOString() } : i))
    window.dispatchEvent(new Event('together:refresh'))
  }

  const openLetter = (l: Letter) => {
    setOpenId(openId === l.id ? null : l.id)
    if (!l.isMine && !l.read) markRead(l.id)
  }

  if (loading) return (
    <DashboardLayout>
      <div className="loading-screen"><div className="loading-icon">💌</div><div className="loading-text">Загружаем</div></div>
    </DashboardLayout>
  )

  if (!hasCouple) return (
    <DashboardLayout>
      <div className="h1">Письма</div>
      <div className="dim">Глубокие мысли, которые трудно сказать вслух.</div>
      <div className="cd static pair-hero">
        <div className="pair-emoji">💌</div>
        <div className="h2" style={{ marginBottom: 6 }}>Сначала создайте пару</div>
        <span className="dim">Письма появятся, когда вы соединитесь с партнёром.</span>
        <Link className="btn btn-p btn-w mt" href="/dashboard/couple">Создать пару</Link>
      </div>
    </DashboardLayout>
  )

  const incoming = items.filter(l => !l.isMine)
  const unread = incoming.filter(l => !l.read).length

  return (
    <DashboardLayout>
      <div className="h1">Письма</div>
      <div className="dim">Глубокие мысли, которые трудно сказать вслух.</div>

      {err && <div className="notice notice-amber" style={{ marginTop: 12 }}>{err}</div>}

      {!writeOpen && (
        <button className="btn btn-p btn-w" style={{ marginTop: 14 }} onClick={() => setWriteOpen(true)}>
          ✉️ Написать письмо
        </button>
      )}

      {writeOpen && (
        <div className="cd static" style={{ marginTop: 12 }}>
          <div className="k">Новое письмо</div>
          <label className="field-label">Тема</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="О чём письмо?" />
          <label className="field-label">Письмо</label>
          <textarea className="mood-note" rows={6} value={content} onChange={e => setContent(e.target.value)}
            placeholder="То, что трудно сказать вслух…" />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-p" style={{ flex: 1 }} disabled={busy || !title.trim() || !content.trim()} onClick={sendLetter}>
              {busy ? 'Отправляем…' : 'Отправить'}
            </button>
            <button className="btn btn-s" style={{ flex: 1 }} onClick={() => setWriteOpen(false)}>Отмена</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="cd static" style={{ marginTop: 16, textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💌</div>
          <div className="h2" style={{ marginBottom: 6 }}>Пока нет писем</div>
          <span className="dim">Напишите первое — партнёр получит уведомление.</span>
        </div>
      ) : (
        <>
          {unread > 0 && (
            <div className="notice" style={{ marginTop: 16 }}>📬 {unread} непрочитанных</div>
          )}
          <div style={{ marginTop: 12 }}>
            {items.map((l) => (
              <div className={`cd static lt-card ${!l.read && !l.isMine ? 'unread' : ''}`} key={l.id}
                onClick={() => openLetter(l)}>
                <div className="cd-r">
                  <div className="cd-ic">{l.isMine ? '📤' : '💌'}</div>
                  <div className="cd-t">
                    <b>{l.title}</b>
                    <span>
                      {l.isMine ? 'Вы' : l.fromName} · {fmtDate(l.createdAt)}
                      {!l.isMine && (l.read ? ' · прочитано' : ' · новое')}
                    </span>
                  </div>
                </div>
                {openId === l.id && (
                  <div className="lt-body">{l.content}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  )
}