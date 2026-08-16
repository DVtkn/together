'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { SkeletonCard } from '@/components/skeleton-card'

interface PulseData {
  checkins: Array<{
    year: number
    weekNumber: number
    user: { closeness: number; conflictResolution: number; missing: string | null } | null
    partner: { closeness: number; conflictResolution: number; missing: string | null } | null
  }>
}

function weekLabel(year: number, weekNumber: number): string {
  return `Нед. ${weekNumber}, ${year}`
}

export default function PulsePage() {
  const [data, setData] = useState<PulseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [closeness, setCloseness] = useState(5)
  const [conflictResolution, setConflictResolution] = useState(5)
  const [missing, setMissing] = useState('')

  useEffect(() => {
    fetch('/api/pulse')
      .then((res) => res.json())
      .then((json: PulseData) => {
        setData(json)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await fetch('/api/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closeness, conflictResolution, missing: missing || undefined }),
      })
      const res = await fetch('/api/pulse')
      const json = await res.json()
      setData(json)
      setMissing('')
    } catch (e) {
      console.error('Submit failed:', e)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout user={{ name: null, email: '' }} couple={null}>
        <div className="h1">Пульс</div>
        <SkeletonCard count={2} />
      </DashboardLayout>
    )
  }

  const weeks = data?.checkins ?? []
  const userCurrent = weeks.length ? weeks[weeks.length - 1]?.user ?? null : null

  const userCloseness = weeks.map((w) => w.user?.closeness).filter((v): v is number => v !== null && v !== undefined)
  const userConflict = weeks.map((w) => w.user?.conflictResolution).filter((v): v is number => v !== null && v !== undefined)
  const avgCloseness = userCloseness.length ? userCloseness.reduce((a, b) => a + b, 0) / userCloseness.length : 0
  const avgConflict = userConflict.length ? userConflict.reduce((a, b) => a + b, 0) / userConflict.length : 0
  const filledWeeks = weeks.filter((w) => w.user).length

  const weekNum = (w: PulseData['checkins'][number]) => weekLabel(w.year, w.weekNumber)

  return (
    <DashboardLayout user={{ name: null, email: '' }} couple={null}>
      <div className="h1">Пульс</div>
      <div className="dim">Раз в неделю три коротких вопроса — и видно, куда движется ваша пара.</div>

      <div className="k">На этой неделе</div>
      <div className="cd static">
        <div className="range-stack">
          <label>
            <span>Близость</span>
            <div className="range-line">
              <span style={{ fontSize: 12, color: 'var(--mute)' }}>далеко</span>
              <input type="range" min={1} max={10} value={closeness} onChange={(e) => setCloseness(Number(e.target.value))} />
              <span style={{ fontSize: 12, color: 'var(--mute)' }}>очень близко</span>
            </div>
            <b style={{ background: 'var(--grad)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontSize: 28 }}>{closeness}</b>
          </label>
          <label>
            <span>Конструктивность конфликтов</span>
            <div className="range-line">
              <span style={{ fontSize: 12, color: 'var(--mute)' }}>деструктивно</span>
              <input type="range" min={1} max={10} value={conflictResolution} onChange={(e) => setConflictResolution(Number(e.target.value))} />
              <span style={{ fontSize: 12, color: 'var(--mute)' }}>конструктивно</span>
            </div>
            <b style={{ background: 'var(--grad)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontSize: 28 }}>{conflictResolution}</b>
          </label>
          <label>
            <span>Чего не хватило? (опционально)</span>
            <input className="input" value={missing} onChange={(e) => setMissing(e.target.value)} placeholder="Например: больше времени вдвоём…" />
          </label>
        </div>
        <button className="btn btn-p btn-w" style={{ marginTop: 16 }} onClick={handleSubmit} disabled={submitting}>
          'Сохранить'
        </button>
        {userCurrent && (
          <div className="small" style={{ marginTop: 10, textAlign: 'center', color: 'var(--ok)' }}>
            ✓ Уже заполнено: близость {userCurrent.closeness}/10 · конфликты {userCurrent.conflictResolution}/10
          </div>
        )}
      </div>

      <div className="stats" style={{ marginTop: 24 }}>
        <div className="st">
          <b>{avgCloseness ? avgCloseness.toFixed(1) : '—'}</b>
          <span>средняя близость</span>
        </div>
        <div className="st">
          <b>{avgConflict ? avgConflict.toFixed(1) : '—'}</b>
          <span>средняя конструктивность</span>
        </div>
        <div className="st">
          <b>{filledWeeks}</b>
          <span>недель заполнено</span>
        </div>
      </div>

      {weeks.length > 0 && (
        <>
          <div className="k">Динамика · близость</div>
          <div className="cd static">
            <MiniChart
              weeks={weeks}
              color="var(--acc)"
              get={(w) => w.user?.closeness ?? null}
              getP={(w) => w.partner?.closeness ?? null}
              max={10}
            />
          </div>

          <div className="k">Динамика · конструктивность</div>
          <div className="cd static">
            <MiniChart
              weeks={weeks}
              color="var(--pri)"
              get={(w) => w.user?.conflictResolution ?? null}
              getP={(w) => w.partner?.conflictResolution ?? null}
              max={10}
            />
          </div>

          <div className="k">История</div>
          <div className="feed">
            {weeks
              .slice()
              .reverse()
              .map((week) => (
                <div key={`${week.year}-${week.weekNumber}`} className="feed-item">
                  <b>{weekNum(week)}</b>
                  <span>
                    {week.user ? (
                      <>
                        🫀 близость <strong>{week.user.closeness}/10</strong> · конфликты <strong>{week.user.conflictResolution}/10</strong>
                        {week.partner && (
                          <div className="small">партнёр: {week.partner.closeness}/10 · {week.partner.conflictResolution}/10</div>
                        )}
                      </>
                    ) : (
                      '— вы не заполнили'
                    )}
                  </span>
                </div>
              ))}
          </div>
        </>
      )}

      {weeks.length === 0 && (
        <div className="notice notice-amber" style={{ marginTop: 24 }}>
          <span style={{ fontSize: 20 }} aria-hidden="true">💡</span>
          <div>Заполните пульс впервые — и здесь появится история и челленджи недели.</div>
        </div>
      )}
    </DashboardLayout>
  )
}

function MiniChart({
  weeks,
  color,
  get,
  getP,
  max,
}: {
  weeks: PulseData['checkins']
  color: string
  get: (w: PulseData['checkins'][number]) => number | null
  getP: (w: PulseData['checkins'][number]) => number | null
  max: number
}) {
  const data = weeks.slice(-12)
  const width = 340
  const height = 140
  const padX = 24
  const padY = 20
  const n = Math.max(data.length, 2)
  const x = (i: number) => padX + (i * (width - padX * 2)) / (n - 1)
  const y = (v: number) => padY + (height - padY * 2) * (1 - v / max)

  const line = (getter: (w: PulseData['checkins'][number]) => number | null) => {
    const pts = data.map((w, i) => ({ v: getter(w), i })).filter((p) => p.v !== null) as Array<{ v: number; i: number }>
    return pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${x(p.i).toFixed(1)},${y(p.v as number).toFixed(1)}`).join(' ')
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="auto" style={{ display: 'block' }} role="img">
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={padX} x2={width - padX} y1={padY + (height - padY * 2) * f} y2={padY + (height - padY * 2) * f} stroke="rgba(255,255,255,.06)" strokeWidth={1} />
      ))}
      <path d={line(getP)} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth={1.5} strokeDasharray="4 4" />
      <path d={line(get)} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((w, i) => {
        const v = get(w)
        if (v === null) return null
        return <circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill={color} stroke="#0B0F19" strokeWidth={1.5} />
      })}
      {data.map((w, i) => (
        <text key={i} x={x(i)} y={height - 6} textAnchor="middle" fill="#64748B" fontSize={10}>
          {w.weekNumber}
        </text>
      ))}
    </svg>
  )
}
