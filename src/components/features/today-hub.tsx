'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { SupportSheet } from '@/components/features/support-sheet'
import { cn } from '@/lib/utils/cn'
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

interface PulseData {
  checkins: Array<{
    year: number
    weekNumber: number
    user: { closeness: number; conflictResolution: number; missing: string | null } | null
    partner: { closeness: number; conflictResolution: number; missing: string | null } | null
  }>
}

interface Challenge {
  id: string
  weekNumber: number
  year: number
  title: string
  description: string
  instruction: string
  examplePhrase: string | null
  axis: string
  difficulty: number
  durationMin: number
  status: string
  completedByCurrent: boolean
  completedByPartner: boolean
}

interface Ritual {
  id: string
  title: string
  emoji: string
  mine: boolean
  partner: boolean
}

interface Craving {
  id: string
  item: string
  status: string
}

interface Wish {
  id: string
  title: string
  link: string | null
  status: string
}

interface CoupleAnalytics {
  compatibility: number | null
  strengths: Array<{ key: string; title: string; emoji: string; score: number; text: string }>
  weaknesses: Array<{ key: string; title: string; emoji: string; score: number; text: string }>
  perspectives: string
}

const MOODS: Array<{ emoji: string; label: string }> = [
  { emoji: '😄', label: 'супер' },
  { emoji: '🙂', label: 'хорошо' },
  { emoji: '😐', label: 'ок' },
  { emoji: '🥺', label: 'грустно' },
  { emoji: '😰', label: 'тревожно' },
  { emoji: '😤', label: 'злюсь' },
]

const RITUAL_IDEAS = [
  { t: 'Утренний кофе молча', e: '☕' },
  { t: 'Вечерний чай на балконе', e: '🍵' },
  { t: 'Прогулка без телефонов', e: '🚶' },
  { t: 'Обнимашки на 20 секунд', e: '🤗' },
]

