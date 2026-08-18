'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { toast } from '@/lib/toast'

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

interface WarmthItem {
  id: string
  text: string
  fromName: string
  fromId: string
  createdAt: string
}

interface AssessmentProgress {
  key: string
  title: string
  emoji?: string
  completedByCurrent: boolean
  completedByPartner: boolean
  bothCompleted: boolean
}

interface PartnerInfo {
  name: string
  mood: { emoji: string; text: string | null } | null
}

interface SignalStatus {
  incoming: { signalId: string; emoji: string; meaning: string; suggestedReply: string; at: string } | null
}

interface CoupleStatus {
  couple: null | { id: string }
  outgoing: null | { id: string; toUsername: string }
  incoming: null | { id: string; fromUsername: string }
}

interface NotifPointer {
  key: string
  emoji: string
  title: string
  text: string
  href: string
}

const NOTIF_POINTER: Record<string, { emoji: string; href: string }> = {
  date_invited: { emoji: '📍', href: '/dashboard/date' },
  date_planned: { emoji: '📍', href: '/dashboard/date' },
  craving_added: { emoji: '🎁', href: '/dashboard/daily#partner' },
  wishlist_added: { emoji: '🎁', href: '/dashboard/daily#partner' },
  letter_sent: { emoji: '💌', href: '/dashboard/ai' },
  memory_added: { emoji: '📸', href: '/dashboard/date#history' },
  ritual_added: { emoji: '🕊️', href: '/dashboard/daily#challenges' },
  warmth_added: { emoji: '💌', href: '/dashboard/daily#warmth' },
}

function useTypewriter(text: string, speed = 40, startDelay = 250) {
  const [out, setOut] = useState('')
  const [done, setDone] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (reduced) {
      setOut(text)
      setDone(true)
      return
    }
    let i = 0
    let interval: ReturnType<typeof setInterval> | null = null
    const t1 = setTimeout(() => {
      interval = setInterval(() => {
        i += 1
        setOut(text.slice(0, i))
        if (i >= text.length) {
          if (interval) clearInterval(interval)
          setDone(true)
        }
      }, speed)
    }, startDelay)
    return () => {
      clearTimeout(t1)
      if (interval) clearInterval(interval)
    }
  }, [text, speed, startDelay, reduced])

  return { out, done }
}

