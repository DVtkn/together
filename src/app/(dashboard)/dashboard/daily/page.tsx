'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { cn } from '@/lib/utils/cn'
import { toast } from '@/lib/toast'

const SCORE: Record<string, number> = { '😄': 5, '🙂': 4, '😐': 3, '🥺': 2, '😰': 2, '😤': 1 }

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

interface Craving { id: string; item: string; status: string }
interface Wish { id: string; title: string; link: string | null; status: string; priceRange: string | null }

const SECTIONS = [
  { key: 'mood', label: 'Настроение', emoji: '😄' },
  { key: 'partner-now', label: 'Сейчас', emoji: '💞' },
  { key: 'warmth', label: 'Тепло', emoji: '💌' },
  { key: 'pulse', label: 'Пульс', emoji: '🫀' },
  { key: 'challenges', label: 'Ритуалы', emoji: '🕊️' },
  { key: 'partner', label: 'Хотелки', emoji: '💐' },
]

export default function DailyPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [myMood, setMyMood] = useState<{ emoji: string; text: string | null } | null>(null)
  const [partner, setPartner] = useState<{ name: string; mood: { emoji: string; text: string | null; at: string } | null } | null>(null)

  const [pulse, setPulse] = useState<PulseData | null>(null)
  const [closeness, setCloseness] = useState(5)
  const [conflictResolution, setConflictResolution] = useState(5)
  const [missing, setMissing] = useState('')
  const [pulseSubmitting, setPulseSubmitting] = useState(false)

  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [completing, setCompleting] = useState<string | null>(null)

  const [partnerTab, setPartnerTab] = useState('mood')
  const [partnerMood, setPartnerMood] = useState<{ emoji: string; text: string | null } | null>(null)
  const [cravings, setCravings] = useState<Craving[]>([])
  const [partnerCravings, setPartnerCravings] = useState<Craving[]>([])
  const [cravingInput, setCravingInput] = useState('')
  const [wishes, setWishes] = useState<Wish[]>([])
  const [partnerWishes, setPartnerWishes] = useState<Wish[]>([])
  const [wishTitle, setWishTitle] = useState('')
  const [wishLink, setWishLink] = useState('')
  const [flowers, setFlowers] = useState<Array<{ slug: string; name: string; emoji: string; meaning: string | null; favorite: boolean }>>([])
  const [flowerBusy, setFlowerBusy] = useState(false)
  const [warmth, setWarmth] = useState<Array<{ id: string; text: string; fromName: string; fromId: string; createdAt: string }>>([])
  const [warmthText, setWarmthText] = useState('')

  const [rituals, setRituals] = useState<Array<{ id: string; title: string; emoji: string; mine: boolean; partner: boolean }>>([])
  const [ritualInput, setRitualInput] = useState('')
  const [ritualOpen, setRitualOpen] = useState(false)
  const RITUAL_IDEAS = [
    { t: 'Утренний кофе молча', e: '☕' },
    { t: 'Вечерний чай на балконе', e: '🍵' },
    { t: 'Прогулка без телефонов', e: '🚶' },
    { t: 'Обнимашки на 20 секунд', e: '🤗' },
  ]

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/mood').then(r => r.json()).catch(() => ({ mine: null, partner: null })),
      fetch('/api/user/profile').then(r => r.json()).catch(() => ({})),
      fetch('/api/dashboard').then(r => r.json()).catch(() => ({})),
      fetch('/api/pulse').then(r => r.json()).catch(() => ({ checkins: [] })),
      fetch('/api/challenges').then(r => r.json()).catch(() => ({ challenges: [] })),
      fetch('/api/warmth?limit=3').then(r => r.json()).catch(() => ({ entries: [] })),
      fetch('/api/rituals').then(r => r.json()).catch(() => ({ items: [] })),
    ]).then(([m, p, d, pul, ch, wm, rt]) => {
      setMyMood(m.mine ?? null)
      setPartner({ name: p?.couple?.partnerName ?? 'Партнёр', mood: m.partner ? { ...m.partner, at: m.partner.at } : null })
      setName(d?.user?.name?.split(' ')[0] ?? '')
      setPulse(pul)
      setChallenges(ch?.challenges ?? [])
      setWarmth(wm?.entries ?? [])
      setRituals(rt?.items ?? [])
    }).catch(() => {})
  }, [])
  useEffect(() => {
    load()
    const refresh = () => load()
    window.addEventListener('together:refresh', refresh)
    return () => window.removeEventListener('together:refresh', refresh)
  }, [load])

  useEffect(() => {
    if (partnerTab === 'mood') {
      fetch('/api/mood').then(r => r.json()).then(m => setPartnerMood(m.partner ?? null)).catch(() => {})
    } else if (partnerTab === 'cravings') {
      fetch('/api/cravings').then(r => r.json()).then(c => { setCravings(c.cravings?.mine || []); setPartnerCravings(c.cravings?.partner || []) }).catch(() => {})
    } else if (partnerTab === 'wishlist') {
      fetch('/api/wishlist').then(r => r.json()).then(w => { setWishes(w.items?.mine || []); setPartnerWishes(w.items?.partner || []) }).catch(() => {})
    } else if (partnerTab === 'flowers') {
      fetch('/api/flowers').then(r => r.json()).then(f => setFlowers(f.flowers || [])).catch(() => {})
    }
  }, [partnerTab])

  async function remind() {
    await fetch('/api/notifications/remind-mood', { method: 'POST' }).catch(() => {})
    alert('Напоминание отправлено 💜')
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

  async function markGifted(id: string) {
    const r = await fetch(`/api/wishlist/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'BOUGHT' }) }).catch(() => null)
    if (r?.ok) toast('Отмечено подаренным 🎁')
    const w = await fetch('/api/wishlist').then(r => r.json())
    setWishes(w.items?.mine || [])
    setPartnerWishes(w.items?.partner || [])
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

  const weeks = pulse?.checkins ?? []
  const userCurrent = weeks.length ? weeks[weeks.length - 1]?.user ?? null : null
  const activeChallenges = challenges.filter(c => c.status === 'ACTIVE' || c.status === 'PENDING')
  const completedCount = challenges.filter(c => c.status === 'COMPLETED').length
  const partnerName = partner?.name ?? 'Партнёр'

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
  if (ptLast != null && ptPrev != null) {
    const d = +(ptLast - ptPrev).toFixed(1)
    insights.push({
      emoji: d > 0.3 ? '📈' : d < -0.3 ? '📉' : '➡️',
      text: d > 0.3 ? `Близость партнёра растёт: +${d.toFixed(1)} за 4 недели.` : d < -0.3 ? `Близость партнёра снижается (−${Math.abs(d).toFixed(1)}) за 4 недели.` : 'Близость партнёра стабильна.',
    })
  }
  if (myCur != null && ptCur == null) {
    insights.push({ emoji: '🔔', text: `${partnerName} ещё не отметил(а) пульс этой недели — напомните мягко.` })
  } else if (myCur != null && ptCur != null) {
    const diff = Math.abs(myCur - ptCur)
    insights.push(
      diff >= 2
        ? { emoji: '🧭', text: `Восприятие близости расходится на ${diff} балла (вы ${myCur}, партнёр ${ptCur}). Обсудите это.` }
        : { emoji: '💞', text: `На этой неделе вы сходитесь в ощущении близости (${myCur} и ${ptCur}).` }
    )
  }
  if (insights.length === 0) {
    insights.push({ emoji: '💜', text: 'Заполните пульс недели — здесь появятся график и инсайты.' })
  }

  return (
    <DashboardLayout>
      <div className="h1">{name ? `${name}, ваш день` : 'Ваш день'}.</div>
      <div className="dim">Эмоции, сигналы, тепло, пульс и ритуалы — для двоих каждый день.</div>

      {/* Навигация по секциям */}
      <div className="chip-row" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 8 }}>
        {SECTIONS.map(sec => (
          <a key={sec.key} href={`#${sec.key}`} className="chip">{sec.emoji} {sec.label}</a>
        ))}
      </div>

      {/* 1 · Настроение — статус-карточка */}
      <div id="mood" style={{ scrollMarginTop: 80 }}>
        <div className="k">Настроение</div>
        <div className="cd static">
          <div className="cd-r">
            <div className="cd-ic" style={{ fontSize: 24 }}>{myMood?.emoji ?? '🙂'}</div>
            <div className="cd-t">
              <b>Моё сегодня: {myMood?.emoji ?? 'ещё не отмечено'}</b>
              <span>{myMood?.text ? myMood.text : 'Один тап — и партнёр увидит'}</span>
            </div>
            <button className="btn btn-s btn-sm" onClick={() => window.dispatchEvent(new CustomEvent('together:open', { detail: { type: 'mood' } }))}>
              изменить
            </button>
          </div>
        </div>
      </div>

      {/* 2 · Партнёр сейчас + напомнить */}
      <div id="partner-now" style={{ scrollMarginTop: 80 }}>
        <div className="k">{partnerName} сейчас</div>
        <div className="cd static">
          {partner?.mood ? (
            <div className="cd-r">
              <div className="partner-emoji">{partner.mood.emoji}</div>
              <div className="cd-t">
                <b>{partner.name} сейчас</b>
                <span>{partner.mood.text ?? 'Отметил(а) настроение'}</span>
              </div>
              <Link href="/dashboard/ai" className="btn btn-s btn-sm">💬 Поддержать</Link>
            </div>
          ) : (
            <div className="cd-r">
              <div className="partner-emoji" style={{ opacity: .5 }}>💤</div>
              <div className="cd-t">
                <b>{partnerName} ещё не отметил(а)</b>
                <span>Когда отметит — увидите здесь</span>
              </div>
              <button className="btn btn-s btn-sm" onClick={remind}>🔔 Напомнить</button>
            </div>
          )}
        </div>
      </div>

      {/* 4 · Банк тепла */}
      <div id="warmth" style={{ scrollMarginTop: 80 }}>
        <div className="k">Банк тепла</div>
        <div className="cd static">
          <div className="dim" style={{ fontSize: 12, marginBottom: 12 }}>Скажите партнёру спасибо или что-то тёплое — это копится и согревает в трудный день.</div>
          <div className="warmth-form" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="input" style={{ flex: 1 }} placeholder="Спасибо за…" value={warmthText}
              onChange={e => setWarmthText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addWarmth()} />
            <button className="btn btn-secondary" disabled={warmthText.trim().length < 2} onClick={addWarmth}>💌</button>
          </div>
          {warmth.length > 0 && (
            <div className="warmth-list">
              {warmth.map(w => (
                <div key={w.id} className="warmth-item">
                  <span className="warmth-ic">💌</span>
                  <div>
                    <b>{w.text}</b>
                    <span className="small">{w.fromName} · {new Date(w.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5 · Пульс — вход + график + инсайты */}
      <div id="pulse" style={{ scrollMarginTop: 80 }}>
        <div className="k">Пульс недели</div>
        <div className="cd static">
          <div className="range-stack">
            <label>
              <span>Близость</span>
              <div className="range-line">
                <span style={{ fontSize: 12, color: 'var(--mute)' }}>далеко</span>
                <input type="range" min={1} max={10} value={closeness} onChange={e => setCloseness(Number(e.target.value))} />
                <span style={{ fontSize: 12, color: 'var(--mute)' }}>очень близко</span>
              </div>
              <b className="range-val">{closeness}</b>
            </label>
            <label>
              <span>Конструктивность конфликтов</span>
              <div className="range-line">
                <span style={{ fontSize: 12, color: 'var(--mute)' }}>деструктивно</span>
                <input type="range" min={1} max={10} value={conflictResolution} onChange={e => setConflictResolution(Number(e.target.value))} />
                <span style={{ fontSize: 12, color: 'var(--mute)' }}>конструктивно</span>
              </div>
              <b className="range-val">{conflictResolution}</b>
            </label>
            <label>
              <span>Чего не хватило? (опционально)</span>
              <input className="input" value={missing} onChange={e => setMissing(e.target.value)} placeholder="Например: больше времени вдвоём…" />
            </label>
          </div>
          <button className="btn btn-secondary btn-w" style={{ marginTop: 16 }} onClick={submitPulse} disabled={pulseSubmitting}>
            {pulseSubmitting ? 'Сохраняем…' : 'Сохранить пульс'}
          </button>
          {userCurrent && (
            <div className="small" style={{ marginTop: 10, textAlign: 'center', color: 'var(--ok)' }}>
              ✓ Уже заполнено на этой неделе: близость {userCurrent.closeness}/10 · конфликты {userCurrent.conflictResolution}/10
            </div>
          )}

          <div className="k" style={{ marginTop: 20 }}>Динамика близости</div>
          {chartWeeks.length >= 2 ? (
            <>
              <svg viewBox="0 0 300 112" style={{ width: '100%', height: 'auto' }} role="img" aria-label="График близости по неделям">
                {[1, 4, 7, 10].map(v => {
                  const y = 100 - ((v - 1) / 9) * 88
                  return (
                    <g key={v}>
                      <line x1={10} y1={y} x2={290} y2={y} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 4" />
                      <text x={4} y={y + 3} fontSize={8} fill="var(--mute)">{v}</text>
                    </g>
                  )
                })}
                {myLine && <polyline points={myLine} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
                {ptLine && <polyline points={ptLine} fill="none" stroke="var(--pink)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
              </svg>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12 }}>
                <span style={{ color: 'var(--mute)' }}><i style={{ display: 'inline-block', width: 10, height: 3, background: 'var(--accent)', borderRadius: 2, marginRight: 6 }} />Вы</span>
                <span style={{ color: 'var(--mute)' }}><i style={{ display: 'inline-block', width: 10, height: 3, background: 'var(--pink)', borderRadius: 2, marginRight: 6 }} />Партнёр</span>
              </div>
            </>
          ) : (
            <div className="dim" style={{ fontSize: 13, marginTop: 8 }}>После пары недель здесь появится график близости.</div>
          )}

          {insights.length > 0 && (
            <div className="pulse-insights" style={{ marginTop: 16, display: 'grid', gap: 8 }}>
              {insights.map((ins, i) => (
                <div key={i} className="notice" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span>{ins.emoji}</span>
                  <div style={{ fontSize: 13 }}>{ins.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 6 · Челленджи + ритуалы */}
      <div id="challenges" style={{ scrollMarginTop: 80 }}>
        <div className="k">Челленджи и ритуалы</div>
        {activeChallenges.map(challenge => (
          <div key={challenge.id} className="cd static mt">
            <div className="cd-r">
              <div className="cd-ic">🌙</div>
              <div className="cd-t">
                <b>{challenge.title}</b>
                <span>{challenge.description}</span>
              </div>
            </div>
            <div className="small" style={{ marginTop: 8 }}>Ось: {challenge.axis} · сложность {challenge.difficulty}/3 · {challenge.durationMin} мин</div>
            <div className="small" style={{ marginTop: 4 }}>Задание: {challenge.instruction}</div>
            {challenge.examplePhrase && (
              <div className="notice notice-amber" style={{ marginTop: 12 }}>
                <span>💬</span>
                <div><strong>Пример фразы:</strong> «{challenge.examplePhrase}»</div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
              <button
                className={cn('btn', challenge.completedByCurrent ? 'btn-ok' : 'btn-secondary')}
                disabled={challenge.completedByCurrent || completing === challenge.id}
                onClick={() => !challenge.completedByCurrent && completeChallenge(challenge.id)}
              >
                {challenge.completedByCurrent ? '✓ Я сделал(а)' : completing === challenge.id ? '…' : 'Я сделал(а)'}
              </button>
              <span className="small" style={{ color: 'var(--mute)' }}>
                {challenge.completedByCurrent ? 'Вы — сделали' : 'Вы — ещё нет'} · {challenge.completedByPartner ? `${partnerName} — сделал(а)` : `${partnerName} — ещё нет`}
              </span>
            </div>
          </div>
        ))}
        {activeChallenges.length === 0 && (
          <div className="dim" style={{ fontSize: 13, padding: '8px 0' }}>
            {challenges.length === 0 ? 'Челленджи появятся после заполнения пульса.' : 'На этой неделе челленджей нет.'}
          </div>
        )}

        <div className="cd static mt">
          <div className="k" style={{ marginTop: 0 }}>Ритуалы · выполнено {rituals.filter(r => r.mine).length}</div>
          <div className="dim" style={{ fontSize: 12, marginBottom: 12 }}>Маленькие повторяющиеся традиции пары.</div>
          {!ritualOpen && (
            <button className="btn btn-s btn-w" style={{ width: '100%', marginBottom: 12 }} onClick={() => setRitualOpen(true)}>
              + Добавить ритуал
            </button>
          )}
          {ritualOpen && (
            <div style={{ marginBottom: 12 }}>
              <div className="rit-ideas" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {RITUAL_IDEAS.map(idea => (
                  <button key={idea.t} className="chip" onClick={() => addRitual(idea.t)}>{idea.e} {idea.t}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" style={{ flex: 1 }} placeholder="Свой ритуал…" value={ritualInput}
                  onChange={e => setRitualInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addRitual()} />
                <button className="btn btn-secondary" disabled={ritualInput.trim().length < 2} onClick={() => addRitual()}>OK</button>
              </div>
            </div>
          )}
          {rituals.length === 0 ? (
            <div className="dim" style={{ fontSize: 13 }}>Ритуалов пока нет. Добавьте первый — например, «Утренний кофе молча».</div>
          ) : (
            <div className="feed">
              {rituals.map(r => (
                <div key={r.id} className="cd-r" style={{ padding: '8px 0' }}>
                  <div className="cd-ic">{r.emoji}</div>
                  <div className="cd-t">
                    <b>{r.title}</b>
                    <span>{r.mine ? 'Вы ✓' : 'Вы —'} · {r.partner ? 'Партнёр ✓' : 'Партнёр —'}</span>
                  </div>
                  <button className={r.mine ? 'btn btn-ok btn-sm' : 'btn btn-s btn-sm'} onClick={() => toggleRitual(r.id)}>
                    {r.mine ? '✓' : 'Отметить'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 7 · Партнёр */}
      <div id="partner" style={{ scrollMarginTop: 80 }}>
        <div className="k">Партнёр</div>
        <div className="cd static">
          <div className="tabs" role="tablist">
            {[['mood', 'Настроение'], ['cravings', 'Хотелки'], ['wishlist', 'Виш-лист'], ['flowers', 'Цветы']].map(([key, label]) => (
              <button key={key} className={cn('tab', partnerTab === key && 'on')} onClick={() => setPartnerTab(key)}>{label}</button>
            ))}
          </div>

          {partnerTab === 'mood' && (
            <div className="partner-mood" style={{ padding: '8px 0' }}>
              {partnerMood ? (
                <div className="cd-r">
                  <div className="partner-emoji">{partnerMood.emoji}</div>
                  <div className="cd-t">
                    <b>Настроение партнёра</b>
                    <span>{partnerMood.text ?? 'Отметил(а) настроение'}</span>
                  </div>
                </div>
              ) : (
                <div className="dim" style={{ fontSize: 13, padding: '4px 0' }}>Партнёр ещё не отметил(а) настроение сегодня.</div>
              )}
            </div>
          )}

          {partnerTab === 'cravings' && (
            <div style={{ padding: '4px 0' }}>
              <div className="craving-form" style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input className="input" style={{ flex: 1 }} placeholder="Хочется…" value={cravingInput}
                  onChange={e => setCravingInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCraving()} />
                <button className="btn btn-secondary" disabled={!cravingInput.trim()} onClick={addCraving}>Добавить</button>
              </div>
              {cravings.length > 0 && (
                <div className="feed">
                  {cravings.map(c => (
                    <div key={c.id} className="feed-item">
                      <b>{c.item}</b>
                      <span>{c.status === 'PICKED_UP' ? '✓ забрали' : 'ждёт'}</span>
                    </div>
                  ))}
                </div>
              )}
              {partnerCravings.length > 0 && (
                <>
                  <div className="small" style={{ margin: '10px 0 4px', color: 'var(--mute)' }}>Хотелки партнёра:</div>
                  <div className="feed">
                    {partnerCravings.map(c => (
                      <div key={c.id} className="feed-item">
                        <b>{c.item}</b>
                        <span>{c.status === 'PICKED_UP' ? '✓ подарено' : 'ждёт'}</span>
                        {c.status !== 'PICKED_UP' && (
                          <button className="btn btn-s btn-sm" onClick={() => pickCraving(c.id)}>Отметить подаренным</button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {partnerTab === 'wishlist' && (
            <div style={{ padding: '4px 0' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <input className="input" style={{ flex: 1 }} placeholder="Что хочешь?" value={wishTitle}
                  onChange={e => setWishTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addWish()} />
                <button className="btn btn-secondary" disabled={!wishTitle.trim()} onClick={addWish}>Добавить</button>
              </div>
              <input className="input" style={{ width: '100%', marginBottom: 10 }} placeholder="Ссылка на подарок (необязательно)" value={wishLink}
                onChange={e => setWishLink(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addWish()} />
              {wishes.length > 0 && (
                <div className="feed">
                  {wishes.map(w => (
                    <div key={w.id} className="feed-item">
                      <b>{w.title}</b>
                      <span>{w.status === 'BOUGHT' ? '✓ куплено' : 'в списке'}</span>
                      {w.link && <a href={w.link} target="_blank" rel="noopener noreferrer" className="wish-link">🔗 ссылка</a>}
                    </div>
                  ))}
                </div>
              )}
              {partnerWishes.length > 0 && (
                <>
                  <div className="small" style={{ margin: '10px 0 4px', color: 'var(--mute)' }}>Виш-лист партнёра:</div>
                  <div className="feed">
                    {partnerWishes.map(w => (
                      <div key={w.id} className="feed-item">
                        <b>{w.title}</b>
                        <span>{w.status === 'BOUGHT' ? '✓ подарено' : 'в списке'}</span>
                        {w.link && <a href={w.link} target="_blank" rel="noopener noreferrer" className="wish-link">🔗 ссылка</a>}
                        {w.status !== 'BOUGHT' && (
                          <button className="btn btn-s btn-sm" onClick={() => markGifted(w.id)}>Отметить подаренным</button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {partnerTab === 'flowers' && (
            <div style={{ padding: '4px 0' }}>
              {flowers.length === 0 && <div className="dim" style={{ fontSize: 13, padding: '4px 0' }}>Загружаем цветы…</div>}
              <div className="flower-grid">
                {flowers.map(f => (
                  <div key={f.slug} className={`flower-card ${f.favorite ? 'fav' : ''}`}>
                    <div className="flower-top">
                      <i>{f.emoji}</i>
                      <button
                        className="heart"
                        aria-label={f.favorite ? 'Убрать из любимых' : 'В любимые'}
                        onClick={async () => {
                          await fetch('/api/flowers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: f.slug }) })
                          setFlowers(prev => prev.map(x => x.slug === f.slug ? { ...x, favorite: !x.favorite } : x))
                          toast(f.favorite ? 'Убрано из любимых' : 'Добавлено в любимые')
                        }}
                      >{f.favorite ? '❤️' : '🤍'}</button>
                    </div>
                    <b>{f.name}</b>
                    <span className="dim" style={{ fontSize: 11 }}>{f.meaning}</span>
                    <button
                      className="btn btn-s btn-sm"
                      style={{ marginTop: 8 }}
                      disabled={flowerBusy}
                      onClick={async () => {
                        setFlowerBusy(true)
                        try {
                          const r = await fetch('/api/flowers/gift', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: f.slug }) })
                          if (r.ok) toast(`Цветок «${f.name}» подарен 💐`)
                          window.dispatchEvent(new Event('together:refresh'))
                        } finally { setFlowerBusy(false) }
                      }}
                    >💐 Подарить</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}