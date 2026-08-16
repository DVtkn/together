'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

type Venue = { n: string; a: string; p: number; e: string; tag?: string }

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
const isBusy = (d: Date, t: string) => (d.getDate() + parseInt(t) * 2 + Math.floor(parseInt(t.split(':')[1]) / 10)) % 5 === 0

export default function DatePage() {
  const [partner, setPartner] = useState('Аня')
  const [view, setView] = useState<'d' | 'a'>('d')          // демо-переключатель ролей
  const [dState, setDState] = useState<'idle' | 'wait' | 'plan'>('idle')
  const [step, setStep] = useState(1)
  const [vibe, setVibe] = useState<string | null>(null)
  const [custom, setCustom] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
  const [venue, setVenue] = useState<Venue | null>(null)
  const [day, setDay] = useState<Date | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [calOpen, setCalOpen] = useState(false)
  const [cal, setCal] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() } })

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(d => {
      const me = d?.user?.name
      const a = d?.couple?.partnerA?.name, b = d?.couple?.partnerB?.name
      if (a && b) setPartner(a !== me ? a : b)
    }).catch(() => {})
  }, [])

  const pickVibe = (id: string) => { setVibe(id); setVenue(null); setTimeout(() => setStep(2), 150) }
  const pickRandom = () => pickVibe(VIBES[Math.floor(Math.random() * VIBES.length)].id)
  const applyCustom = () => { if (!custom.trim()) return; setVibe('custom'); setVenue(null); setStep(2) }
  const pickVenue = (v: Venue) => { setVenue(v); setTimeout(() => setStep(3), 150) }
  const pickDay = (d: Date) => { setDay(d); if (time && isBusy(d, time)) setTime(null) }
  const confirm = () => { setDState('plan'); setView('d') }

  const venues = vibe === 'custom'
    ? [...VENUES.gastro, ...VENUES.cozy, ...VENUES.romantic]
    : VENUES[vibe ?? ''] ?? []

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() + i); return d })

  const first = new Date(cal.y, cal.m, 1)
  let lead = first.getDay(); if (lead === 0) lead = 7; lead--
  const daysIn = new Date(cal.y, cal.m + 1, 0).getDate()

  return (
    <DashboardLayout>
      <div className="h1">Свидание</div>
      <div className="dim">Ты зовёшь. Она выбирает. Ты бронируешь.</div>

      <div className="seg">
        <button className={view === 'd' ? 'on' : ''} onClick={() => setView('d')}>Ты — Дима</button>
        <button className={view === 'a' ? 'on' : ''} onClick={() => setView('a')}>Она — {partner}</button>
      </div>

      {/* ===== ВИД ПАРНЯ: только инвайт и план ===== */}
      {view === 'd' && dState === 'idle' && (
        <div className="cd" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💌</div>
          <div className="h2" style={{ marginBottom: 6 }}>Позови {partner}</div>
          <div className="dim" style={{ marginBottom: 18 }}>
            Она выберет вайб, место и время.<br />Тебе останется забронировать.
          </div>
          <button className="btn btn-p btn-w" onClick={() => setDState('wait')}>Отправить инвайт</button>
        </div>
      )}

      {view === 'd' && dState === 'wait' && (
        <div className="cd" style={{ textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
          <div className="h2" style={{ marginBottom: 4 }}>Ждём {partner}</div>
          <div className="dim">Инвайт отправлен. Она выбирает.</div>
          <button className="btn btn-s btn-w" style={{ marginTop: 16 }} onClick={() => setView('a')}>
            Посмотреть глазами {partner} →
          </button>
        </div>
      )}

      {view === 'd' && dState === 'plan' && venue && (
        <div className="cd" style={{ border: '1px solid rgba(16,185,129,.3)' }}>
          <span className="badge ok">{partner} выбрала</span>
          <div className="h2" style={{ margin: '12px 0 4px' }}>{venue.n}</div>
          <div className="dim">{venue.a} · {'₽'.repeat(venue.p)}</div>
          <div className="sum" style={{ marginTop: 14 }}>
            <div className="sum-r"><span>Когда</span><b>{day ? fmtDate(day) : ''} · {time}</b></div>
            <div className="sum-r"><span>Адрес</span><b>{vibe === 'nothing' ? 'У вас дома' : venue.a}</b></div>
            <div className="sum-r"><span>Телефон</span><b>+7 812 000-00-00</b></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <a className="btn btn-p" style={{ flex: 1 }} href="tel:+78120000000">📞 Позвонить</a>
            <button className="btn btn-s" style={{ flex: 1 }}>Забронировать</button>
          </div>
        </div>
      )}

      {/* ===== ВИД ДЕВУШКИ: wizard выбора ===== */}
      {view === 'a' && (
        <>
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
              <button className="btn btn-p btn-w" style={{ marginTop: 14 }} onClick={confirm}>Отправить Диме</button>
            </>
          )}
        </>
      )}
    </DashboardLayout>
  )
}
