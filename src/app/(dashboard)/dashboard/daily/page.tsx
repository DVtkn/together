'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

const MOODS = [
  { emoji: '😄', text: 'Всё супер', tone: 'ok' },
  { emoji: '🙂', text: 'Нормально', tone: 'ok' },
  { emoji: '😐', text: 'Спокойно', tone: 'mute' },
  { emoji: '🥺', text: 'Мне грустно', tone: 'warn' },
  { emoji: '😟', text: 'Тревожусь', tone: 'warn' },
  { emoji: '😤', text: 'Раздражён', tone: 'danger' },
]

interface MoodData {
  mine: { emoji: string; text: string | null } | null
  partner: { emoji: string; text: string | null } | null
}

export default function DailyPage() {
  const [mood, setMood] = useState<MoodData>({ mine: null, partner: null })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/mood')
      .then((r) => r.json())
      .then((m: MoodData) => {
        setMood(m)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const selectMood = async (emoji: string, text: string) => {
    setSaving(true)
    try {
      await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, text }),
      })
      setMood((m) => ({ ...m, mine: { emoji, text } }))
    } catch (e) {
      console.error('Mood save failed:', e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout user={{ name: null, email: '' }} couple={null}>
        <div className="loading-screen">
          <div className="loading-icon">⚡</div>
          <div className="loading-text">Загружаем будни</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={{ name: null, email: '' }} couple={null}>
      <div className="h1">Будни</div>
      <div className="dim">Настроение, забота, челленджи.</div>

      <div className="k">Настроение</div>
      <div className="cd static">
        <div className="mood-pick">
          {MOODS.map((m) => (
            <button
              key={m.emoji}
              className={mood.mine?.emoji === m.emoji ? 'mood-opt on' : 'mood-opt'}
              onClick={() => selectMood(m.emoji, m.text)}
              aria-pressed={mood.mine?.emoji === m.emoji}
              aria-label={m.text}
            >
              <i>{m.emoji}</i>
              <b>{m.text}</b>
            </button>
          ))}
        </div>
        {saving && <div className="small" style={{ textAlign: 'center', marginTop: 8, color: 'var(--mute)' }}>Сохранение…</div>}
      </div>

      <div className="k">Сейчас</div>
      <div className="feed">
        <div className="feed-item">
          <b>Моё настроение</b>
          <span>{mood.mine ? `${mood.mine.emoji} ${mood.mine.text ?? ''}` : '— ещё не отметил(а)'}</span>
        </div>
        <div className="feed-item">
          <b>Настроение партнёра</b>
          <span>{mood.partner ? `${mood.partner.emoji} ${mood.partner.text ?? ''}` : '— партнёр не отметил(а)'}</span>
        </div>
      </div>

      <div className="k">На неделе</div>
      <Link href="/dashboard/pulse" className="cd">
        <div className="cd-r">
          <div className="cd-ic">🫀</div>
          <div className="cd-t"><b>Пульс и чек-ин</b><span>Три вопроса · 30 секунд</span></div>
          <span className="arr">›</span>
        </div>
      </Link>

      <Link href="/dashboard/challenges" className="cd">
        <div className="cd-r">
          <div className="cd-ic">🌙</div>
          <div className="cd-t"><b>Челленджи недели</b><span>Задания под ваши зоны роста</span></div>
          <span className="arr">›</span>
        </div>
      </Link>

      <Link href="/dashboard/partner" className="cd">
        <div className="cd-r">
          <div className="cd-ic">💐</div>
          <div className="cd-t"><b>Партнёр</b><span>Что нравится, хотелки, цветы</span></div>
          <span className="arr">›</span>
        </div>
      </Link>
    </DashboardLayout>
  )
}
