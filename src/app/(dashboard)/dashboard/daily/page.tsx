'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useProfile } from '@/lib/hooks'
import { SkeletonCard } from '@/components/skeleton-card'

const MOODS = [
  { emoji: '😄', text: 'Всё супер', tone: 'ok' },
  { emoji: '🙂', text: 'Нормально', tone: 'ok' },
  { emoji: '😐', text: 'Спокойно', tone: 'mute' },
  { emoji: '🥺', text: 'Мне грустно', tone: 'warn' },
  { emoji: '😟', text: 'Тревожусь', tone: 'warn' },
  { emoji: '😤', text: 'Раздражён', tone: 'danger' },
]

const MOOD_SCORE: Record<string, number> = {
  '😄': 5,
  '🙂': 4,
  '😐': 3,
  '🥺': 2,
  '😟': 2,
  '😤': 1,
}

interface MoodData {
  mine: { emoji: string; text: string | null } | null
  partner: { emoji: string; text: string | null } | null
}

interface HistoryEntry {
  emoji: string
  text: string | null
  createdAt: string
}

interface HistoryData {
  history: {
    mine: HistoryEntry[]
    partner: HistoryEntry[]
  }
}

interface DailyQuestion {
  id: string
  date: string
  text: string
  myAnswer: string | null
  partnerAnswer: string | null
  myAnswered: boolean
  partnerAnswered: boolean
}