const NOTIF_POINTER: Record<string, { emoji: string; href: string }> = {
  date_invited: { emoji: '📍', href: '/dashboard/date' },
  date_planned: { emoji: '📍', href: '/dashboard/date' },
  craving_added: { emoji: '🎁', href: '/dashboard#partner' },
  wishlist_added: { emoji: '🎁', href: '/dashboard#partner' },
  letter_sent: { emoji: '💌', href: '/dashboard/ai' },
  memory_added: { emoji: '📸', href: '/dashboard/date#history' },
  ritual_added: { emoji: '🕊️', href: '/dashboard#challenges' },
  warmth_added: { emoji: '💌', href: '/dashboard#partner' },
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

export default function TodayHub() {
  const router = useRouter()

  const [, setName] = useState('')
  const [partner, setPartner] = useState<PartnerInfo | null>(null)
  const [dq, setDq] = useState<DailyQ | null>(null)
  const [answerInput, setAnswerInput] = useState('')
  const [answered, setAnswered] = useState(false)
  const [care, setCare] = useState<CareForecast | null>(null)
  const [signalStatus, setSignalStatus] = useState<SignalStatus>({ incoming: null })
  const [coupleStatus, setCoupleStatus] = useState<CoupleStatus | null>(null)
  const [pause, setPause] = useState<{ active: boolean; endsAt: string | null; secondsLeft: number }>({ active: false, endsAt: null, secondsLeft: 0 })
  const [analytics, setAnalytics] = useState<CoupleAnalytics | null>(null)
  const [insightOpen, setInsightOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [seenReveal, setSeenReveal] = useState(false)
  const [notifPointers, setNotifPointers] = useState<NotifPointer[]>([])
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([])

  const [myMood, setMyMood] = useState<{ emoji: string; text: string | null } | null>(null)
  const [pulse, setPulse] = useState<PulseData | null>(null)
  const [streak, setStreak] = useState(0)
  const [closeness, setCloseness] = useState(5)
  const [conflictResolution, setConflictResolution] = useState(5)
  const [missing, setMissing] = useState('')
  const [pulseSubmitting, setPulseSubmitting] = useState(false)
  const [pulseFormOpen, setPulseFormOpen] = useState(false)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [completing, setCompleting] = useState<string | null>(null)
  const [rituals, setRituals] = useState<Ritual[]>([])
  const [ritualInput, setRitualInput] = useState('')
  const [ritualOpen, setRitualOpen] = useState(false)
  const [warmth, setWarmth] = useState<WarmthItem[]>([])
  const [warmthText, setWarmthText] = useState('')

  const [partnerOpen, setPartnerOpen] = useState(false)
  const [partnerTab, setPartnerTab] = useState<'cravings' | 'wishlist' | 'flowers' | 'warmth'>('cravings')
  const [cravings, setCravings] = useState<Craving[]>([])
  const [partnerCravings, setPartnerCravings] = useState<Craving[]>([])
  const [cravingInput, setCravingInput] = useState('')
  const [wishes, setWishes] = useState<Wish[]>([])
  const [partnerWishes, setPartnerWishes] = useState<Wish[]>([])
  const [wishTitle, setWishTitle] = useState('')
  const [wishLink, setWishLink] = useState('')
  const [flowers, setFlowers] = useState<Array<{ slug: string; name: string; emoji: string; meaning: string | null; favorite: boolean }>>([])
  const [flowerBusy, setFlowerBusy] = useState(false)

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/dashboard').then(r => r.json()).catch(() => ({})),
      fetch('/api/daily-question').then(r => r.json()).catch(() => ({ question: null })),
      fetch('/api/pause').then(r => r.json()).catch(() => ({ active: false, endsAt: null, secondsLeft: 0 })),
      fetch('/api/couples/status').then(r => r.json()).catch(() => null),
      fetch('/api/mood').then(r => r.json()).catch(() => ({ mine: null })),
      fetch('/api/pulse').then(r => r.json()).catch(() => ({ checkins: [] })),
      fetch('/api/challenges').then(r => r.json()).catch(() => ({ challenges: [] })),
      fetch('/api/rituals').then(r => r.json()).catch(() => ({ items: [] })),
      fetch('/api/warmth?limit=3').then(r => r.json()).catch(() => ({ entries: [] })),
    ]).then(([d, q, p, cs, m, pul, ch, rt, wm]) => {
      setName(d?.user?.name?.split(' ')[0] ?? '')
      setCare(d?.careForecast ?? null)
      setPause(p)
      setDq(q?.question ?? null)
      setAnswered(q?.question?.myAnswered ?? false)
      setPartner({
        name: d?.couple?.partnerA?.name === d?.user?.name ? d?.couple?.partnerB?.name ?? 'Партнёр' : d?.couple?.partnerA?.name ?? 'Партнёр',
        mood: d?.partnerMood ?? null,
      })
      setCoupleStatus(cs)
      setMyMood(m?.mine ?? null)
      setPulse(pul)
      if (pul?.checkins) {
        let s = 0
        const today = new Date().toISOString().split('T')[0]
        const sorted = [...pul.checkins].sort((a, b) => new Date(b.year * 100 + b.weekNumber).getTime() - new Date(a.year * 100 + a.weekNumber).getTime())
        for (const c of sorted) {
          const d = c.user
          if (d && d.closeness > 0) s++
          else break
        }
        setStreak(s)
      }
      setChallenges(ch?.challenges ?? [])
      setRituals(rt?.items ?? [])
      setWarmth(wm?.entries ?? [])
    }).catch(() => {})
    fetch('/api/couple-analytics').then(r => r.json()).then(d => {
      if (d && typeof d === 'object' && 'compatibility' in d) setAnalytics(d as CoupleAnalytics)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const refresh = () => load()
    window.addEventListener('together:refresh', refresh)
    return () => window.removeEventListener('together:refresh', refresh)
  }, [load])

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

  useEffect(() => {
    if (!partnerOpen) return
    Promise.all([
      fetch('/api/cravings').then(r => r.json()).catch(() => ({ cravings: { mine: [], partner: [] } })),
      fetch('/api/wishlist').then(r => r.json()).catch(() => ({ items: { mine: [], partner: [] } })),
      fetch('/api/flowers').then(r => r.json()).catch(() => ({ flowers: [] })),
    ]).then(([c, w, f]) => {
      setCravings(c.cravings?.mine ?? [])
      setPartnerCravings(c.cravings?.partner ?? [])
      setWishes(w.items?.mine ?? [])
      setPartnerWishes(w.items?.partner ?? [])
      setFlowers(f.flowers ?? [])
    }).catch(() => {})
  }, [partnerOpen])

  async function tapMood(emoji: string) {
    if (myMood?.emoji === emoji) return
    await fetch('/api/mood', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji }) }).catch(() => {})
    setMyMood({ emoji, text: null })
    window.dispatchEvent(new Event('together:refresh'))
  }

  async function remind() {
    await fetch('/api/notifications/remind-mood', { method: 'POST' }).catch(() => {})
    alert('Напоминание отправлено 💜')
  }

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

  async function submitPulse() {
    setPulseSubmitting(true)
    try {
      await fetch('/api/pulse', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closeness, conflictResolution, missing: missing || undefined }),
      })
      toast('Пульс недели сохранён')
      const res = await fetch('/api/pulse')
      setPulse(await res.json())
      setMissing('')
    } catch { /* ignore */ } finally { setPulseSubmitting(false) }
  }

  async function completeChallenge(id: string) {
    setCompleting(id)
    try {
      await fetch(`/api/challenges/${id}/complete`, { method: 'POST' })
      toast('Челлендж отмечен 🌙')
      const res = await fetch('/api/challenges')
      setChallenges((await res.json()).challenges ?? [])
    } catch { /* ignore */ } finally { setCompleting(null) }
    window.dispatchEvent(new Event('together:refresh'))
  }

  async function addRitual(title?: string) {
    const t = (title ?? ritualInput).trim()
    if (t.length < 2) return
    await fetch('/api/rituals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: t, emoji: '🕊️' }) })
    toast('Ритуал добавлен')
    setRitualInput('')
    setRitualOpen(false)
    const rt = await fetch('/api/rituals').then(r => r.json())
    setRituals(rt?.items ?? [])
    window.dispatchEvent(new Event('together:refresh'))
  }

  async function toggleRitual(id: string) {
    const r = await fetch(`/api/rituals/${id}/done`, { method: 'POST' }).catch(() => null)
    if (r?.ok) toast('Ритуал отмечен 🕊️')
    const rt = await fetch('/api/rituals').then(r => r.json())
    setRituals(rt?.items ?? [])
    window.dispatchEvent(new Event('together:refresh'))
  }

  async function addWarmth() {
    const text = warmthText.trim()
    if (text.length < 2) return
    await fetch('/api/warmth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
    toast('Записано в Банк тепла 💌')
    setWarmthText('')
    const wm = await fetch('/api/warmth?limit=3').then(r => r.json())
    setWarmth(wm?.entries ?? [])
    window.dispatchEvent(new Event('together:refresh'))
  }

  async function addCraving() {
    const item = cravingInput.trim()
    if (!item) return
    await fetch('/api/cravings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item }) })
    toast('Добавлено в хотелки')
    setCravingInput('')
    const c = await fetch('/api/cravings').then(r => r.json())
    setCravings(c.cravings?.mine || [])
    window.dispatchEvent(new Event('together:refresh'))
  }

  async function pickCraving(id: string) {
    const r = await fetch(`/api/cravings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'pick' }) }).catch(() => null)
    if (r?.ok) toast('Отмечено подаренным 🎁')
    const c = await fetch('/api/cravings').then(r => r.json())
    setCravings(c.cravings?.mine || [])
    setPartnerCravings(c.cravings?.partner || [])
    window.dispatchEvent(new Event('together:refresh'))
  }

  async function addWish() {
    const title = wishTitle.trim()
    if (!title) return
    await fetch('/api/wishlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, link: wishLink.trim() || undefined }) })
    toast('Добавлено в виш-лист')
    setWishTitle('')
    setWishLink('')
    const w = await fetch('/api/wishlist').then(r => r.json())
    setWishes(w.items?.mine || [])
    window.dispatchEvent(new Event('together:refresh'))
  }

  async function markGifted(id: string) {
    const r = await fetch(`/api/wishlist/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'BOUGHT' }) }).catch(() => null)
    if (r?.ok) toast('Отмечено подаренным 🎁')
    const w = await fetch('/api/wishlist').then(r => r.json())
    setWishes(w.items?.mine || [])
    setPartnerWishes(w.items?.partner || [])
    window.dispatchEvent(new Event('together:refresh'))
  }

  const weeks = pulse?.checkins ?? []
  const userCurrent = weeks.length ? weeks[weeks.length - 1]?.user ?? null : null
  const activeChallenges = challenges.filter(c => c.status === 'ACTIVE' || c.status === 'PENDING')

  const partnerName = partner?.name ?? 'Партнёр'
  const top = analytics?.strengths?.[0] ?? null
  const weak = analytics?.weaknesses?.[0] ?? null
  const advice = analytics?.perspectives ?? ''

  const filledWeeks = weeks.filter(w => w.user || w.partner)
  const chartWeeks = filledWeeks.slice(-12)
  const last4 = filledWeeks.slice(-4)
  const prev4 = filledWeeks.slice(-8, -4)
  const avgClose = (arr: typeof filledWeeks, who: 'user' | 'partner') => {
    const v = arr.filter(w => w[who]).map(w => w[who]!.closeness)
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
  }
  const myLast = avgClose(last4, 'user')
  const myPrev = avgClose(prev4, 'user')
  const ptLast = avgClose(last4, 'partner')
  const ptPrev = avgClose(prev4, 'partner')
  const current = weeks.length ? weeks[weeks.length - 1] : null
  const myCur = current?.user?.closeness
  const ptCur = current?.partner?.closeness
  const chartPoints = (who: 'user' | 'partner'): string | null => {
    const n = chartWeeks.length
    if (n < 2) return null
    const pts: string[] = []
    chartWeeks.forEach((w, i) => {
      const v = w[who]?.closeness
      if (v == null) return
      const x = 10 + (i * (280 / (n - 1)))
      const y = 100 - ((v - 1) / 9) * 88
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    })
    return pts.length > 1 ? pts.join(' ') : null
  }
  const myLine = chartPoints('user')
  const ptLine = chartPoints('partner')

  const insights: Array<{ emoji: string; text: string }> = []
  if (myLast != null && myPrev != null) {
    const d = +(myLast - myPrev).toFixed(1)
    insights.push({
      emoji: d > 0.3 ? '📈' : d < -0.3 ? '📉' : '➡️',
      text: d > 0.3 ? `Ваша близость растёт: +${d.toFixed(1)} за 4 недели.` : d < -0.3 ? `Ваша близость снижается (−${Math.abs(d).toFixed(1)}) за 4 недели.` : 'Ваша близость стабильна.',
    })
  }
  if (myCur != null && ptCur != null) {
    const diff = Math.abs(myCur - ptCur)
    insights.push(
      diff >= 2
        ? { emoji: '🧭', text: `Восприятие близости расходится на ${diff} балла (вы ${myCur}, партнёр ${ptCur}). Обсудите это.` }
        : { emoji: '💞', text: `На этой неделе вы сходитесь в ощущении близости (${myCur} и ${ptCur}).` }
    )
  } else if (myCur != null && ptCur == null) {
    insights.push({ emoji: '🔔', text: `${partnerName} ещё не отметил(а) пульс этой недели — напомните мягко.` })
  }
  if (insights.length === 0) {
    insights.push({ emoji: '💜', text: 'Заполните пульс недели — здесь появятся график и инсайты.' })
  }

  const headline = 'Синхронизация сердец…'
  const { out, done } = useTypewriter(headline)
  const pauseFmt = pause.active && pause.secondsLeft > 0
    ? `${Math.floor(pause.secondsLeft / 60)}:${String(pause.secondsLeft % 60).padStart(2, '0')}`
    : null
  const revealEvent = Boolean(dq?.revealed && !seenReveal)

  return (
    <DashboardLayout>
      {/* STREAK + MOOD — одна строка */}
      <div className="streak-mood">
        <div className="streak-badge" style={{ flex: 1 }}>
          {streak > 0 ? (
            <span aria-label={`стрик ${streak} дней`}>
              <b>🔥 {streak}</b>
              {streak === 1 ? ' день' : streak < 5 ? ' дня' : ' дней'} подряд
            </span>
          ) : (
            <span className="dim">Начните стрик — отметьте настроение</span>
          )}
        </div>
        <div className="mood-row" role="group" aria-label="Настроение сегодня">
          {MOODS.map(m => (
            <button
              key={m.emoji}
              className={cn('mood-big', myMood?.emoji === m.emoji && 'sel')}
              onClick={() => tapMood(m.emoji)}
              aria-label={m.label}
              aria-pressed={myMood?.emoji === m.emoji}
            >
              <i>{m.emoji}</i>
              <b>{myMood?.emoji === m.emoji ? 'это ты' : m.label}</b>
            </button>
          ))}
        </div>
      </div>

      {/* ИНВАЙТ — если партнёр ждёт решения */}
      {coupleStatus?.incoming && (
        <div className="cd static mt">
          <div className="cd-r">
            <div className="cd-ic">💌</div>
            <div className="cd-t">
              <b>Инвайт от @{coupleStatus.incoming.fromUsername}</b>
              <span>Партнёр ждёт вашего решения</span>
            </div>
            <Link href="/dashboard/couple" className="btn btn-secondary btn-sm">Принять</Link>
          </div>
        </div>
      )}

      {/* ПАРТНЁР СЕЙЧАС + Поддержать + Сигнал */}
      {partner && (
        <div id="partner-now" className="mt" style={{ scrollMarginTop: 80 }}>
          <div className="k">{partnerName} сейчас</div>
          <div className="cd static">
            {partner?.mood ? (
              <div className="cd-r">
                <div className="cd-ic" style={{ fontSize: 24 }}>{partner.mood.emoji}</div>
                <div className="cd-t">
                  <b>{partner.name}</b>
                  <span>{partner.mood.text ?? 'Отметил(а) настроение'}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setSupportOpen(true)}>💬 Поддержать</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => window.dispatchEvent(new CustomEvent('together:open', { detail: { type: 'signal' } }))}>🕊 Сигнал</button>
                </div>
              </div>
            ) : (
              <div className="cd-r">
                <div className="cd-ic" style={{ fontSize: 24 }}>💤</div>
                <div className="cd-t">
                  <b>{partnerName} ещё не отметил(а)</b>
                  <span>Когда отметит — увидите здесь</span>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={remind}>🔔 Напомнить</button>
              </div>
            )}
            {signalStatus.incoming && (
              <div className="notice" style={{ marginTop: 10, alignItems: 'center' }}>
                <span>🕊️</span>
                <div style={{ flex: 1 }}><b>{partnerName} просит поддержки</b> · «{signalStatus.incoming.meaning}»</div>
                <button className="btn btn-secondary btn-sm" onClick={() => window.dispatchEvent(new CustomEvent('together:open', { detail: { type: 'signal' } }))}>Ответить</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ВОПРОС ДНЯ — инлайн */}
      {dq && (
        <div id="dailyq" className="mt" style={{ scrollMarginTop: 80 }}>
          <div className="k">Вопрос дня</div>
          <div className="cd static" id="dailyq">
            <div className="cd-r">
              <div className="cd-ic">🔮</div>
              <div className="cd-t">
                <b>{dq.text}</b>
                <span>{dq.myAnswered ? 'Вы уже ответили — ответ партнёра появится вечером' : 'Ответьте — и вечером увидите ответ партнёра'}</span>
              </div>
            </div>
            {!dq.myAnswered && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input className="input" style={{ flex: 1 }} placeholder="Ваш ответ…" value={answerInput}
                  onChange={e => setAnswerInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitAnswer()} />
                <button className="btn btn-primary" disabled={answerInput.trim().length < 1 || answered} onClick={submitAnswer}>Ответить</button>
              </div>
            )}
            {revealEvent && (
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
                  <Link href="/dashboard/ai" className="btn btn-secondary btn-sm btn-w">💬 Обсудить с Психологом</Link>
                  <button className="link-btn" onClick={() => setSeenReveal(true)}>Понятно</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* СОВМЕСТИМОСТЬ — компактная сводка + аккордеон */}
      {partner && analytics?.compatibility != null && (
        <div id="compatibility" className="mt" style={{ scrollMarginTop: 80 }}>
          <div className="k">Совместимость</div>
          <div className="cd static">
            <div className="cd-r">
              <div className="cd-t">
                <b>{analytics.compatibility}% совпадаете</b>
                <span>
                  <button className="link-btn" onClick={() => setInsightOpen(!insightOpen)} style={{ marginRight: 8 }}>
                    {insightOpen ? 'Скрыть' : 'Что это значит?'}
                  </button>
                  <Link href="/dashboard/couple" className="link-btn">Подробнее →</Link>
                </span>
              </div>
            </div>
            {insightOpen && (
              <div className="insight-row" style={{ marginTop: 12 }}>
                <div className="insight"><b>{analytics.compatibility}%</b><span>совместимость</span></div>
                {top && <div className="insight ok"><b>{top.emoji} {top.title} {top.score}%</b><span>суперсила</span></div>}
                {weak && <div className="insight warn"><b>{weak.emoji} {weak.title} {weak.score}%</b><span>зона роста</span></div>}
              </div>
            )}
            {insightOpen && (
              <div className="insight-detail" style={{ marginTop: 8 }}>
                {top?.text && <p>💪 {top.text}</p>}
                {weak?.text && <p>⚠️ {weak.text}</p>}
                {advice && <div className="ai-action">🎯 Совет недели: {advice}</div>}
                <button className="btn btn-secondary btn-w" style={{ marginTop: 10 }} onClick={() => router.push('/dashboard/ai')}>Разобрать с Совой</button>
              </div>
            )}
          </div>
        </div>
      )}

      {toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}
    </DashboardLayout>
  )
}
