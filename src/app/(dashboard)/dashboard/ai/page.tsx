'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import { toast } from '@/lib/toast'
import { DECKS, IntimacyDeck } from '@/lib/decks'

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
  const [decksOpen, setDecksOpen] = useState(false)
  const [deck, setDeck] = useState<IntimacyDeck | null>(null)
  const [deckIdx, setDeckIdx] = useState(0)
  const [doneCount, setDoneCount] = useState(0)
  const [chatMode, setChatMode] = useState<'solo' | 'couple'>('solo')
  const [lettersOpen, setLettersOpen] = useState(false)
  const [me, setMe] = useState<{ id: string } | null>(null)
  const [partnerName, setPartnerName] = useState('партнёр')
  const [coupleMessages, setCoupleMessages] = useState<CoupleMsg[]>([])
  const [coupleBusy, setCoupleBusy] = useState(false)
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [partnerLastReadAt, setPartnerLastReadAt] = useState<string | null>(null)

  const [letters, setLetters] = useState<Array<{ id: string; title: string; content: string; fromName: string; isMine: boolean; read: boolean; createdAt: string }>>([])
  const [letterOpen, setLetterOpen] = useState(false)
  const [letterTitle, setLetterTitle] = useState('')
  const [letterContent, setLetterContent] = useState('')
  const [letterBusy, setLetterBusy] = useState(false)

  const loadLetters = useCallback(() => {
    fetch('/api/letters').then(r => r.json()).then(d => setLetters(d?.items ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (window.location.hash === '#letters') {
      setTimeout(() => {
        setLettersOpen(true)
        loadLetters()
      }, 0)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [loadLetters])

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
        toast('Письмо отправлено 💌')
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
    }).catch(() => {})

    const q = new URLSearchParams(window.location.search)
    const reply = q.get('reply')
    const mode = q.get('mode')
    if (reply) {
      setTimeout(() => {
        setInput(reply)
        setChatMode('couple')
      }, 0)
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (mode === 'together') {
      setTimeout(() => setChatMode('couple'), 0)
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

  const reportRead = () => {
    fetch('/api/couple-chat', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }).catch(() => {})
  }

  const loadCouple = useCallback(() => {
    fetch('/api/couple-chat?limit=50').then(r => r.json()).then(d => {
      setCoupleMessages(d.items ?? [])
      setPartnerTyping(Boolean(d.partnerTyping))
      if (d.partnerLastReadAt) setPartnerLastReadAt(d.partnerLastReadAt)
      reportRead()
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (chatMode !== 'couple') return
    loadCouple()
    const t = setInterval(loadCouple, 3000)
    const refresh = () => loadCouple()
    window.addEventListener('together:refresh', refresh)
    return () => {
      clearInterval(t)
      window.removeEventListener('together:refresh', refresh)
    }
  }, [chatMode, loadCouple])

  const lastTypingSent = useRef(0)
  const sendTyping = () => {
    const now = Date.now()
    if (now - lastTypingSent.current < 2000) return
    lastTypingSent.current = now
    fetch('/api/couple-chat', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'typing' }) }).catch(() => {})
  }

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

  const formatTime = (d: string) => new Date(d).toLocaleTimeString('ru-RU')

  const openDeck = (d: IntimacyDeck) => {
    setDeck(d)
    setDeckIdx(0)
    setDoneCount(0)
  }

  return (
    <div className="app-chat">
      <div className="bg" aria-hidden="true"><i /><i /><i /><i /></div>

      <header className="chat-header">
        <Link href="/dashboard" className="logo" aria-label="Loop — Дом">
          <i>∞</i>Loop
        </Link>
        <div className="chat-header-center">
          <button className="icon-btn" aria-label="Диалоги" title="Диалоги" onClick={() => setListOpen(true)}>🗂</button>
          <button className="icon-btn" aria-label="Колоды близости" title="Колоды близости" onClick={() => setDecksOpen(true)}>🎴</button>
          <span className="chat-ava" aria-hidden="true">🦉</span>
          <div className="chat-title">
            <b>Психолог</b>
            <span>приватно · соло</span>
          </div>
          <div className="seg">
            <button className={cn(chatMode === 'solo' && 'on')} onClick={() => setChatMode('solo')}>Соло</button>
            <button className={cn(chatMode === 'couple' && 'on')} onClick={() => setChatMode('couple')}>Вместе</button>
          </div>
        </div>
        <div className="chat-header-right">
          <Link className="icon-btn" aria-label="Настройки" href="/dashboard/settings">⚙️</Link>
        </div>
      </header>

      {chatMode === 'couple' && (
        <div className="couple-chat-banner">
          <span>Чат с {partnerName} — только вы двое</span>
        </div>
      )}

      <div className="chat-messages" ref={scrollRef}>
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
              const read = mine && partnerLastReadAt && new Date(msg.createdAt) <= new Date(partnerLastReadAt)
              return (
                <div key={msg.id} className={mine ? 'msg you' : 'msg ai'}>
                  {!mine && <div className="msg-who">{msg.senderName}</div>}
                  <div className="msg-content">{msg.content}</div>
                  <div className="msg-time">
                    {fmtTime(msg.createdAt)}
                    {mine && <span className={cn('ticks', read && 'read')}>{read ? '✓✓' : '✓'}</span>}
                  </div>
                </div>
              )
            })}
          </>
        ) : (
          <>
            {messages.length === 0 && !isLoading && (
              <div className="chat-empty">
                <div style={{ fontSize: 40 }}>🦉</div>
                <b>Привет, я ваш Психолог.</b>
                <span className="dim">Диалоги приватные — только вы и Психолог. Чем помочь?</span>
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
                  <div key={msg.id} className="msg you">
                    <div className="msg-content" dangerouslySetInnerHTML={{ __html: msg.content }} />
                    <div className="msg-time">{formatTime(msg.createdAt)}</div>
                  </div>
                )
              }
              if (msg.role === 'SYSTEM') {
                return (
                  <div key={msg.id} className="msg ai">
                    <div className="msg-who">⚠️ Уведомление</div>
                    <div className="msg-content" dangerouslySetInnerHTML={{ __html: msg.content }} />
                  </div>
                )
              }
              return (
                <div key={msg.id} className="msg ai">
                  <div className="msg-who">🦉 Психолог</div>
                  <div className="msg-content" dangerouslySetInnerHTML={{ __html: msg.content }} />
                  <div className="msg-time">{formatTime(msg.createdAt)}</div>
                </div>
              )
            })}

            {isLoading && (
              <div className="typing" role="status" aria-label="Психолог печатает">
                <i /><i /><i />
              </div>
            )}
          </>
        )}
      </div>

      <div className="chat-input-wrap">
        {chatMode === 'couple' && partnerTyping && (
          <div className="typing-line" role="status" aria-label="Партнёр набирает">
            {partnerName} набирает<i /><i /><i />
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (chatMode === 'couple') sendCouple()
            else handleSend()
          }}
        >
          <div className="chat-input-inner">
            <textarea
              rows={1}
              placeholder={chatMode === 'couple' ? 'Сообщение паре…' : 'Напишите сообщение…'}
              value={input}
              onChange={(e) => { setInput(e.target.value); if (chatMode === 'couple') sendTyping() }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (chatMode === 'couple') sendCouple()
                  else handleSend()
                }
              }}
              aria-label="Сообщение"
            />
            <button type="submit" className="send-btn" disabled={!input.trim() || isLoading || coupleBusy} aria-label="Отправить">
              ➤
            </button>
          </div>
        </form>
      </div>

      {listOpen && (
        <div className="sheet-overlay" onClick={() => setListOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <b>Диалоги</b>
              <button className="link-btn" onClick={() => setListOpen(false)}>✕</button>
            </div>
            <button className="btn btn-primary btn-wide" style={{ marginBottom: 10 }} onClick={() => { handleNewChat(); setListOpen(false) }}>+ Новый диалог</button>
            {conversations.length === 0 && <div className="dim" style={{ padding: '12px 0', textAlign: 'center' }}>Диалогов пока нет.</div>}
            {conversations.map((c) => (
              <div key={c.id} className="sheet-item" onClick={() => { setCurrentConversationId(c.id); setListOpen(false) }}>
                <b>{c.title}</b>
                <span className="small dim">{c.lastMessage} · {formatTime(c.updatedAt)}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
              <button className="btn btn-secondary btn-wide" style={{ width: '100%' }} onClick={() => { setListOpen(false); setLettersOpen(true); loadLetters() }}>💌 Письма</button>
            </div>
          </div>
        </div>
      )}

      {decksOpen && (
        <div className="sheet-overlay" onClick={() => setDecksOpen(false)}>
          <div className="sheet" id="decks" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <b>🎴 Колоды близости</b>
              <button className="link-btn" onClick={() => setDecksOpen(false)}>✕</button>
            </div>
            <div className="dim" style={{ fontSize: 13, marginBottom: 12 }}>Вопросы для разговора вдвоём. Обсудите — и почувствуйте себя ближе.</div>
            {!deck ? (
              <div className="deck-grid">
                {DECKS.map(d => (
                  <button key={d.key} className="deck-card" onClick={() => openDeck(d)}>
                    <div className="deck-emoji">{d.emoji}</div>
                    <b>{d.title}</b>
                    <span className="dim" style={{ fontSize: 12 }}>{d.questions.length} вопросов</span>
                    <span className="dim" style={{ fontSize: 12 }}>{d.description}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="deck-static">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <b>{deck.emoji} {deck.title}</b>
                  <button className="link-btn" onClick={() => setDeck(null)}>← ко всем колодам</button>
                </div>
                {deckIdx < deck.questions.length ? (
                  <>
                    <div className="deck-question">«{deck.questions[deckIdx].question}»</div>
                    <div className="dim" style={{ fontSize: 12, margin: '8px 0 16px' }}>
                      {deck.questions[deckIdx].axis
                        ? `Сфера: ${deck.questions[deckIdx].axis}`
                        : 'Просто о важном'} · вопрос {deckIdx + 1} из {deck.questions.length}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setDoneCount(d => d + 1); setDeckIdx(i => Math.min(i + 1, deck.questions.length - 1)) }}>
                        Обсудили ✓
                      </button>
                      <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeckIdx(i => Math.min(i + 1, deck.questions.length - 1))}>
                        Следующий →
                      </button>
                    </div>
                    <div className="prog-line" style={{ marginTop: 16 }}><div className="prog-fill" style={{ width: `${(doneCount / deck.questions.length) * 100}%` }} /></div>
                  </>
                ) : (
                  <div className="empty" style={{ padding: '12px 0' }}>
                    <i>🎉</i>
                    <div className="h2" style={{ marginBottom: 6 }}>Колода пройдена</div>
                    <div className="dim" style={{ marginBottom: 16 }}>Обсудили {doneCount} из {deck.questions.length} вопросов.</div>
                    <button className="btn btn-secondary" onClick={() => setDeck(null)}>К другим колодам</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {lettersOpen && (
        <div className="sheet-overlay" onClick={() => setLettersOpen(false)}>
          <div className="sheet" id="letters" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <b>💌 Письма</b>
              <button className="link-btn" onClick={() => setLettersOpen(false)}>✕</button>
            </div>
            {!letterOpen && (
              <button className="btn btn-primary btn-wide" style={{ marginBottom: 10 }} onClick={() => setLetterOpen(true)}>+ Написать письмо</button>
            )}
            {letterOpen && (
              <div className="letter-form" style={{ marginBottom: 12, padding: 14 }}>
                <div className="k">Новое письмо</div>
                <label className="field-label">Тема</label>
                <input className="input" value={letterTitle} onChange={e => setLetterTitle(e.target.value)} placeholder="О чём?" />
                <label className="field-label">Текст</label>
                <textarea className="mood-note" value={letterContent} onChange={e => setLetterContent(e.target.value)} placeholder="Дорогая…" rows={4} />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} disabled={!letterTitle.trim() || !letterContent.trim() || letterBusy} onClick={sendLetter}>Отправить</button>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setLetterOpen(false)}>Отмена</button>
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
        </div>
      )}
    </div>
  )
}