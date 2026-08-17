'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { cn } from '@/lib/utils/cn'

interface DailyQ {
  id: string
  date: string
  text: string
  myAnswer: string | null
  partnerAnswer: string | null
  myAnswered: boolean
  partnerAnswered: boolean
  revealed: boolean
}

interface CareForecast {
  text: string
  cta: string
  level: 'soft' | 'alert'
}

interface Signal {
  id: string
  emoji: string
  meaning: string
  suggestedReply: string
}

interface WarmthItem {
  id: string
  text: string
  fromName: string
  fromId: string
  createdAt: string
}

function greeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Доброе утро'
  if (h >= 12 && h < 18) return 'Привет'
  if (h >= 18 && h < 23) return 'Добрый вечер'
  return 'Не спится?'
}

export default function DashboardPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [dq, setDq] = useState<DailyQ | null>(null)
  const [answerInput, setAnswerInput] = useState('')
  const [answered, setAnswered] = useState(false)
  const [care, setCare] = useState<CareForecast | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const [signalSent, setSignalSent] = useState<string | null>(null)
  const [warmth, setWarmth] = useState<WarmthItem[]>([])
  const [challenge, setChallenge] = useState<any>(null)
  const [pause, setPause] = useState<{ active: boolean; endsAt: string | null; secondsLeft: number }>({ active: false, endsAt: null, secondsLeft: 0 })
  const [pulseBelowAvg, setPulseBelowAvg] = useState(false)

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/dashboard').then(r => r.json()),
      fetch('/api/daily-question').then(r => r.json()).catch(() => ({ question: null })),
      fetch('/api/pause').then(r => r.json()).catch(() => ({ active: false, endsAt: null, secondsLeft: 0 })),
    ]).then(([d, q, p]) => {
      setName(d?.user?.name?.split(' ')[0] ?? '')
      setCare(d?.careForecast ?? null)
      setSignals(d?.signals ?? [])
      setWarmth(d?.warmth ?? [])
      setChallenge(d?.activeChallenge ?? null)
      setPause(p)
      setDq(q?.question ?? null)
      setAnswered(q?.question?.myAnswered ?? false)
    }).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    const t = setInterval(() => {
      fetch('/api/pause').then(r => r.json()).then(p => setPause(p)).catch(() => {})
    }, 10000)
    return () => clearInterval(t)
  }, [])

  const [signalModal, setSignalModal] = useState<{ emoji: string; meaning: string; reply: string } | null>(null)
  const [seenSignals, setSeenSignals] = useState<Set<string>>(new Set())

  useEffect(() => {
    const check = () => {
      fetch('/api/notifications?limit=10').then(r => r.json()).then(d => {
        if (!d || !Array.isArray(d.items)) return
        const sig = d.items.find((n: any) => n.type === 'signal_received' && !n.read && !seenSignals.has(n.id))
        if (sig) {
          const params = new URLSearchParams(sig.href?.split('?')[1] ?? '')
          setSignalModal({
            emoji: params.get('signal') || '🤗',
            meaning: params.get('meaning') || 'тихий сигнал',
            reply: params.get('reply') || '',
          })
          setSeenSignals(prev => new Set(prev).add(sig.id))
        }
      }).catch(() => {})
    }
    check()
    const t = setInterval(check, 8000)
    return () => clearInterval(t)
  }, [seenSignals])

  const answerSoftly = () => {
    if (!signalModal) return
    router.push(signalModal.reply ? `/dashboard/chat?reply=${encodeURIComponent(signalModal.reply)}` : '/dashboard/chat')
    setSignalModal(null)
  }

  async function submitAnswer() {
    const answer = answerInput.trim()
    if (answer.length < 1 || answered) return
    const r = await fetch('/api/daily-question', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer }) })
    if (r.ok) {
      setAnswered(true)
      setAnswerInput('')
      window.dispatchEvent(new Event('together:refresh'))
      load()
    }
  }

  async function sendSignal(s: Signal) {
    await fetch(`/api/signals/${s.id}/send`, { method: 'POST' }).catch(() => {})
    setSignalSent(s.id)
    window.dispatchEvent(new Event('together:refresh'))
    setTimeout(() => setSignalSent(null), 3000)
  }

  const pauseFmt = pause.active && pause.secondsLeft > 0
    ? `${Math.floor(pause.secondsLeft / 60)}:${String(pause.secondsLeft % 60).padStart(2, '0')}`
    : null

  const hasNextAction = dq || care || challenge || warmth.length > 0 || signals.length > 0 || pauseFmt

  return (
    <DashboardLayout>
      <div className="h1">{greeting()}{name ? `, ${name}` : ''}.</div>
      <div className="dim">Что сейчас важнее всего — прямо здесь.</div>

      {/* Следующее действие */}
      {challenge && (
        <div className="cd static" style={{ border: '1px solid rgba(139,92,246,.35)' }}>
          <div className="cd-r">
            <div className="cd-ic">🌙</div>
            <div className="cd-t">
              <b>Челлендж недели</b>
              <span>{challenge.title}</span>
            </div>
            {!challenge.completedByCurrent && (
              <Link href="/dashboard/daily#challenges" className="btn btn-p btn-sm">Отметить</Link>
            )}
            {challenge.completedByCurrent && <span className="badge ok">✓</span>}
          </div>
        </div>
      )}

      {/* Вопрос дня */}
      {dq && (
        <div className="cd static" id="dailyq">
          <div className="cd-r">
            <div className="cd-ic">🔮</div>
            <div className="cd-t">
              <b>Вопрос дня</b>
              <span>{dq.text}</span>
            </div>
          </div>

          {dq.revealed ? (
            <div className="dq-reveal" style={{ marginTop: 12 }}>
              <div className="dq-answer">
                <b>Вы</b>
                <p>{dq.myAnswer ?? '—'}</p>
              </div>
              <div className="dq-answer partner">
                <b>Партнёр</b>
                <p>{dq.partnerAnswer ?? '—'}</p>
              </div>
              <Link href="/dashboard/ai" className="btn btn-s btn-sm btn-w" style={{ marginTop: 10 }}>💬 Обсудить с Совой</Link>
            </div>
          ) : dq.myAnswered && !dq.partnerAnswered ? (
            <div className="dim" style={{ marginTop: 12 }}>Ответ записан. Ждём ответ партнёра — потом ответы раскроются ✨</div>
          ) : dq.myAnswered && dq.partnerAnswered ? (
            <div className="dim" style={{ marginTop: 12 }}>Ответы скоро раскроются 🔮</div>
          ) : (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input className="input" style={{ flex: 1 }} placeholder="Ваш ответ…" value={answerInput}
                onChange={e => setAnswerInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitAnswer()} />
              <button className="btn btn-p" disabled={answerInput.trim().length < 1 || answered} onClick={submitAnswer}>Ответить</button>
            </div>
          )}
        </div>
      )}

      {/* Прогноз заботы */}
      {care && (
        <div className={`cd static care-card ${care.level}`}>
          <div className="cd-r">
            <div className="cd-ic">🌦</div>
            <div className="cd-t">
              <b>Прогноз заботы</b>
              <span>{care.text}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Link href="/dashboard/date" className="btn btn-p" style={{ flex: 1 }}>💡 {care.cta}</Link>
          </div>
        </div>
      )}

      {/* Банк тепла — surfacing при просадке */}
      {warmth.length > 0 && (
        <div className="cd static">
          <div className="cd-r">
            <div className="cd-ic">💌</div>
            <div className="cd-t">
              <b>Тёплое, что вы говорили</b>
              <span>Вспомните момент — он того стоит</span>
            </div>
          </div>
          <div className="warmth-list" style={{ marginTop: 12 }}>
            {warmth.map(w => (
              <div key={w.id} className="warmth-item">
                <span className="warmth-ic">💌</span>
                <div>
                  <b>{w.text}</b>
                  <span className="small">{w.fromName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Тихие сигналы */}
      {signals.length > 0 && (
        <div className="cd static">
          <div className="cd-r">
            <div className="cd-ic">🤗</div>
            <div className="cd-t">
              <b>Тихий сигнал</b>
              <span>Один тап — без слов</span>
            </div>
          </div>
          <div className="signal-row" style={{ marginTop: 12 }}>
            {signals.map(s => (
              <button key={s.id} className="signal-btn" onClick={() => sendSignal(s)} title={s.meaning}>
                <span>{s.emoji}</span>
                <b>{s.meaning}</b>
                {signalSent === s.id && <i className="signal-ok">✓</i>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Пауза активна */}
      {pauseFmt && (
        <div className="cd static pause-card">
          <div className="cd-r">
            <div className="cd-ic">🛑</div>
            <div className="cd-t">
              <b>Пауза активна</b>
              <span>Осталось {pauseFmt}. Дышите — и мягко возвращайтесь.</span>
            </div>
          </div>
        </div>
      )}

      {!hasNextAction && (
        <div className="empty" style={{ paddingTop: 60 }}>
          <i>🏠</i>
          <div className="h2" style={{ marginBottom: 6 }}>Всё спокойно</div>
          <div className="dim" style={{ marginBottom: 18 }}>Здесь появляется следующий шаг: вопрос дня, прогноз заботы и тёплые моменты.</div>
          <Link href="/dashboard/couple" className="btn btn-p">Кто мы вдвоём →</Link>
        </div>
      )}

      {/* Модалка тихого сигнала */}
      {signalModal && (
        <div className="modal active" onClick={e => { if (e.target === e.currentTarget) setSignalModal(null) }}>
          <div className="modal-c" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>{signalModal.emoji}</div>
            <h3 style={{ marginBottom: 6 }}>Партнёр просит о поддержке</h3>
            <p className="dim" style={{ marginBottom: 20 }}>«{signalModal.meaning}»</p>
            <button className="btn btn-p btn-w" style={{ marginBottom: 8 }} onClick={answerSoftly}>🤍 Ответить мягко</button>
            <button className="link-btn" style={{ display: 'block', width: '100%', textAlign: 'center' }} onClick={() => setSignalModal(null)}>Позже</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}