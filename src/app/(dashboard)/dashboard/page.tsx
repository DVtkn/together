'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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

interface AnalyticsData {
  compatibility: number | null
  strengths: Array<{ key: string; title: string; emoji: string; score: number; text: string }>
  weaknesses: Array<{ key: string; title: string; emoji: string; score: number; text: string; reason: string }>
  risks: Array<{ key: string; title: string; emoji: string; risk: string; prevention: string }>
  perspectives: string
  partnerPending: boolean
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
  const [assessments, setAssessments] = useState<AssessmentProgress[]>([])
  const [partner, setPartner] = useState<PartnerInfo | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [anTab, setAnTab] = useState<'strength' | 'growth' | 'risk' | 'next'>('strength')
  const [seenReveal, setSeenReveal] = useState(false)

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/dashboard').then(r => r.json()),
      fetch('/api/daily-question').then(r => r.json()).catch(() => ({ question: null })),
      fetch('/api/pause').then(r => r.json()).catch(() => ({ active: false, endsAt: null, secondsLeft: 0 })),
      fetch('/api/couple-analytics').then(r => r.json()).catch(() => null),
    ]).then(([d, q, p, an]) => {
      setName(d?.user?.name?.split(' ')[0] ?? '')
      setCare(d?.careForecast ?? null)
      setSignals(d?.signals ?? [])
      setWarmth(d?.warmth ?? [])
      setChallenge(d?.activeChallenge ?? null)
      setPause(p)
      setDq(q?.question ?? null)
      setAnswered(q?.question?.myAnswered ?? false)
      setAssessments(d?.assessments ?? [])
      setPartner({
        name: d?.couple?.partnerA?.name === d?.user?.name ? d?.couple?.partnerB?.name ?? 'Партнёр' : d?.couple?.partnerA?.name ?? 'Партнёр',
        mood: d?.partnerMood ?? null,
      })
      if (an) setAnalytics(an)
    }).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    const t = setInterval(() => {
      fetch('/api/pause').then(r => r.json()).then(p => setPause(p)).catch(() => {})
    }, 10000)
    return () => clearInterval(t)
  }, [])

  const [signalModal, setSignalModal] = useState<{ id: string; emoji: string; meaning: string; reply: string } | null>(null)
  const shownSignals = useRef<Set<string>>(new Set())

  useEffect(() => {
    const check = () => {
      fetch('/api/notifications?limit=10').then(r => r.json()).then(d => {
        if (!d || !Array.isArray(d.items)) return
        const sig = d.items.find((n: any) => n.type === 'signal_received' && !n.read && !shownSignals.current.has(n.id))
        if (sig) {
          shownSignals.current.add(sig.id)
          const params = new URLSearchParams(sig.href?.split('?')[1] ?? '')
          setSignalModal({
            id: params.get('id') || '',
            emoji: params.get('signal') || '🤗',
            meaning: params.get('meaning') || 'тихий сигнал',
            reply: params.get('reply') || '',
          })
        }
      }).catch(() => {})
    }
    check()
    const t = setInterval(check, 8000)
    return () => clearInterval(t)
  }, [])

  const ackSignal = (action: 'accept' | 'later') => {
    if (!signalModal || !signalModal.id) return
    fetch(`/api/signals/${signalModal.id}/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    }).catch(() => {})
  }

  const answerSoftly = () => {
    if (!signalModal) return
    ackSignal('accept')
    router.push(signalModal.reply ? `/dashboard/ai?reply=${encodeURIComponent(signalModal.reply)}` : '/dashboard/ai')
    setSignalModal(null)
  }

  const dismissSignal = () => {
    ackSignal('later')
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

  const testsDone = assessments.filter(a => a.bothCompleted).length
  const testsTotal = assessments.length || 10
  const nextTest = assessments.find(a => !a.bothCompleted)

  const headline = `Синхронизация сердец${name ? `, ${name}` : ''}…`
  const { out, done } = useTypewriter(headline)

  const partnerName = partner?.name ?? 'Партнёр'
  const waitingPartner = Boolean(partner && dq && dq.myAnswered && !dq.partnerAnswered && !dq.revealed)
  const revealEvent = Boolean(dq?.revealed && !seenReveal)

  interface ActionItem { key: string; emoji: string; title: string; sub: string; href: string; cta?: string }
  const actions: ActionItem[] = []
  if (!partner) {
    actions.push({ key: 'couple', emoji: '💞', title: 'Создать пару', sub: 'Свяжите аккаунты — тесты, отчёт и Сова станут общими', href: '/dashboard/couple' })
  } else {
    if (dq && !dq.myAnswered) {
      actions.push({ key: 'dailyq', emoji: '🔮', title: 'Вопрос дня', sub: dq.text, href: '#dailyq', cta: 'Ответить' })
    }
    if (challenge && !challenge.completedByCurrent) {
      actions.push({ key: 'challenge', emoji: '🌙', title: 'Челлендж недели', sub: challenge.title, href: '/dashboard/daily#challenges', cta: 'Отметить' })
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

      {/* ПАРТНЁР СЕЙЧАС — всегда */}
      <div className="k">{partnerName} сейчас</div>
      <Link href={partner ? '/dashboard/daily#partner' : '/dashboard/couple'} className="cd" style={{ textDecoration: 'none' }}>
        <div className="cd-r">
          <div className="cd-ic" style={{ fontSize: 24 }}>{partner?.mood?.emoji ?? '💤'}</div>
          <div className="cd-t">
            <b>{partner?.mood?.text ?? 'Ещё не отметил(а) настроение'}</b>
            {partner
              ? <span>{waitingPartner ? 'Ждём ответ партнёра на вопрос дня ✨' : 'Нажмите, чтобы увидеть детали'}</span>
              : <span>Свяжите аккаунты, чтобы видеть настроение друг друга</span>}
          </div>
          <span className="arr">›</span>
        </div>
      </Link>

      {/* СЕЙЧАС — до 3 активных действий */}
      <div className="k">Сейчас</div>
      {visibleActions.length === 0 ? (
        nothingToDo ? (
          <div className="cd static">
            <div className="cd-r">
              <div className="cd-ic">🎉</div>
              <div className="cd-t">
                <b>Всё сделано</b>
                <span>Сегодня всё закрыто. Отличный повод просто побыть вместе.</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <Link href="/dashboard/date" className="btn btn-p">📍 Идея свидания</Link>
              <Link href="/dashboard/couple#decks" className="btn btn-s">🎴 Колода близости</Link>
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
                  <Link href={a.href} className="btn btn-p btn-sm">{a.cta ?? 'Открыть'}</Link>
                )}
              </div>
              {a.key === 'dailyq' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }} id="dailyq">
                  <input className="input" style={{ flex: 1 }} placeholder="Ваш ответ…" value={answerInput}
                    onChange={e => setAnswerInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitAnswer()} />
                  <button className="btn btn-p" disabled={answerInput.trim().length < 1 || answered} onClick={submitAnswer}>Ответить</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* НОВОЕ — события */}
      {(revealEvent || pauseFmt) && (
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
                    <Link href="/dashboard/ai" className="btn btn-s btn-sm btn-w">💬 Обсудить с Совой</Link>
                    <button className="link-btn" onClick={() => setSeenReveal(true)}>Понятно</button>
                  </div>
                </div>
              </div>
            )}
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

      {/* ТИХИЙ СИГНАЛ — всегда */}
      <div className="k">Тихий сигнал</div>
      <div className="cd static">
        <div className="cd-r">
          <div className="cd-ic">🤗</div>
          <div className="cd-t">
            <b>Один тап — без слов</b>
            <span>{partner ? 'Отправьте партнёру сигнал о поддержке' : 'Создайте пару, чтобы отправлять сигналы'}</span>
          </div>
        </div>
        {signals.length > 0 ? (
          <div className="signal-row" style={{ marginTop: 12 }}>
            {signals.map(s => (
              <button key={s.id} className="signal-btn" onClick={() => sendSignal(s)} title={s.meaning}>
                <span>{s.emoji}</span>
                <b>{s.meaning}</b>
                {signalSent === s.id && <i className="signal-ok">✓</i>}
              </button>
            ))}
          </div>
        ) : (
          <div className="dim" style={{ marginTop: 10 }}>Сигналы появятся здесь — добавьте свои в настройках.</div>
        )}
      </div>

      {/* ПРОДОЛЖИТЬ — следующий тест или отчёт */}
      <div className="k">Продолжить</div>
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
          className="btn btn-p btn-w"
          style={{ marginTop: 12 }}
        >
          {nextTest ? 'Начать тест' : 'Открыть отчёт'}
        </Link>
      </div>

      {/* БАНК ТЕПЛА — последняя запись компактно */}
      {warmth.length > 0 && (
        <>
          <div className="k">Банк тепла</div>
          <div className="cd static">
            <div className="warmth-item" style={{ alignItems: 'center' }}>
              <span className="warmth-ic">💌</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{warmth[0].text}</b>
                <span className="small">— {warmth[0].fromName}</span>
              </div>
              <Link href="/dashboard/daily#warmth" className="btn btn-s btn-sm">+ Спасибо</Link>
            </div>
          </div>
        </>
      )}

      {/* АНАЛИТИКА ПАРЫ */}
      <div className="k">Аналитика пары{analytics?.compatibility != null ? ` · ${analytics.compatibility}%` : ''}</div>
      <div className="cd static">
        {analytics?.partnerPending || !analytics ? (
          <div className="dim" style={{ padding: '8px 0', textAlign: 'center' }}>
            Ответьте на тесты вместе, чтобы увидеть сильные стороны, зоны роста и риски.
          </div>
        ) : (
          <>
            <div className="seg" style={{ marginTop: 0 }}>
              <button className={cn(anTab === 'strength' && 'on')} onClick={() => setAnTab('strength')}>💪 Силы</button>
              <button className={cn(anTab === 'growth' && 'on')} onClick={() => setAnTab('growth')}>⚠️ Рост</button>
              <button className={cn(anTab === 'risk' && 'on')} onClick={() => setAnTab('risk')}>🚨 Риски</button>
              <button className={cn(anTab === 'next' && 'on')} onClick={() => setAnTab('next')}>🔮 Дальше</button>
            </div>

            {anTab === 'strength' && (
              analytics.strengths.length ? (
                <div className="an-list">
                  {analytics.strengths.map(s => (
                    <div key={s.key} className="an-item ok">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="an-ic">{s.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <b style={{ fontSize: 14 }}>{s.title}</b>
                          <span className="small dim" style={{ display: 'block' }}>{s.text}</span>
                        </div>
                        <span className="an-b">{s.score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="dim" style={{ textAlign: 'center', padding: '8px 0' }}>Сильные стороны (от 70%) появятся после тестов.</div>
            )}

            {anTab === 'growth' && (
              analytics.weaknesses.length ? (
                <div className="an-list">
                  {analytics.weaknesses.map(w => (
                    <div key={w.key} className="an-item warn">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="an-ic">{w.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <b style={{ fontSize: 14 }}>{w.title} <span className="dim" style={{ fontWeight: 500 }}>· {w.reason}</span></b>
                          <span className="small dim" style={{ display: 'block' }}>{w.text}</span>
                        </div>
                        <span className="an-b">{w.score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="dim" style={{ textAlign: 'center', padding: '8px 0' }}>Зон роста ниже 60% нет — держите уровень 💪</div>
            )}

            {anTab === 'risk' && (
              analytics.risks.length ? (
                <div className="an-list">
                  {analytics.risks.map(r => (
                    <div key={r.key} className="an-item risk">
                      <b style={{ fontSize: 14 }}>{r.emoji} {r.title}</b>
                      <p className="small dim" style={{ margin: '6px 0 0' }}>{r.risk}</p>
                      <p className="small" style={{ margin: '8px 0 0', color: 'var(--ok)' }}>→ {r.prevention}</p>
                    </div>
                  ))}
                </div>
              ) : <div className="dim" style={{ textAlign: 'center', padding: '8px 0' }}>Рисков не выявлено.</div>
            )}

            {anTab === 'next' && (
              <div className="an-item" style={{ border: 'none', background: 'transparent', padding: 0 }}>
                <p className="dim" style={{ lineHeight: 1.7 }}>{analytics.perspectives}</p>
                <Link href="/dashboard/couple#report" className="btn btn-s btn-w" style={{ marginTop: 12 }}>Полный отчёт пары →</Link>
              </div>
            )}
          </>
        )}
      </div>

      {/* Модалка тихого сигнала */}
      {signalModal && (
        <div className="modal active" onClick={e => { if (e.target === e.currentTarget) dismissSignal() }}>
          <div className="modal-c" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>{signalModal.emoji}</div>
            <h3 style={{ marginBottom: 6 }}>Партнёр просит о поддержке</h3>
            <p className="dim" style={{ marginBottom: 20 }}>«{signalModal.meaning}»</p>
            <button className="btn btn-p btn-w" style={{ marginBottom: 8 }} onClick={answerSoftly}>🤍 Ответить мягко</button>
            <button className="link-btn" style={{ display: 'block', width: '100%', textAlign: 'center' }} onClick={dismissSignal}>Позже</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}