'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

interface StoryEvent {
  id: string
  type: string
  title: string
  meta: Record<string, unknown> | null
  createdAt: string
}

interface DateMemory {
  id: string
  venueName: string
  date: string
  photoUrl: string | null
  note: string | null
  createdAt: string
}

const STORY_EMOJI: Record<string, string> = {
  couple_created: '💞',
  first_test: '🧪',
  both_tests: '🧪',
  report_generated: '📄',
  first_date: '📍',
  challenge_completed: '🌙',
  anniversary: '🎂',
  date_visited: '📸',
}

function storyEmoji(type: string): string {
  return STORY_EMOJI[type] ?? '✨'
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

export default function StoryPage() {
  const router = useRouter()
  const [story, setStory] = useState<{ events: StoryEvent[]; memories: DateMemory[] } | null>(null)

  const load = useCallback(() => {
    fetch('/api/couple-events').then(r => r.json()).then(d => {
      if (d && Array.isArray(d.events)) setStory({ events: d.events, memories: d.memories ?? [] })
    }).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  const repeatDate = async (venueName: string) => {
    const res = await fetch('/api/date-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vibe: 'Повторить место', venueName }),
    })
    if (res.ok) router.push('/dashboard/date')
  }

  const timeline: Array<{
    id: string
    at: number
    emoji: string
    title: string
    type: string
    memory?: DateMemory
  }> = [
    ...(story?.events.map(e => ({ id: `e_${e.id}`, at: new Date(e.createdAt).getTime(), emoji: storyEmoji(e.type), title: e.title, type: e.type })) ?? []),
    ...(story?.memories.map(m => ({ id: `m_${m.id}`, at: new Date(m.date).getTime(), emoji: '📸', title: m.venueName, type: 'date_visited', memory: m })) ?? []),
  ].sort((a, b) => a.at - b.at)

  return (
    <DashboardLayout>
      <div className="h1">История пары</div>
      <div className="dim" style={{ marginBottom: 16 }}>Первые тесты, свидания и достижения — всё на одном таймлайне.</div>

      <div className="cd static">
        {timeline.length === 0 ? (
          <div className="dim" style={{ textAlign: 'center', padding: '12px 0' }}>
            Здесь будет ваша история: первые тесты, свидания и достижения.
          </div>
        ) : (
          <div className="timeline">
            {timeline.map(item => (
              <div key={item.id} className="tl-item">
                <div className="tl-emoji">{item.emoji}</div>
                <div className="tl-body">
                  <b>{item.title}</b>
                  <span>{fmtDate(new Date(item.at).toISOString())}</span>
                  {item.type === 'date_visited' && item.memory?.note && (
                    <p className="tl-note">{item.memory.note}</p>
                  )}
                  {item.type === 'date_visited' && item.memory?.venueName && (
                    <div style={{ marginTop: 6 }}>
                      <button className="link-btn" onClick={() => repeatDate(item.memory!.venueName!)}>↻ Повторить</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}