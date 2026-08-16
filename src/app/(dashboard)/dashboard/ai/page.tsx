'use client'

import { useEffect, useRef, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

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

export default function AIChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

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
  }, [messages, isLoading])

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

  const formatTime = (d: string) => new Date(d).toLocaleTimeString('ru-RU')

  return (
    <DashboardLayout user={{ name: null, email: '' }} couple={null}>
      <div className="chat">
        <div className="chat-w">
          <div className="chat-h">
            <span style={{ fontSize: 20 }} aria-hidden="true">🦉</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>Сова</b>
              <span style={{ display: 'block' }}>Помнит ваш контекст: отчёты, пульс, челленджи</span>
            </div>
            <span className="dot" title="онлайн" aria-label="онлайн" />
          </div>

          <div className="msgs" ref={scrollRef}>
            {conversations.length > 0 && (
              <div className="chips" style={{ justifyContent: 'flex-start' }}>
                <button type="button" className="chip sel" onClick={handleNewChat}>+ Новый</button>
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    type="button"
                    className="chip"
                    onClick={() => setCurrentConversationId(conv.id)}
                    title={conv.title}
                  >
                    {conv.title}
                  </button>
                ))}
              </div>
            )}

            {messages.length === 0 && !isLoading && (
              <div className="sova-empty">
                <div style={{ fontSize: 40 }}>🦉</div>
                <b>Привет, я Сова.</b>
                <span className="dim">Помню вашу пару: отчёты, пульс, челленджи. Чем помочь?</span>
                <div className="chips" style={{ justifyContent: 'center', marginTop: 12 }}>
                  {['Что ты умеешь?', 'Помоги сформулировать мысль', 'Разбери наш спор', 'Идея свидания'].map(q => (
                    <button key={q} className="chip" onClick={() => handleSend()}>{q}</button>
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
          </div>

          <div className="chat-in">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
            >
              <div className="chat-b">
                <textarea
                  rows={1}
                  placeholder="Напишите сообщение…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  aria-label="Сообщение"
                />
                <button type="submit" className="send" disabled={!input.trim() || isLoading} aria-label="Отправить">
                  ➤
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}