const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export default function DailyPage() {
  const [mood, setMood] = useState<MoodData>({ mine: null, partner: null })
  const [history, setHistory] = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [question, setQuestion] = useState<DailyQuestion | null>(null)
  const [answer, setAnswer] = useState('')
  const [answerBusy, setAnswerBusy] = useState(false)
  const { data: profileData } = useProfile()

  useEffect(() => {
    Promise.all([
      fetch('/api/mood').then((r) => r.json()),
      fetch('/api/mood/history?days=7').then((r) => r.json()),
      fetch('/api/daily-question').then((r) => r.json()),
    ])
      .then(([m, h, q]) => {
        setMood(m as MoodData)
        setHistory(h as HistoryData)
        setQuestion(q?.question ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const partnerName = profileData?.couple?.partnerName ?? null

  const weekChart = useMemo(() => {
    if (!history) return []
    const days: Array<{ label: string; mine: number | null; partner: number | null }> = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const dayKey = d.toDateString()
      const mineEntries = history.history.mine.filter((e) => new Date(e.createdAt).toDateString() === dayKey)
      const partnerEntries = history.history.partner.filter((e) => new Date(e.createdAt).toDateString() === dayKey)
      const latestMine = mineEntries[0] ? MOOD_SCORE[mineEntries[0].emoji] ?? null : null
      const latestPartner = partnerEntries[0] ? MOOD_SCORE[partnerEntries[0].emoji] ?? null : null
      days.push({ label: DAY_NAMES[d.getDay()], mine: latestMine, partner: latestPartner })
    }
    return days
  }, [history])

  const selectMood = async (emoji: string, text: string) => {
    setSaving(true)
    try {
      await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, text }),
      })
      setMood((m) => ({ ...m, mine: { emoji, text } }))
      const h = await fetch('/api/mood/history?days=7').then((r) => r.json())
      setHistory(h as HistoryData)
      window.dispatchEvent(new Event('together:refresh'))
    } catch (e) {
      console.error('Mood save failed:', e)
    } finally {
      setSaving(false)
    }
  }

  const submitAnswer = async () => {
    if (!answer.trim()) return
    setAnswerBusy(true)
    try {
      const r = await fetch('/api/daily-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: answer.trim() }),
      })
      const j = await r.json()
      if (r.ok) {
        setQuestion((q) => q ? { ...q, myAnswered: true, myAnswer: j.myAnswer } : q)
        setAnswer('')
        window.dispatchEvent(new Event('together:refresh'))
      }
    } catch (e) {
      console.error('Answer save failed:', e)
    } finally {
      setAnswerBusy(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout user={{ name: null, email: '' }} couple={null}>
        <div className="h1">Будни</div>
        <SkeletonCard count={3} />
        <SkeletonCard count={2} />
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
        {saving && <div className="small" style={{ textAlign: 'center', marginTop: 8, color: 'var(--mute)' }}>Данные сохранены</div>}
      </div>

      {question && (
        <>
          <div className="k">Вопрос дня</div>
          <div className="cd static" style={{ border: '1px solid rgba(16,185,129,.3)' }}>
            <div className="cd-r">
              <div className="cd-ic">☀️</div>
              <div className="cd-t">
                <b>{question.text}</b>
                <span>{question.myAnswered && question.partnerAnswered ? 'Вы ответили оба 💜' : question.myAnswered ? 'Вы ответили · ждём партнёра' : 'Ответьте — партнёр увидит'}</span>
              </div>
            </div>

            {!question.myAnswered ? (
              <div style={{ marginTop: 12 }}>
                <textarea className="mood-note" placeholder="Ваш ответ…" value={answer}
                  onChange={(e) => setAnswer(e.target.value)} />
                <button className="btn btn-p btn-w" style={{ marginTop: 8 }} disabled={answerBusy || !answer.trim()} onClick={submitAnswer}>
                  {answerBusy ? 'Отправляем…' : 'Ответить'}
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                <div className="small" style={{ color: 'var(--mute)' }}>Ваш ответ:</div>
                <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 2 }}>{question.myAnswer}</div>
                {question.partnerAnswered ? (
                  <>
                    <div className="small" style={{ color: 'var(--mute)', marginTop: 10 }}>Ответ партнёра:</div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 2 }}>{question.partnerAnswer}</div>
                  </>
                ) : (
                  <div className="small" style={{ color: 'var(--mute)', marginTop: 10 }}>Партнёр ещё не ответил(а) — его ответ появится здесь.</div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <div className="k">Сейчас</div>
      <div className="cd static">
        <div className="cd-r">
          <div className="cd-ic">{mood.mine?.emoji ?? '😶'}</div>
          <div className="cd-t">
            <b>Моё настроение</b>
            <span>{mood.mine ? (mood.mine.text ?? 'Отмечено') : '— ещё не отметил(а)'}</span>
          </div>
        </div>
      </div>
      <div className="cd static">
        <div className="cd-r">
          <div className="cd-ic">{mood.partner?.emoji ?? '💙'}</div>
          <div className="cd-t">
            <b>Настроение партнёра</b>
            <span>{mood.partner ? (mood.partner.text ?? 'Отмечено') : '— партнёр не отметил(а)'}</span>
          </div>
        </div>
      </div>

      {history && (
        <>
          <div className="k">Неделя · настроение</div>
          <div className="cd static">
            {history.history.mine.length === 0 && history.history.partner.length === 0 ? (
              <div className="dim" style={{ textAlign: 'center', padding: '24px 0' }}>Пока нет данных — отметьте настроение</div>
            ) : (
              <>
                <div className="week-chart">
              {weekChart.map((d, i) => (
                <div key={i} className="wc-day">
                  <div className="wc-bars">
                    <div
                      className="wc-bar dima"
                      style={{ height: `${d.mine ? d.mine * 16 : 3}px`, opacity: d.mine ? 1 : 0.15 }}
                      title={d.mine ? `Моё: ${d.mine}/5` : '—'}
                    />
                    <div
                      className="wc-bar anya"
                      style={{ height: `${d.partner ? d.partner * 16 : 3}px`, opacity: d.partner ? 1 : 0.15 }}
                      title={d.partner ? `Партнёр: ${d.partner}/5` : '—'}
                    />
                  </div>
                  <span>{d.label}</span>
                </div>
              ))}
            </div>
            <div className="legend">
              <span className="dima"><i style={{ background: 'var(--grad)' }} />я</span>
              <span className="anya"><i style={{ background: 'var(--blue)' }} />{partnerName ?? 'партнёр'}</span>
            </div>
              </>
            )}
          </div>

          <div className="k">За последние 7 дней</div>
          <div className="feed">
            {history.history.mine.length === 0 && history.history.partner.length === 0 ? (
              <div className="small" style={{ color: 'var(--mute)' }}>Пока нет записей — отметьте настроение, чтобы увидеть динамику.</div>
            ) : (
              [...history.history.mine.map((e) => ({ ...e, who: 'Я' as const, isMine: true })),
               ...history.history.partner.map((e) => ({ ...e, who: partnerName ?? 'Партнёр' as const, isMine: false }))]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 10)
                .map((e, i) => (
                  <div key={i} className="feed-item">
                    <span className="fe">{e.emoji}</span>
                    <div className="ft">
                      <b>{e.isMine ? 'Я' : (partnerName ?? 'Партнёр')}</b>
                      <span>{e.text ?? 'Настроение отмечено'}</span>
                    </div>
                    <span className="ftime">
                      {new Date(e.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))
            )}
          </div>
        </>
      )}

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

      <Link href="/dashboard/chat" className="cd">
        <div className="cd-r">
          <div className="cd-ic">💬</div>
          <div className="cd-t"><b>Чат пары</b><span>Только вы двое</span></div>
          <span className="arr">›</span>
        </div>
      </Link>

      <Link href="/dashboard/rituals" className="cd">
        <div className="cd-r">
          <div className="cd-ic">🕊️</div>
          <div className="cd-t"><b>Ритуалы</b><span>Маленькие традиции пары</span></div>
          <span className="arr">›</span>
        </div>
      </Link>

      <Link href="/dashboard/memories" className="cd">
        <div className="cd-r">
          <div className="cd-ic">📸</div>
          <div className="cd-t"><b>Воспоминания</b><span>Моменты, которые стоит сохранить</span></div>
          <span className="arr">›</span>
        </div>
      </Link>

      <Link href="/dashboard/letters" className="cd">
        <div className="cd-r">
          <div className="cd-ic">💌</div>
          <div className="cd-t"><b>Письма</b><span>То, что трудно сказать вслух</span></div>
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
