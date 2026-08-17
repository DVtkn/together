'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

type Venue = { n: string; a: string; p: number; e: string; tag?: string }

type Invite = {
  id: string
  vibe: string | null
  vibeEmoji: string | null
  venueId: string | null
  venueName: string | null
  venueArea: string | null
  venueEmoji: string | null
  date: string | null
  time: string | null
  status: 'PENDING' | 'PROPOSED' | 'CONFIRMED' | 'DECLINED'
  createdBy: string
  createdAt: string
}

const VIBES = [
  { id: 'romantic', e: '🌹', t: 'Романтик', d: 'свечи, вино, разговоры' },
  { id: 'cozy', e: '🕯️', t: 'Уют', d: 'тихое кафе, мягкий свет' },
  { id: 'adventure', e: '🚀', t: 'Приключение', d: 'новое, необычно, адреналин' },
  { id: 'culture', e: '🖼️', t: 'Культура', d: 'музеи, кино, театр' },
  { id: 'party', e: '🎉', t: 'Тусовка', d: 'живая музыка, коктейли' },
  { id: 'nature', e: '🌿', t: 'Природа', d: 'парк, прогулка, воздух' },
  { id: 'gastro', e: '🍜', t: 'Гастро', d: 'азия, паста, десерты' },
  { id: 'nothing', e: '🛋️', t: 'Ничего не делать', d: 'спа, фильм, кокон' },
]

const VENUES: Record<string, Venue[]> = {
  romantic: [{ n: 'Birch', a: 'Крестовский', p: 3, e: '🍽️' }, { n: 'Винный шкаф', a: 'Пестеля', p: 2, e: '🍷' }, { n: 'Стрелка В.О.', a: 'закат', p: 1, e: '🌅', tag: 'свой плед' }],
  cozy: [{ n: 'Civil', a: 'Петроградка', p: 2, e: '☕' }, { n: 'Булочная Вольчека', a: 'Литейный', p: 1, e: '🍰' }],
  adventure: [{ n: 'Квест-комната', a: 'Невский', p: 2, e: '🧩' }, { n: 'Экскурсия по крышам', a: 'Центр', p: 2, e: '🏙️' }],
  culture: [{ n: 'Эрарта', a: 'Васильевский', p: 2, e: '🎨' }, { n: 'Кино «Аврора»', a: 'Невский', p: 2, e: '🎬' }],
  party: [{ n: 'El Copitas', a: 'Невский', p: 3, e: '🍸' }, { n: 'Jagger', a: 'Рубинштейна', p: 2, e: '🎸' }],
  nature: [{ n: 'Новая Голландия', a: 'Адмиралтейская', p: 1, e: '🌳' }, { n: 'Елагин остров', a: 'Крестовский', p: 1, e: '🦢' }],
  gastro: [{ n: 'Хинкальная', a: 'Владимирский', p: 2, e: '🥟' }, { n: 'Ryuma', a: 'Центр', p: 2, e: '🍜' }, { n: 'Пышечная', a: 'Б. Конюшенная', p: 1, e: '🥐', tag: 'легенда' }],
  nothing: [{ n: 'Доставка + фильм', a: 'у вас дома', p: 2, e: '🎬' }, { n: 'Спа для двоих', a: 'Центр', p: 3, e: '💆' }],
}

const TIME_GROUPS = [
  { label: 'Утро', slots: ['10:00', '10:30', '11:00', '11:30'] },
  { label: 'День', slots: ['12:00', '13:00', '14:00', '15:00'] },
  { label: 'Вечер', slots: ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'] },
]
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MO = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

const fmtDate = (d: Date) => `${WD[d.getDay()]}, ${d.getDate()} ${MO[d.getMonth()]}`
const fmtISO = (iso: string | null) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return fmtDate(new Date(y, m - 1, d))
}
const isBusy = (d: Date, t: string) => (d.getDate() + parseInt(t) * 2 + Math.floor(parseInt(t.split(':')[1]) / 10)) % 5 === 0

