'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

interface Message {
  id: string
  content: string
  senderId: string
  senderName: string
  createdAt: string
}

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

export default function CoupleChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [me, setMe] = useState<{ id: string } | null>(null)
  const [hasCouple, setHasCouple] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    fetch('/api/user/profile').then(r => r.json()).then(d => {
      setMe({ id: d.user.id })
      setHasCouple(Boolean(d.couple?.partnerName))
    }).catch(() => {})

    fetch('/api/couple-chat?limit=50').then(r => r.json()).then(d => {
      setMessages(d.items ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 20000)
    const refresh = () => load()
    window.addEventListener('together:refresh', refresh)
    return () => {
      clearInterval(t)
      window.removeEventListener('together:refresh', refresh)
    }
  }, [load])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const content = input.trim()
    if (!content || busy) return
    setBusy(true)
    try {
      const r = await fetch('/api/couple-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const j = await r.json()
      if (r.ok && j.item) {
        setMessages(prev => [...prev, j.item])
        setInput('')
        window.dispatchEvent(new Event('together:refresh'))
      }
    } catch { /* ignore */ }
    finally { setBusy(false) }
  }

  if (loading) return (
    <DashboardLayout>
      <div className="loading-screen"><div className="loading-icon">💬</div><div className="loading-text">Загружаем</div></div>
    </DashboardLayout>
  )

  if (!hasCouple) return (
    <DashboardLayout>
      <div className="h1">Чат пары</div>
      <div className="dim">Друг другу — между свиданиями и вопросами.</div>
      <div className="cd static pair-hero">
        <div className="pair-emoji">💬</div>
        <div className="h2" style={{ marginBottom: 6 }}>Сначала создайте пару</div>
        <span className="dim">Чат откроется, когда вы соединитесь с партнёром.</span>
        <Link className="btn btn-p btn-w mt" href="/dashboard/couple">Создать пару</Link>
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout>
      <div className="chat">
        <div className="chat-w">
          <div className="chat-h">
            <span style={{ fontSize: 20 }} aria-hidden="true">💬</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>Чат пары</b>
              <span style={{ display: 'block' }}>Только вы двое</span>
            </div>
            <span className="dot" title="онлайн" aria-label="онлайн" />
          </div>

          <div className="msgs" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="empty" style={{ margin: 'auto' }}>
                <i>💬</i>
                <div className="dim">Напишите первое сообщение — в паре тоже есть, о чём поболтать.</div>
              </div>
            )}

            {messages.map((msg) => {
              const mine = msg.senderId === me?.id
              return (
                <div key={msg.id} className={mine ? 'm you' : 'm ai'}>
                  {!mine && <div className="who">{msg.senderName}</div>}
                  {msg.content}
                  <div className="msg-t">{fmtTime(msg.createdAt)}</div>
                </div>
              )
            })}
          </div>

          <div className="chat-in">
            <form onSubmit={send}>
              <div className="chat-b">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Сообщение паре…"
                  rows={1}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      send(e)
                    }
                  }}
                />
                <button type="submit" className="btn btn-p" disabled={busy || !input.trim()} aria-label="Отправить">→</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}