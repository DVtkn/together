"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Send, Loader2, Bot, User, AlertTriangle, Sparkles, Trash2 } from 'lucide-react'
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

export default function AIChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')

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


  

  const handleSend = async () => {
    if (!input.trim()) return

    const msg = input
    setInput('')
    setMessages((prev) => [...prev, { id: 'u' + Date.now(), role: 'USER', content: msg, createdAt: new Date().toISOString() }])

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, conversationId: currentConversationId }),
      })
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content || 'Ответ ИИ'
      setMessages((prev) =>
        prev.map((m) =>
          m.id.startsWith('u')
            ? { ...m, role: 'ASSISTANT', content: content }
            : m
        )
      )
    } catch (e) {
      console.error('Error:', e)
      setMessages((prev) =>
        prev.map((m) =>
          m.id.startsWith('u')
            ? { ...m, role: 'ASSISTANT', content: 'Ошибка' }
            : m
        )
      )
    }
  }

  const handleNewChat = () => {
    setCurrentConversationId(null)
    setMessages([])
  }

  const handleConversationClick = (id: string) => {
    setCurrentConversationId(id)
  }

  const handleDeleteConversation = async (id: string) => {
    if (!confirm('Удалить?')) return
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

  const currentConversation = conversations.find((c) => c.id === currentConversationId)

  return (
    <DashboardLayout user={{ name: null, email: '', image: null }} couple={null}>
      <div className='h-[calc(100vh-120px)] flex flex-col max-w-5xl mx-auto w-full'>
        <div className='flex items-center justify-between mb-4 flex-shrink-0'>
          <div className='flex items-center gap-3'>
            <Bot className='h-8 w-8 text-rose-500' aria-hidden='true' />
            <div>
              <h1 className='text-2xl font-bold text-slate-950 dark:text-slate-50'>ИИ-ассистент</h1>
              <p className='text-sm text-slate-500 dark:text-slate-400'>
                Помнит ваш контекст: отчёты, пульс, челленджи.
              </p>
            </div>
          </div>
          <Button variant='outline' size='sm' onClick={handleNewChat}>
            <Sparkles className='mr-2 h-4 w-4' /> Новый чат
          </Button>
        </div>

        <div className='flex-1 flex flex-col overflow-hidden'>
          <div className='flex-1 flex overflow-hidden'>
            <Card className='w-64 mr-4 hidden md:block flex-shrink-0 overflow-hidden'>
              <CardHeader className='py-3'>
                <CardTitle className='text-sm'>Диалоги</CardTitle>
                <CardDescription className='text-xs'>Выберите беседу</CardDescription>
              </CardHeader>
              <div className='px-3 pb-3 space-y-1 max-h-[calc(100vh-260px)] overflow-y-auto'>
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    role='button'
                    tabIndex={0}
                    onClick={() => setCurrentConversationId(conv.id)}
                    className={cn(
                      'group flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors',
                      conv.id === currentConversationId ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    )}
                  >
                    <div className='flex-1 min-w-0'>
                      <p className='truncate font-medium'>{conv.title}</p>
                      <p className='truncate text-xs opacity-70'>
                        {currentConversation?.id === conv.id ? 'Открыт' : conv.lastMessage}
                      </p>
                    </div>
                    <button
                      type='button'
                      aria-label='Удалить'
                      onClick={(e) => handleDeleteConversation(conv.id)}
                      className='opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity'
                    >
                      <Trash2 className='h-4 w-4' aria-hidden='true' />
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            <div className='flex-1 flex flex-col min-w-0'>
              <ScrollArea className='flex-1 pr-4'>
                <div className='space-y-4 pb-4'>
                  {messages.length === 0 && (
                    <p className='text-center text-slate-500 dark:text-slate-400'>Начните разговор</p>
                  )}

                  {messages.map((msg) => (
                    <div key={msg.id} className={cn('flex gap-3', msg.role === 'USER' ? 'flex-row-reverse' : 'flex-row')}>
                      <div className={cn('w-8 h-8 rounded-flex items-center justify-center flex-shrink-0', msg.role === 'USER' ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' : 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400')}>
                        {msg.role === 'USER' ? <User className='h-4 w-4' /> : <Bot className='h-4 w-4' />}
                      </div>
                      <div className={cn('max-w-[70%] rounded-2xl px-4 py-2', msg.role === 'USER' ? 'bg-rose-500 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-slate-50 rounded-tl-none')}>
                        <div className='prose prose-sm dark:prose-invert max-w-none'>{msg.content}</div>
                        <div className='flex items-center justify-end gap-2 mt-1 text-xs opacity-60'>
                          <span>{formatTime(msg.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div />
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        <div className='p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-950 dark:bg-slate-900'>
          <form onSubmit={(e) => { e.preventDefault(); handleSend() }}>
            <input
              type="text"
              placeholder='Введите сообщение...'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className='flex-1 rounded-b-lg border border-slate-500 dark:border-slate-400 bg-transparent px-3 py-2 text-slate-200 dark:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2'
            />
            <Button type='submit' disabled={!input.trim()} className='bg-rose-500 text-white px-4 py-2 rounded-lg hover:bg-rose-600 transition-colors'>
              <Send className='mr-2 h-4 w-4' /> Отправить
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}
