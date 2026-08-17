'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { cn } from '@/lib/utils/cn'

interface Message {
  id: string
  role: 'USER' | 'ASSISTANT' | 'SYSTEM'
  content: string
  createdAt: string
}

interface Conversation {
  id: string
  title: string
  updatedAt: string
  lastMessage: string
}

interface CoupleMsg {
  id: string
  content: string
  senderId: string
  senderName: string
  createdAt: string
}

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

export default function AIChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [listOpen, setListOpen] = useState(false)
  const [chatMode, setChatMode] = useState<'solo' | 'couple'>('solo')
  const [lettersOpen, setLettersOpen] = useState(false)
  const [me, setMe] = useState<{ id: string } | null>(null)
  const [partnerName, setPartnerName] = useState('партнёр')
  const [hasCouple, setHasCouple] = useState(false)
  const [coupleMessages, setCoupleMessages] = useState<CoupleMsg[]>([])
  const [coupleBusy, setCoupleBusy] = useState(false)
  const [sovaConnected, setSovaConnected] = useState(false)
  const [sovaBusy, setSovaBusy] = useState(false)

  const [letters, setLetters] = useState<Array<{ id: string; title: string; content: string; fromName: string; isMine: boolean; read: boolean; createdAt: string }>>([])
  const [letterOpen, setLetterOpen] = useState(false)
  const [letterTitle, setLetterTitle] = useState('')
  const [letterContent, setLetterContent] = useState('')
  const [letterBusy, setLetterBusy] = useState(false)

  const loadLetters = () => {
    fetch('/api/letters').then(r => r.json()).then(d => setLetters(d?.items ?? [])).catch(() => {})
  }
  useEffect(() => {
    if (window.location.hash === '#letters') {
      setLettersOpen(true)
      loadLetters()
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const sendLetter = async () => {
    if (!letterTitle.trim() || !letterContent.trim() || letterBusy) return
    setLetterBusy(true)
    try {
      const r = await fetch('/api/letters', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: letterTitle.trim(), content: letterContent.trim() }),
      })
      if (r.ok) {
        setLetterTitle(''); setLetterContent(''); setLetterOpen(false)
        loadLetters()
        window.dispatchEvent(new Event('together:refresh'))
      }
    } catch { /* ignore */ }
    finally { setLetterBusy(false) }
  }

  const markLetterRead = async (id: string) => {
    await fetch(`/api/letters/${id}/read`, { method: 'POST' }).catch(() => {})
    setLetters(prev => prev.map(l => l.id === id ? { ...l, read: true } : l))
  }

  useEffect(() => {
    fetch('/api/user/profile').then(r => r.json()).then(d => {
      setMe({ id: d.user.id })
      setPartnerName(d.couple?.partnerName ?? 'партнёр')
      setHasCouple(Boolean(d.couple?.partnerName))
    }).catch(() => {})

    const q = new URLSearchParams(window.location.search)
    const reply = q.get('reply')
    if (reply) {
      setInput(reply)
      setChatMode('couple')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/ai')
      const data = await res.json()
      setConversations(data.conversations || [])
      if (data.conversations?.length && !currentConversationId) {
        setCurrentConversationId(data.conversations[0].id)
      }
    } catch (e) {
      console.error('Failed:', e)
    }
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/ai')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        setConversations(data.conversations || [])
        if (data.conversations?.length) {
          setCurrentConversationId((prev) => prev ?? data.conversations[0].id)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!currentConversationId) return
    let cancelled = false
    fetch('/api/ai/conversations/' + currentConversationId)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setMessages(data.messages || [])
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [currentConversationId])

  useEffect(() => {
    const el = scrollRef.current
    el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, isLoading, coupleMessages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const msg = input
    setInput('')
    setIsLoading(true)
    setMessages((prev) => [...prev, { id: 'u' + Date.now(), role: 'USER', content: msg, createdAt: new Date().toISOString() }])

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, conversationId: currentConversationId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id.startsWith('u')
              ? { ...m, role: 'SYSTEM', content: data.error || 'ИИ не ответил. Попробуйте ещё раз.' }
              : m
          )
        )
        return
      }

      const content = data.choices?.[0]?.message?.content || 'ИИ не ответил. Попробуйте ещё раз.'
      setMessages((prev) =>
        prev.map((m) =>
          m.id.startsWith('u')
            ? { ...m, role: 'ASSISTANT', content }
            : m
        )
      )
      if (data.conversationId) {
        setCurrentConversationId(data.conversationId)
        fetchConversations()
      }
    } catch (e) {
      console.error('Error:', e)
      setMessages((prev) =>
        prev.map((m) =>
          m.id.startsWith('u')
            ? { ...m, role: 'SYSTEM', content: 'Ошибка сети. Попробуйте ещё раз.' }
            : m
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewChat = () => {
    setCurrentConversationId(null)
    setMessages([])
  }

  const loadCouple = () => {
    fetch('/api/couple-chat?limit=50').then(r => r.json()).then(d => {
      setCoupleMessages(d.items ?? [])
    }).catch(() => {})
  }
  useEffect(() => {
    if (chatMode !== 'couple') return
    loadCouple()
    const t = setInterval(loadCouple, 20000)
    const refresh = () => loadCouple()
    window.addEventListener('together:refresh', refresh)
    return () => {
      clearInterval(t)
      window.removeEventListener('together:refresh', refresh)
    }
  }, [chatMode])

  const sendCouple = async () => {
    const content = input.trim()
    if (!content || coupleBusy) return
    setCoupleBusy(true)
    try {
      const r = await fetch('/api/couple-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const j = await r.json()
      if (r.ok && j.item) {
        setCoupleMessages(prev => [...prev, j.item])
        setInput('')
        window.dispatchEvent(new Event('together:refresh'))
      }
    } catch { /* ignore */ }
    finally { setCoupleBusy(false) }
  }

  const connectSova = async () => {
    if (sovaBusy) return
    setSovaBusy(true)
    try {
      const r = await fetch('/api/couple-chat/sova', { method: 'POST' })
      const j = await r.json()
      if (r.ok && j.item) {
        setCoupleMessages(prev => [...prev, j.item])
        window.dispatchEvent(new Event('together:refresh'))
      }
    } catch { /* ignore */ }
    finally { setSovaBusy(false) }
  }

  const formatTime = (d: string) => new Date(d).toLocaleTimeString('ru-RU')

  return (
    <DashboardLayout user={{ name: null, email: '' }} couple={null}>
      <div className="chat">
        <div className="chat-w">
          <div className="chat-h">
            <button className="icon-btn" aria-label="Диалоги" title="Диалоги" onClick={() => setListOpen(true)}>🗂</button>
            <span style={{ fontSize: 20 }} aria-hidden="true">🦉</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>Сова</b>
              <span style={{ display: 'block' }}>Помнит ваш контекст: отчёты, пульс, челленджи</span>
            </div>
            <div className="seg" style={{ margin: 0, width: 'auto' }}>
              <button className={cn(chatMode === 'solo' && 'on')} onClick={() => setChatMode('solo')}>Соло</button>
              <button className={cn(chatMode === 'couple' && 'on')} onClick={() => setChatMode('couple')}>Вместе</button>
            </div>
            <span className="dot" title="онлайн" aria-label="онлайн" />
          </div>

          {chatMode === 'couple' && (
            <div className="couple-chat-banner">
              <span>Чат с {partnerName} — только вы двое</span>
              <button
                className="btn btn-s btn-sm"
                disabled={sovaBusy}
                onClick={() => {
                  if (sovaConnected) { setSovaConnected(false); return }
                  connectSova()
                  setSovaConnected(true)
                }}
              >
                {sovaBusy ? '🦉 Сова думает…' : sovaConnected ? '🦉 Сова в диалоге ✓' : '🦉 Подключить Сову'}
              </button>
            </div>
          )}

          <div className="msgs" ref={scrollRef}>
            {chatMode === 'couple' ? (
              <>
                {coupleMessages.length === 0 && (
                  <div className="empty" style={{ margin: 'auto' }}>
                    <i>💬</i>
                    <div className="dim">Напишите первое сообщение — в паре тоже есть, о чём поболтать.</div>
                  </div>
                )}
                {coupleMessages.map((msg) => {
                  const mine = msg.senderId === me?.id
                  return (
                    <div key={msg.id} className={mine ? 'm you' : 'm ai'}>
                      {!mine && <div className="who">{msg.senderName}</div>}
                      {msg.content}
                      <div className="msg-t">{fmtTime(msg.createdAt)}</div>
                    </div>
                  )
                })}
              </>
            ) : (
              <>
                {messages.length === 0 && !isLoading && (
                  <div className="sova-empty">
                    <div style={{ fontSize: 40 }}>🦉</div>
                    <b>Привет, я Сова.</b>
                    <span className="dim">Помню вашу пару: отчёты, пульс, челленджи. Чем помочь?</span>
                    <div className="chips" style={{ justifyContent: 'center', marginTop: 12 }}>
                      {['Что ты умеешь?', 'Помоги сформулировать мысль', 'Разбери наш спор', 'Идея свидания'].map(q => (
                        <button key={q} className="chip" onClick={() => setInput(q + ' ')}>{q}</button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg) => {
                  if (msg.role === 'USER') {
                    return (
                      <div key={msg.id} className="m you">
                        <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                        <div className="msg-t">{formatTime(msg.createdAt)}</div>
                      </div>
                    )
                  }
                  if (msg.role === 'SYSTEM') {
                    return (
                      <div key={msg.id} className="m ai">
                        <div className="who">⚠️ Уведомление</div>
                        <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                      </div>
                    )
                  }
                  return (
                    <div key={msg.id} className="m ai">
                      <div className="who">🦉 Сова</div>
                      <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                      <div className="msg-t">{formatTime(msg.createdAt)}</div>
                    </div>
                  )
                })}

                {isLoading && (
                  <div className="typing" role="status" aria-label="Сова печатает">
                    <i />
                    <i />
                    <i />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="chat-in">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (chatMode === 'couple') sendCouple()
                else handleSend()
              }}
            >
              <div className="chat-b">
                <textarea
                  rows={1}
                  placeholder={chatMode === 'couple' ? 'Сообщение паре…' : 'Напишите сообщение…'}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (chatMode === 'couple') sendCouple()
                      else handleSend()
                    }
                  }}
                  aria-label="Сообщение"
                />
                <button type="submit" className="send" disabled={!input.trim() || isLoading || coupleBusy} aria-label="Отправить">
                  ➤
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {listOpen && (
        <div className="sheet">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <b>Диалоги</b>
            <button className="link-btn" onClick={() => setListOpen(false)}>✕</button>
          </div>
          <button className="btn btn-p btn-w" style={{ marginBottom: 10 }} onClick={() => { handleNewChat(); setListOpen(false) }}>+ Новый диалог</button>
          {conversations.length === 0 && <div className="dim" style={{ padding: '12px 0', textAlign: 'center' }}>Диалогов пока нет.</div>}
          {conversations.map((c) => (
            <div key={c.id} className="sheet-item" onClick={() => { setCurrentConversationId(c.id); setListOpen(false) }}>
              <b>{c.title}</b>
              <span className="small dim">{c.lastMessage} · {formatTime(c.updatedAt)}</span>
            </div>
          ))}
          <div style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
            <button className="btn btn-s btn-w" style={{ width: '100%' }} onClick={() => { setListOpen(false); setLettersOpen(true); loadLetters() }}>💌 Письма</button>
          </div>
        </div>
      )}

      {lettersOpen && (
        <div className="sheet" id="letters">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <b>💌 Письма</b>
            <button className="link-btn" onClick={() => setLettersOpen(false)}>✕</button>
          </div>
          {!letterOpen && (
            <button className="btn btn-p btn-w" style={{ marginBottom: 10 }} onClick={() => setLetterOpen(true)}>+ Написать письмо</button>
          )}
          {letterOpen && (
            <div className="cd static" style={{ marginBottom: 12, padding: 14 }}>
              <div className="k">Новое письмо</div>
              <label className="field-label">Тема</label>
              <input className="input" value={letterTitle} onChange={e => setLetterTitle(e.target.value)} placeholder="О чём?" />
              <label className="field-label">Текст</label>
              <textarea className="mood-note" value={letterContent} onChange={e => setLetterContent(e.target.value)} placeholder="Дорогая…" rows={4} />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn btn-p" style={{ flex: 1 }} disabled={!letterTitle.trim() || !letterContent.trim() || letterBusy} onClick={sendLetter}>Отправить</button>
                <button className="btn btn-s" style={{ flex: 1 }} onClick={() => setLetterOpen(false)}>Отмена</button>
              </div>
            </div>
          )}
          {letters.length === 0 && <div className="dim" style={{ padding: '12px 0', textAlign: 'center' }}>Писем пока нет.</div>}
          {letters.map((l) => (
            <div key={l.id} className="sheet-item" onClick={() => !l.isMine && !l.read && markLetterRead(l.id)}>
              <b>{l.title}</b>
              <span className="small dim">{l.fromName} · {l.isMine ? 'вы' : l.read ? 'прочитано' : 'новое'}</span>
              <p className="small dim" style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{l.content}</p>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}