export default function DashboardPage() {
  const [name, setName] = useState('')
  const [dq, setDq] = useState<DailyQ | null>(null)
  const [answerInput, setAnswerInput] = useState('')
  const [answered, setAnswered] = useState(false)
  const [care, setCare] = useState<CareForecast | null>(null)
  const [signalStatus, setSignalStatus] = useState<SignalStatus>({ incoming: null })
  const [coupleStatus, setCoupleStatus] = useState<CoupleStatus | null>(null)
  const [challenge, setChallenge] = useState<any>(null)
  const [pause, setPause] = useState<{ active: boolean; endsAt: string | null; secondsLeft: number }>({ active: false, endsAt: null, secondsLeft: 0 })
  const [assessments, setAssessments] = useState<AssessmentProgress[]>([])
  const [partner, setPartner] = useState<PartnerInfo | null>(null)
  const [seenReveal, setSeenReveal] = useState(false)
  const [notifPointers, setNotifPointers] = useState<NotifPointer[]>([])

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/dashboard').then(r => r.json()),
      fetch('/api/daily-question').then(r => r.json()).catch(() => ({ question: null })),
      fetch('/api/pause').then(r => r.json()).catch(() => ({ active: false, endsAt: null, secondsLeft: 0 })),
      fetch('/api/couples/status').then(r => r.json()).catch(() => null),
    ]).then(([d, q, p, cs]) => {
      setName(d?.user?.name?.split(' ')[0] ?? '')
      setCare(d?.careForecast ?? null)
      setChallenge(d?.activeChallenge ?? null)
      setPause(p)
      setDq(q?.question ?? null)
      setAnswered(q?.question?.myAnswered ?? false)
      setAssessments(d?.assessments ?? [])
      setPartner({
        name: d?.couple?.partnerA?.name === d?.user?.name ? d?.couple?.partnerB?.name ?? 'Партнёр' : d?.couple?.partnerA?.name ?? 'Партнёр',
        mood: d?.partnerMood ?? null,
      })
      setCoupleStatus(cs)
    }).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    const t = setInterval(() => {
      fetch('/api/pause').then(r => r.json()).then(p => setPause(p)).catch(() => {})
    }, 10000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const poll = () => {
      fetch('/api/signals').then(r => r.json()).then(d => {
        if (d) setSignalStatus({ incoming: d.incoming ?? null })
      }).catch(() => {})
    }
    poll()
    const t = setInterval(poll, 8000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const poll = () => {
      fetch('/api/notifications?limit=20').then(r => r.json()).then(d => {
        if (!d || !Array.isArray(d.items)) return
        const seen = new Set<string>()
        const ptrs: NotifPointer[] = []
        for (const n of d.items) {
          if (n.read || seen.has(n.type)) continue
          const p = NOTIF_POINTER[n.type]
          if (!p) continue
          seen.add(n.type)
          ptrs.push({ key: n.type, emoji: p.emoji, title: 'Новое от партнёра', text: n.text, href: p.href })
          if (ptrs.length >= 3) break
        }
        setNotifPointers(ptrs)
      }).catch(() => {})
    }
    poll()
    const t = setInterval(poll, 15000)
    return () => clearInterval(t)
  }, [])

  async function submitAnswer() {
    const answer = answerInput.trim()
    if (answer.length < 1 || answered) return
    const r = await fetch('/api/daily-question', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer }) })
    if (r.ok) {
      setAnswered(true)
      setAnswerInput('')
      toast('Ответ записан')
      window.dispatchEvent(new Event('together:refresh'))
      load()
    }
  }

  const pauseFmt = pause.active && pause.secondsLeft > 0
    ? `${Math.floor(pause.secondsLeft / 60)}:${String(pause.secondsLeft % 60).padStart(2, '0')}`
    : null

  const testsDone = assessments.filter(a => a.bothCompleted).length
  const testsTotal = assessments.length || 10
  const nextTest = assessments.find(a => !a.bothCompleted)
  const hasActiveQuestion = Boolean(dq && !dq.myAnswered)

  const headline = `Синхронизация сердец${name ? `, ${name}` : ''}…`
  const { out, done } = useTypewriter(headline)

  const partnerName = partner?.name ?? 'Партнёр'
  const revealEvent = Boolean(dq?.revealed && !seenReveal)

  interface ActionItem { key: string; emoji: string; title: string; sub: string; href: string; cta?: string }
  const actions: ActionItem[] = []
  if (coupleStatus?.incoming) {
    actions.push({ key: 'invite', emoji: '💌', title: `Инвайт от @${coupleStatus.incoming.fromUsername}`, sub: 'Партнёр ждёт вашего решения', href: '/dashboard/couple', cta: 'Принять' })
  } else if (!partner) {
    actions.push({ key: 'couple', emoji: '💞', title: 'Создать пару', sub: 'Свяжите аккаунты — тесты, отчёт и Психолог станут общими', href: '/dashboard/couple' })
  } else {
    if (dq && !dq.myAnswered) {
      actions.push({ key: 'dailyq', emoji: '🔮', title: 'Вопрос дня', sub: dq.text, href: '#dailyq', cta: 'Ответить' })
    }
    if (challenge && !challenge.completedByCurrent) {
      actions.push({ key: 'challenge', emoji: '🌙', title: 'Челлендж недели', sub: challenge.title, href: '/dashboard/daily#challenges', cta: 'Отметить' })
    }
    if (signalStatus.incoming) {
      actions.push({ key: 'signal', emoji: '🤗', title: 'Партнёр просит поддержки', sub: 'Тихий сигнал ждёт отклика', href: '/dashboard/daily#signals', cta: 'Ответить' })
    }
    if (care) {
      actions.push({ key: 'care', emoji: '🌦', title: 'Прогноз заботы', sub: care.text, href: '/dashboard/date', cta: care.cta })
    }
  }
  const visibleActions = actions.slice(0, 3)
  const nothingToDo = partner !== null && actions.length === 0 && !pauseFmt

  return (
    <DashboardLayout>
      <h1 className="h1" aria-label={headline}>{out}{!done && <span className="tw-caret" aria-hidden="true" />}</h1>
      <div className="dim">Что сейчас важнее всего — прямо здесь.</div>

      {/* 2 · ПАРТНЁР СЕЙЧАС — поддержать */}
      <div className="k">{partnerName} сейчас</div>
      <div className="cd static">
        <div className="cd-r">
          <div className="cd-ic" style={{ fontSize: 24 }}>{partner?.mood?.emoji ?? '💤'}</div>
          <div className="cd-t">
            <b>{partner?.mood?.text ?? 'Ещё не отметил(а) настроение'}</b>
            {partner
              ? <span>Нажмите «Поддержать», чтобы написать</span>
              : <span>Свяжите аккаунты, чтобы видеть настроение друг друга</span>}
          </div>
          <Link href={partner ? '/dashboard/ai' : '/dashboard/couple'} className="btn btn-primary btn-sm">
            💬 Поддержать
          </Link>
        </div>
      </div>

      {/* 3 · СЕЙЧАС — до 3 активных действий */}
      <div className="k">Сейчас</div>
      {visibleActions.length === 0 ? (
        nothingToDo ? (
          <div className="cd static">
            <div className="cd-r">
              <div className="cd-ic">🎉</div>
              <div className="cd-t">
                <b>Всё сделано 🎉</b>
                <span>Сегодня всё закрыто. Отличный повод просто побыть вместе.</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <Link href="/dashboard/date" className="btn btn-secondary">📍 Идея свидания</Link>
              <Link href="/dashboard/ai" className="btn btn-s">🦉 Спросить Психолога</Link>
            </div>
          </div>
        ) : (
          <div className="dim" style={{ padding: '4px 0 12px' }}>Данные загружаются…</div>
        )
      ) : (
        <div className="feed" style={{ display: 'grid', gap: 10 }}>
          {visibleActions.map(a => (
            <div key={a.key} className="cd static">
              <div className="cd-r">
                <div className="cd-ic">{a.emoji}</div>
                <div className="cd-t">
                  <b>{a.title}</b>
                  <span>{a.sub}</span>
                </div>
                {a.key !== 'dailyq' && (
                  <Link href={a.href} className="btn btn-secondary btn-sm">{a.cta ?? 'Открыть'}</Link>
                )}
              </div>
              {a.key === 'dailyq' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }} id="dailyq">
                  <input className="input" style={{ flex: 1 }} placeholder="Ваш ответ…" value={answerInput}
                    onChange={e => setAnswerInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitAnswer()} />
                  <button className="btn btn-primary" disabled={answerInput.trim().length < 1 || answered} onClick={submitAnswer}>Ответить</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 4 · НОВОЕ — указатели на действия партнёра */}
      {(revealEvent || notifPointers.length > 0 || pauseFmt) && (
        <>
          <div className="k">Новое</div>
          <div className="feed" style={{ display: 'grid', gap: 10 }}>
            {revealEvent && (
              <div className="cd static" id="dailyq">
                <div className="cd-r">
                  <div className="cd-ic">🔮</div>
                  <div className="cd-t">
                    <b>Ответы на вопрос дня раскрыты</b>
                    <span>{dq?.text}</span>
                  </div>
                </div>
                <div className="dq-reveal" style={{ marginTop: 12 }}>
                  <div className="dq-answer">
                    <b>Вы</b>
                    <p>{dq?.myAnswer ?? '—'}</p>
                  </div>
                  <div className="dq-answer partner">
                    <b>Партнёр</b>
                    <p>{dq?.partnerAnswer ?? '—'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <Link href="/dashboard/ai" className="btn btn-s btn-sm btn-w">💬 Обсудить с Психологом</Link>
                    <button className="link-btn" onClick={() => setSeenReveal(true)}>Понятно</button>
                  </div>
                </div>
              </div>
            )}
            {notifPointers.map(p => (
              <Link key={p.key} href={p.href} className="cd" style={{ textDecoration: 'none' }}>
                <div className="cd-r">
                  <div className="cd-ic">{p.emoji}</div>
                  <div className="cd-t">
                    <b>{p.title}</b>
                    <span>{p.text}</span>
                  </div>
                  <span className="arr">›</span>
                </div>
              </Link>
            ))}
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
          </div>
        </>
      )}

      {/* 5 · ДАЛЬШЕ — следующий тест или отчёт */}
      <div className="k">Дальше</div>
      <div className="cd static">
        <div className="cd-r">
          <div className="cd-ic">🗺️</div>
          <div className="cd-t">
            <b>{nextTest ? `Пройти «${nextTest.title}»` : 'Отчёт пары готов'}</b>
            <span>{testsDone} из {testsTotal} тестов пройдено вместе</span>
          </div>
        </div>
        <div className="prog-line" style={{ marginTop: 12 }}><div className="prog-fill" style={{ width: `${(testsDone / testsTotal) * 100}%` }} /></div>
        <Link
          href={nextTest ? `/dashboard/assessments/${nextTest.key}` : '/dashboard/couple#report'}
          className={hasActiveQuestion ? 'btn btn-secondary btn-w' : 'btn btn-primary btn-w'}
          style={{ marginTop: 12 }}
        >
          {nextTest ? 'Начать тест' : 'Открыть отчёт'}
        </Link>
      </div>
    </DashboardLayout>
  )
}