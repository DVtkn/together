"use client"

import { useEffect, useRef, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Send, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

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

const MOODS = [
  { emoji: '😊', label: 'Хорошо' },
  { emoji: '😢', label: 'Грустно' },
  { emoji: '😠', label: 'Злюсь' },
  { emoji: '😴', label: 'Устал(а)' },
  { emoji: '😍', label: 'Влюблён(а)' },
]

export default function AIChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mood, setMood] = useState<string | null>(null)
  const [mode, setMode] = useState<'solo' | 'together'>('solo')
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

  const fetchMessages = async (id: string) => {
    try {
      const res = await fetch('/api/ai/conversations/' + id)
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (e) {
      console.error('Failed:', e)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    if (currentConversationId) {
      fetchMessages(currentConversationId)
    }
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
        body: JSON.stringify({ message: msg, conversationId: currentConversationId, mood, mode }),
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
            ? { ...m, role: 'ASSISTANT', content: content }
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

  const handleDeleteConversation = async (id: string) => {
    if (!confirm('Удалить этот диалог?')) return
    try {
      await fetch('/api/ai/conversations/' + id, { method: 'DELETE' })
      fetchConversations()
      if (currentConversationId === id) {
        setCurrentConversationId(null)
        setMessages([])
      }
    } catch (e) {
      console.error('Failed:', e)
    }
  }

  const formatTime = (d: string) => format(new Date(d), 'HH:mm', { locale: ru })

  return (
    <DashboardLayout user={{ name: null, email: '', image: null }} couple={null}>
      <div className="chat-layout">
        {/* Тревога настроения */}
        <div className="mood-checkin">
          <span className="mood-checkin-label">Как себя чувствуете?</span>
          <div className="mood-options">
            {MOODS.map((m) => (
              <button
                key={m.label}
                type="button"
                title={m.label}
                aria-label={m.label}
                className={cn('mood-btn', mood === m.emoji && 'selected')}
                onClick={() => setMood(mood === m.emoji ? null : m.emoji)}
              >
                {m.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Диалоги */}
        {conversations.length > 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 4, scrollbarWidth: 'none' }}>
            <button type="button" className="btn btn-primary" style={{ width: 'auto', padding: '10px 16px', fontSize: 14, marginBottom: 0, flexShrink: 0, display: 'inline-flex', gap: 6 }} onClick={handleNewChat}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Новый
            </button>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                role="button"
                tabIndex={0}
                onClick={() => setCurrentConversationId(conv.id)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-[100px] cursor-pointer text-sm font-medium transition-all flex-shrink-0',
                  conv.id === currentConversationId
                    ? 'bg-[linear-gradient(135deg,#8B5CF6,#EC4899)] text-white'
                    : 'bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[#94A3B8] hover:text-[#F1F5F9]'
                )}
              >
                <span className="max-w-[140px] truncate">{conv.title}</span>
                <button
                  type="button"
                  aria-label="Удалить"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteConversation(conv.id)
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.7, padding: 0, display: 'flex' }}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Режим */}
        <div className="chat-mode-switch">
          <button
            type="button"
            className={cn('mode-btn', mode === 'solo' && 'active')}
            onClick={() => setMode('solo')}
          >
            👤 Один на один
          </button>
          <button
            type="button"
            className={cn('mode-btn', mode === 'together' && 'active')}
            onClick={() => setMode('together')}
          >
            👥 Вместе
          </button>
        </div>

        {/* Окно чата */}
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-participants">
              <span className="chat-participant ai" aria-hidden="true">💜</span>
              <span className="chat-participant you" aria-hidden="true">🙂</span>
            </div>
            <span className="chat-title">Психолог Together · {mode === 'solo' ? 'один на один' : 'вместе с партнёром'}</span>
            <span className="chat-status">онлайн</span>
          </div>

          <div className="chat-messages" ref={scrollRef}>
            {messages.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 14, margin: 'auto', padding: '20px 0' }}>
                Начните разговор — ИИ помнит ваш контекст: отчёты, пульс, челленджи.
              </p>
            )}

            {messages.map((msg) => {
              if (msg.role === 'USER') {
                return (
                  <div key={msg.id} className="msg you">
                    {msg.content}
                    <div className="msg-time">{formatTime(msg.createdAt)}</div>
                  </div>
                )
              }
              if (msg.role === 'SYSTEM') {
                return (
                  <div key={msg.id} className="msg ai">
                    <div className="ai-label">⚠️ Уведомление</div>
                    {msg.content}
                  </div>
                )
              }
              return (
                <div key={msg.id} className="msg ai">
                  <div className="ai-label">💜 Together</div>
                  {msg.content}
                  <div className="msg-time">{formatTime(msg.createdAt)}</div>
                </div>
              )
            })}

            {isLoading && (
              <div className="typing" role="status" aria-label="ИИ печатает">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>

          {/* Ввод */}
          <div className="chat-input-wrap">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
            >
              <div className="chat-input-box">
                <textarea
                  rows={1}
                  placeholder="Напишите сообщение..."
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
                <button type="submit" className="send-btn" disabled={!input.trim() || isLoading} aria-label="Отправить">
                  <Send className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}