export default function DatePage() {
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<{ id: string; name: string | null } | null>(null)
  const [partnerName, setPartnerName] = useState('партнёр')
  const [hasCouple, setHasCouple] = useState(false)
  const [invites, setInvites] = useState<Invite[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [wizOpen, setWizOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [vibe, setVibe] = useState<string | null>(null)
  const [custom, setCustom] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
  const [venue, setVenue] = useState<Venue | null>(null)
  const [day, setDay] = useState<Date | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [calOpen, setCalOpen] = useState(false)
  const [cal, setCal] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() } })
  const [visitedBusy, setVisitedBusy] = useState(false)
  const [visitedNote, setVisitedNote] = useState(false)

  const load = useCallback(() => {
    fetch('/api/user/profile').then(r => r.json()).then(d => {
      setMe({ id: d.user.id, name: d.user.name })
      setPartnerName(d.couple?.partnerName ?? 'партнёр')
      setHasCouple(Boolean(d.couple?.partnerName))
    }).catch(() => {})

    fetch('/api/date-invite').then(r => r.json()).then(d => {
      setInvites(d.invites ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const active = invites.find(i => i.status !== 'DECLINED') ?? null
  const isMine = active ? active.createdBy === me?.id : null

  const sendInvite = async () => {
    setBusy(true); setErr(null)
    try {
      const r = await fetch('/api/date-invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const j = await r.json()
      if (!r.ok) { setErr(j?.error ?? 'Не получилось отправить'); return }
      setInvites(prev => [j.invite, ...prev])
      window.dispatchEvent(new Event('together:refresh'))
    } catch { setErr('Сеть недоступна. Попробуйте позже.') }
    finally { setBusy(false) }
  }

  const patchInvite = async (id: string, payload: Record<string, unknown>) => {
    setBusy(true); setErr(null)
    try {
      const r = await fetch(`/api/date-invite/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await r.json()
      if (!r.ok) { setErr(j?.error ?? 'Не получилось обновить'); return }
      setInvites(prev => prev.map(i => i.id === id ? { ...i, ...j.invite } : i))
      window.dispatchEvent(new Event('together:refresh'))
    } catch { setErr('Сеть недоступна. Попробуйте позже.') }
    finally { setBusy(false) }
  }

  const cancelInvite = () => { if (active) patchInvite(active.id, { status: 'DECLINED' }) }
  const confirmInvite = () => { if (active) patchInvite(active.id, { status: 'CONFIRMED' }) }

  const markVisited = async () => {
    if (!active || visitedBusy) return
    setVisitedBusy(true)
    try {
      const r = await fetch(`/api/date/${active.id}/visited`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      if (r.ok) {
        setVisitedNote(true)
        window.dispatchEvent(new Event('together:refresh'))
        setInvites(prev => prev.map(i => i.id === active.id ? { ...i, status: 'CONFIRMED' } : i))
      }
    } catch { /* ignore */ } finally { setVisitedBusy(false) }
  }

  const pickVibe = (id: string) => { setVibe(id); setVenue(null); setTimeout(() => setStep(2), 150) }
  const pickRandom = () => pickVibe(VIBES[Math.floor(Math.random() * VIBES.length)].id)
  const applyCustom = () => { if (!custom.trim()) return; setVibe('custom'); setVenue(null); setStep(2) }
  const pickVenue = (v: Venue) => { setVenue(v); setTimeout(() => setStep(3), 150) }
  const pickDay = (d: Date) => { setDay(d); if (time && isBusy(d, time)) setTime(null) }

  const submitChoice = async () => {
    if (!active || !venue || !day || !time) return
    const vibeObj = VIBES.find(v => v.id === vibe)
    await patchInvite(active.id, {
      vibe: vibe === 'custom' ? 'custom' : (vibe ?? null),
      vibeEmoji: vibe === 'custom' ? '💡' : (vibeObj?.e ?? null),
      venueName: venue.n,
      venueArea: venue.a,
      venueEmoji: venue.e,
      date: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`,
      time,
      status: 'PROPOSED',
    })
    setWizOpen(false); setStep(1)
  }

  const venues = vibe === 'custom'
    ? [...VENUES.gastro, ...VENUES.cozy, ...VENUES.romantic]
    : VENUES[vibe ?? ''] ?? []

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() + i); return d })

  const first = new Date(cal.y, cal.m, 1)
  let lead = first.getDay(); if (lead === 0) lead = 7; lead--
  const daysIn = new Date(cal.y, cal.m + 1, 0).getDate()

  if (loading) return (
    <DashboardLayout>
      <div className="loading-screen"><div className="loading-icon">📍</div><div className="loading-text">Загружаем</div></div>
    </DashboardLayout>
  )

  if (!hasCouple) return (
    <DashboardLayout>
      <div className="h1">Свидание</div>
      <div className="dim">Ты зовёшь. Она выбирает. Ты бронируешь.</div>
      <div className="cd static pair-hero">
        <div className="pair-emoji">💞</div>
        <div className="h2" style={{ marginBottom: 6 }}>Сначала создайте пару</div>
        <span className="dim">Инвайты на свидание появятся, когда вы соединитесь с партнёром.</span>
        <Link className="btn btn-p btn-w mt" href="/dashboard/couple">Создать пару</Link>
      </div>
    </DashboardLayout>
  )

  const planCard = (inv: Invite, title: string, statusLine: string) => (
    <div className="cd" style={{ border: '1px solid rgba(16,185,129,.3)' }}>
      <span className="badge ok">{title}</span>
      <div className="h2" style={{ margin: '12px 0 4px' }}>{inv.vibeEmoji} {inv.venueName}</div>
      <div className="dim">{inv.venueArea}</div>
      <div className="sum" style={{ marginTop: 14 }}>
        <div className="sum-r"><span>Когда</span><b>{fmtISO(inv.date)} · {inv.time}</b></div>
        <div className="sum-r"><span>Адрес</span><b>{inv.vibe === 'nothing' ? 'У вас дома' : inv.venueArea}</b></div>
        <div className="sum-r"><span>Телефон</span><b>+7 812 000-00-00</b></div>
      </div>
      <div className="dim" style={{ marginTop: 12 }}>{statusLine}</div>
    </div>
  )

  return (
    <DashboardLayout>
      <div className="h1">Свидание</div>
      <div className="dim" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span>Ты зовёшь. Она выбирает. Ты бронируешь.</span>
        <Link href="/dashboard/couple#story" className="link-btn" style={{ whiteSpace: 'nowrap' }}>📖 История пары</Link>
      </div>

      {err && <div className="notice notice-amber" style={{ marginTop: 12 }}>{err}</div>}

      {/* ===== НЕТ АКТИВНОГО ИНВАЙТА ===== */}
      {!active && (
        <div className="cd" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💌</div>
          <div className="h2" style={{ marginBottom: 6 }}>Позови {partnerName}</div>
          <div className="dim" style={{ marginBottom: 18 }}>
            Она выберет вайб, место и время.<br />Тебе останется забронировать.
          </div>
          <button className="btn btn-p btn-w" disabled={busy} onClick={sendInvite}>
            {busy ? 'Отправляем…' : 'Отправить инвайт'}
          </button>
        </div>
      )}

      {/* ===== ИНВАЙТ ОТПРАВЛЕН (мой), ждём выбора ===== */}
      {active && isMine && active.status === 'PENDING' && (
        <div className="cd" style={{ textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
          <div className="h2" style={{ marginBottom: 4 }}>Ждём {partnerName}</div>
          <div className="dim">Инвайт отправлен. Она выбирает.</div>
          <button className="btn btn-s btn-w" style={{ marginTop: 16 }} disabled={busy} onClick={cancelInvite}>Отменить инвайт</button>
        </div>
      )}

      {/* ===== ВХОДЯЩИЙ ИНВАЙТ (от партнёра), ждёт выбора ===== */}
      {active && !isMine && active.status === 'PENDING' && !wizOpen && (
        <div className="cd static" style={{ border: '1px solid rgba(139,92,246,.35)' }}>
          <div className="cd-r">
            <div className="cd-ic">💌</div>
            <div className="cd-t">
              <b>{partnerName} зовёт тебя на свидание</b>
              <span>Выбери вайб, место и время.</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-p" style={{ flex: 1 }} disabled={busy} onClick={() => { setWizOpen(true); setStep(1) }}>Выбрать</button>
            <button className="btn btn-s" style={{ flex: 1 }} disabled={busy} onClick={cancelInvite}>Отклонить</button>
          </div>
        </div>
      )}

      {/* ===== ВЫБРАН (PROPOSED), я создатель — подтвердить ===== */}
      {active && isMine && active.status === 'PROPOSED' && (
        <>
          {planCard(active, `${partnerName} выбрала`, 'Подтверди или отклони, чтобы завершить.')}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-p" style={{ flex: 1 }} disabled={busy} onClick={confirmInvite}>Подтвердить</button>
            <button className="btn btn-s" style={{ flex: 1 }} disabled={busy} onClick={cancelInvite}>Отклонить</button>
          </div>
        </>
      )}

      {/* ===== ВЫБРАН (PROPOSED), я отвечающий — жду подтверждения ===== */}
      {active && !isMine && active.status === 'PROPOSED' && (
        planCard(active, 'Твой выбор отправлен', 'Ждём подтверждения.')
      )}

      {/* ===== ПОДТВЕРЖДЁН ===== */}
      {active && active.status === 'CONFIRMED' && (
        <>
          {planCard(active, 'Свидание подтверждено', 'Не забудь забронировать и позвонить.')}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <a className="btn btn-p" style={{ flex: 1 }} href="tel:+78120000000">📞 Позвонить</a>
            <button className="btn btn-s" style={{ flex: 1 }} disabled={visitedBusy} onClick={markVisited}>Сходили ✓</button>
          </div>
          {visitedNote && <div className="dim" style={{ marginTop: 10, fontSize: 13 }}>Отметили в истории пары 💜</div>}
        </>
      )}

      {/* ===== WIZARD ВЫБОРА (для партнёра) ===== */}
      {wizOpen && active && !isMine && active.status === 'PENDING' && (
        <>
          <button className="link-btn" style={{ marginBottom: 4 }} onClick={() => setWizOpen(false)}>← Назад</button>
          <div className="wiz-dots">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`wd ${step === i ? 'on' : ''} ${step > i ? 'done' : ''}`} />
            ))}
          </div>

          {step === 1 && (
            <>
              <div className="h2" style={{ textAlign: 'center' }}>Чего хочется?</div>
              <div className="vibe-grid">
                {VIBES.map(v => (
                  <button key={v.id} className={`vibe ${vibe === v.id ? 'sel' : ''}`} onClick={() => pickVibe(v.id)}>
                    <i>{v.e}</i><b>{v.t}</b><span>{v.d}</span>
                  </button>
                ))}
              </div>
              <div className="vibe-extra">
                <button className="vibe-btn" onClick={pickRandom}>✨ Удиви меня</button>
                <button className="vibe-btn" onClick={() => setCustomOpen(!customOpen)}>✏️ Своё</button>
              </div>
              {customOpen && (
                <div style={{ marginTop: 12 }}>
                  <textarea className="mood-note" placeholder="Например: шаурма на лавочке у Невы"
                    value={custom} onChange={e => setCustom(e.target.value)} />
                  <button className="btn btn-p btn-w" onClick={applyCustom}>Показать места</button>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="h2" style={{ textAlign: 'center' }}>
                {custom && vibe === 'custom' ? `Куда? «${custom}»` : 'Куда пойдём?'}
              </div>
              {venues.map(v => (
                <div key={v.n} className={`ven ${venue?.n === v.n ? 'sel' : ''}`} onClick={() => pickVenue(v)}>
                  <div className="ven-ic">{v.e}</div>
                  <div className="ven-t"><b>{v.n}</b>
                    <span>{v.a}{v.tag ? <span className="ven-tag">{v.tag}</span> : null}</span>
                  </div>
                  <span className="price">{'₽'.repeat(v.p)}</span>
                </div>
              ))}
            </>
          )}

          {step === 3 && (
            <>
              <div className="h2" style={{ textAlign: 'center' }}>Когда?</div>
              <div className={`sel-info ${day && time ? 'ready' : ''}`}>
                {day && time ? `✓ ${fmtDate(day)} · ${time}` : day ? `${fmtDate(day)} · выбери время` : 'Выбери дату и время'}
              </div>
              <div className="k">Дата</div>
              <div className="day-strip">
                {days.map((d, i) => (
                  <div key={i}
                    className={`day-card ${day?.getTime() === d.getTime() ? 'sel' : ''} ${i === 0 ? 'today' : ''}`}
                    onClick={() => pickDay(d)}>
                    <div className="dw">{i === 0 ? 'сег' : WD[d.getDay()]}</div>
                    <div className="dn">{d.getDate()}</div>
                  </div>
                ))}
              </div>
              <button className="link-btn" onClick={() => setCalOpen(!calOpen)}>📅 Выбрать в календаре</button>
              {calOpen && (
                <div className="cal-wrap" style={{ display: 'block' }}>
                  <div className="cal-head">
                    <button className="cal-nav" disabled={cal.y === today.getFullYear() && cal.m === today.getMonth()}
                      onClick={() => setCal(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 })}>‹</button>
                    <b>{MONTHS[cal.m]} {cal.y}</b>
                    <button className="cal-nav" onClick={() => setCal(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 })}>›</button>
                  </div>
                  <div className="cal-week">{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(x => <span key={x}>{x}</span>)}</div>
                  <div className="cal-grid">
                    {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} className="cal-empty" />)}
                    {Array.from({ length: daysIn }, (_, i) => {
                      const d = new Date(cal.y, cal.m, i + 1)
                      const past = d < today
                      return (
                        <div key={i}
                          className={`cal-day ${past ? 'past' : ''} ${d.getTime() === today.getTime() ? 'today' : ''} ${day?.getTime() === d.getTime() ? 'sel' : ''}`}
                          onClick={() => !past && pickDay(d)}>{i + 1}</div>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="k">Время</div>
              {TIME_GROUPS.map(g => (
                <div className="time-group" key={g.label}>
                  <div className="tg-label">{g.label}</div>
                  <div className="tg-slots">
                    {g.slots.map(t => (
                      <button key={t} className={`slot ${time === t ? 'sel' : ''}`}
                        disabled={day ? isBusy(day, t) : false}
                        onClick={() => setTime(t)}>{t}</button>
                    ))}
                  </div>
                </div>
              ))}
              {day && time && <button className="btn btn-p btn-w mt" onClick={() => setStep(4)}>Далее →</button>}
            </>
          )}

          {step === 4 && venue && (
            <>
              <div className="h2" style={{ textAlign: 'center' }}>Точно?</div>
              <div className="sum">
                <div className="sum-r"><span>Место</span><b>{venue.n} · {venue.a}</b></div>
                <div className="sum-r"><span>Когда</span><b>{day ? fmtDate(day) : ''} · {time}</b></div>
              </div>
              <button className="btn btn-p btn-w" style={{ marginTop: 14 }} disabled={busy} onClick={submitChoice}>
                {busy ? 'Отправляем…' : `Отправить ${partnerName === 'партнёр' ? '' : partnerName}`}
              </button>
            </>
          )}
        </>
      )}

      {/* ===== ИСТОРИЯ ===== */}
      {invites.some(i => i.status === 'DECLINED' || i.status === 'CONFIRMED') && (
        <>
          <div className="k" style={{ marginTop: 24 }}>История</div>
          {invites.filter(i => i.status === 'DECLINED' || i.status === 'CONFIRMED').slice(0, 3).map(inv => (
            <div className="cd static" key={inv.id}>
              <div className="cd-r">
                <div className="cd-ic">{inv.status === 'CONFIRMED' ? '✅' : '✖️'}</div>
                <div className="cd-t">
                  <b>{inv.venueName ?? 'Инвайт'}</b>
                  <span>{inv.status === 'CONFIRMED' ? 'Подтверждено' : 'Отклонено'} · {fmtISO(inv.date)} {inv.time ? `· ${inv.time}` : ''}</span>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </DashboardLayout>
  )
}