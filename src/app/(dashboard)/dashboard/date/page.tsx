'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { cn } from '@/lib/utils/cn'

const VIBES: Array<{ id: string; emoji: string; label: string; hint: string; type: string | null }> = [
  { id: 'romantic', emoji: '🌹', label: 'Романтик', hint: 'свечи, вино, разговоры', type: 'RESTAURANT' },
  { id: 'cozy', emoji: '🕯️', label: 'Уют', hint: 'тихое кафе, мягкий свет', type: 'CAFE' },
  { id: 'adventure', emoji: '🚀', label: 'Приключение', hint: 'новое, необычное, адреналин', type: 'PARK' },
  { id: 'art', emoji: '🖼️', label: 'Культура', hint: 'музеи, кино, театр', type: 'MUSEUM' },
  { id: 'party', emoji: '🎉', label: 'Тусовка', hint: 'живая музыка, коктейли', type: 'BAR' },
  { id: 'nature', emoji: '🌿', label: 'Природа', hint: 'парк, прогулка, воздух', type: 'WALK' },
  { id: 'food', emoji: '🍜', label: 'Гастро', hint: 'азия, паста, десерты', type: 'CAFE' },
  { id: 'chill', emoji: '🛋️', label: 'Ничего не делать', hint: 'спа, фильм, кокон', type: 'SPA' },
]

const TIME_SLOTS = ['16:00', '17:00', '18:00', '19:00', '19:30', '20:00', '20:30', '21:00']

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

interface City { id: string; slug: string; name: string; emoji: string }
interface Venue {
  id: string
  type: string
  name: string
  description: string | null
  emoji: string
  area: string | null
  priceLevel: number
  romantic: boolean
  recommendation: string | null
}

export default function DatePage() {
  const [step, setStep] = useState(1)
  const [vibeId, setVibeId] = useState<string | null>(null)
  const [venueId, setVenueId] = useState<string | null>(null)
  const [day, setDay] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)

  const [myCity, setMyCity] = useState<City | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [venuesLoading, setVenuesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const days = useMemo(() => {
    const out: Array<{ key: string; dw: string; dn: string; today: boolean }> = []
    const start = new Date()
    start.setDate(start.getDate() + 1)
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      out.push({
        key: d.toISOString().slice(0, 10),
        dw: DAY_NAMES[(d.getDay() + 6) % 7],
        dn: String(d.getDate()).padStart(2, '0'),
        today: false,
      })
    }
    return out
  }, [])

  useEffect(() => {
    fetch('/api/user/profile')
      .then((r) => r.json())
      .then((p) => setMyCity(p.user?.city || null))
      .catch(() => {})
  }, [])

  const selectedVibe = VIBES.find((v) => v.id === vibeId) || null

  useEffect(() => {
    if (!selectedVibe || !myCity) return
    let cancelled = false
    const params = new URLSearchParams({ cityId: myCity.id })
    if (selectedVibe.type) params.set('type', selectedVibe.type)
    fetch(`/api/venues?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setVenues(d.venues || [])
      })
      .catch(() => {
        if (!cancelled) setVenues([])
      })
      .finally(() => {
        if (!cancelled) setVenuesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedVibe, myCity])

  const selectedVenue = venues.find((v) => v.id === venueId) || null

  const canGoNext =
    (step === 1 && !!vibeId) ||
    (step === 2 && !!venueId) ||
    (step === 3 && !!day && !!time)

  const handleNext = () => {
    if (!canGoNext) return
    setStep((s) => Math.min(4, s + 1))
  }

  const handleSend = () => {
    setSending(true)
    setTimeout(() => {
      setSending(false)
      setSent(true)
    }, 700)
  }

  if (sent) {
    return (
      <DashboardLayout user={{ name: null, email: '' }} couple={null}>
        <div className="empty" style={{ paddingTop: 80 }}>
          <i>🎉</i>
          <div className="h2" style={{ marginBottom: 6 }}>Готово!</div>
          <div className="dim" style={{ marginBottom: 20 }}>
            Приглашение отправлено партнёру.
          </div>
          <button className="btn btn-p" onClick={() => window.location.reload()}>Запланировать ещё</button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={{ name: null, email: '' }} couple={null}>
      <div className="h1">Свидание</div>
      <div className="dim">Ты зовёшь. Она выбирает. Ты бронируешь.</div>

      <div className="wiz-dots">
        {[1, 2, 3, 4].map((s) => (
          <i key={s} className={cn('wd', s < step && 'done', s === step && 'on')} />
        ))}
      </div>

      {step === 1 && (
        <>
          <div className="k">Какой вайб?</div>
          <div className="vibe-grid">
            {VIBES.map((v) => (
              <button
                key={v.id}
                className={cn('vibe', vibeId === v.id && 'sel')}
                onClick={() => {
                  setVibeId(v.id)
                  setVenuesLoading(true)
                }}
                aria-pressed={vibeId === v.id}
              >
                <i>{v.emoji}</i>
                <b>{v.label}</b>
                <span>{v.hint}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="k">Место</div>
          {!myCity ? (
            <div className="notice notice-amber">
              <span style={{ fontSize: 18 }} aria-hidden="true">📍</span>
              <div>Укажите город в настройках, чтобы показать места.</div>
            </div>
          ) : venuesLoading ? (
            <div className="loading-screen">
              <div className="loading-text">Ищем места…</div>
            </div>
          ) : venues.length === 0 ? (
            <div className="empty">
              <i>🔍</i>
              <div className="dim">Под этот вайб в вашем городе пока пусто. Выберите другой.</div>
            </div>
          ) : (
            <>
              <div className="ven-grid">
                {venues.map((v) => (
                  <button
                    key={v.id}
                    className={cn('cd static', venueId === v.id && 'sel')}
                    style={{ textAlign: 'left', width: '100%', borderColor: venueId === v.id ? 'var(--pri)' : 'transparent' }}
                    onClick={() => setVenueId(v.id)}
                  >
                    <div className="cd-r">
                      <div className="cd-ic" style={{ fontSize: 26 }}>{v.emoji}</div>
                      <div className="cd-t">
                        <b>{v.name}</b>
                        <span>
                          {v.area || v.description || 'Подробности уточняйте на месте'}
                          {v.priceLevel ? ` · ${'💵'.repeat(v.priceLevel)}` : ''}
                        </span>
                        {v.romantic && <span className="badge pri" style={{ marginTop: 4 }}>💗 романтично</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {step === 3 && (
        <>
          <div className="k">Когда</div>
          <div className="day-strip">
            {days.map((d) => (
              <button
                key={d.key}
                className={cn('day-card', day === d.key && 'sel')}
                onClick={() => setDay(d.key)}
                aria-pressed={day === d.key}
              >
                <div className="dw">{d.dw}</div>
                <div className="dn">{d.dn}</div>
              </button>
            ))}
          </div>

          <div className="time-group">
            <div className="tg-label">Вечер</div>
            <div className="tg-slots">
              {TIME_SLOTS.map((t) => (
                <button
                  key={t}
                  className={cn('slot', time === t && 'sel')}
                  onClick={() => setTime(t)}
                  aria-pressed={time === t}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <div className="k">Сводка</div>
          <div className="sum">
            <div className="sum-r"><span>Вайб</span><b>{selectedVibe?.emoji} {selectedVibe?.label}</b></div>
            {selectedVenue && (
              <div className="sum-r">
                <span>Место</span>
                <b>{selectedVenue.emoji} {selectedVenue.name}</b>
              </div>
            )}
            <div className="sum-r"><span>Когда</span><b>{day} · {time}</b></div>
            {selectedVenue?.area && <div className="sum-r"><span>Район</span><b>{selectedVenue.area}</b></div>}
          </div>
          <button className="btn btn-p btn-w mt" onClick={handleSend} disabled={sending}>
            {sending ? 'Отправляем…' : 'Зову на свидание'}
          </button>
        </>
      )}

      {step < 4 && (
        <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
          <button className="btn btn-s" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
            ← Назад
          </button>
          <button className="btn btn-p" style={{ flex: 1 }} onClick={handleNext} disabled={!canGoNext}>
            Далее →
          </button>
        </div>
      )}
    </DashboardLayout>
  )
}
