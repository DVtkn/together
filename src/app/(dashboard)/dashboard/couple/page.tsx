'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { DECKS, IntimacyDeck } from '@/lib/decks'

type Status = {
  couple: null | { id: string; status: string; partnerName: string | null }
  outgoing: null | { id: string; toUsername: string }
  incoming: null | { id: string; fromUsername: string }
  assessments: Array<{ key: string; title: string; emoji: string; me: boolean; partner: boolean; both: boolean }>
  report: null | {
    compatibility: number | null
    completedBoth: number
    total: number
    openedAxes: number
    axes: Array<{ key: string; name: string; value: number | null }>
  }
  synastry: null | { score: number; hasBirthDates: boolean }
}

interface StoryEvent {
  id: string
  type: string
  title: string
  meta: Record<string, unknown> | null
  createdAt: string
}

interface DateMemory {
  id: string
  venueName: string
  date: string
  photoUrl: string | null
  note: string | null
  createdAt: string
}

const STORY_EMOJI: Record<string, string> = {
  couple_created: '💞',
  first_test: '🧪',
  both_tests: '🧪',
  report_generated: '📄',
  first_date: '📍',
  challenge_completed: '🌙',
  anniversary: '🎂',
  date_visited: '📸',
}

function storyEmoji(type: string): string {
  return STORY_EMOJI[type] ?? '✨'
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

export default function CouplePage() {
  const [s, setS] = useState<Status | null>(null)
  const [login, setLogin] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [story, setStory] = useState<{ events: StoryEvent[]; memories: DateMemory[] } | null>(null)

  const router = useRouter()
  const repeatDate = async (venueName: string) => {
    const res = await fetch('/api/date-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vibe: 'Повторить место', venueName }),
    })
    if (res.ok) router.push('/dashboard/date')
  }

  const [deck, setDeck] = useState<IntimacyDeck | null>(null)
  const [deckIdx, setDeckIdx] = useState(0)
  const [doneCount, setDoneCount] = useState(0)

  const load = useCallback(() => {
    fetch('/api/couples/status').then(r => r.json()).then(setS).catch(() => {})
    fetch('/api/couple-events').then(r => r.json()).then(d => {
      if (d && Array.isArray(d.events)) setStory({ events: d.events, memories: d.memories ?? [] })
    }).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  async function sendInvite() {
    setBusy(true); setErr(null); setOk(null)
    const r = await fetch('/api/couples/link', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: login.trim().replace(/^@/, '') }),
    })
    const j = await r.json()
    if (!r.ok) setErr(j?.error ?? 'Не получилось отправить')
    else { setOk('Инвайт отправлен. Ждём, пока партнёр примет.'); setLogin(''); load() }
    setBusy(false)
    window.dispatchEvent(new Event('together:refresh'))
  }

  async function answer(id: string, accept: boolean) {
    setBusy(true)
    await fetch(`/api/couples/link/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept }),
    })
    setBusy(false); load()
    window.dispatchEvent(new Event('together:refresh'))
  }

  async function cancel(id: string) {
    await fetch(`/api/couples/link/${id}`, { method: 'DELETE' })
    load()
  }

  function openDeck(d: IntimacyDeck) {
    setDeck(d)
    setDeckIdx(0)
    setDoneCount(0)
  }

  if (!s) return (
    <DashboardLayout>
      <div className="loading-screen"><div className="loading-icon">💞</div><div className="loading-text">Загружаем</div></div>
    </DashboardLayout>
  )

  const done = s.assessments.filter(a => a.both).length
  const total = s.assessments.length || 10

  const timeline: Array<{
    id: string
    at: number
    emoji: string
    title: string
    type: string
    memory?: DateMemory
  }> = [
    ...story?.events.map(e => ({ id: `e_${e.id}`, at: new Date(e.createdAt).getTime(), emoji: storyEmoji(e.type), title: e.title, type: e.type })) ?? [],
    ...story?.memories.map(m => ({ id: `m_${m.id}`, at: new Date(m.date).getTime(), emoji: '📸', title: m.venueName, type: 'date_visited', memory: m })) ?? [],
  ].sort((a, b) => a.at - b.at)

  return (
    <DashboardLayout>
      <div className="h1">Кто вы вдвоём</div>
      <div className="dim">Тесты, отчёт, звёзды, история — всё о вашей паре.</div>

      {/* ==== ПАРА ==== */}
      <div className="k" id="pair">Пара</div>
      {!s.couple && !s.outgoing && !s.incoming && (
        <div className="cd static pair-hero">
          <div className="pair-emoji">💞</div>
          <div className="h2" style={{ marginBottom: 6 }}>Найдите своего партнёра</div>
          <span className="dim">Отправьте инвайт по логину — партнёр примет его, и ваши данные соединятся.</span>
          <div className="pair-form">
            <input className="auth-input" placeholder="@логин партнёра" value={login}
              onChange={e => setLogin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login.trim() && sendInvite()} />
            <button className="btn btn-p" disabled={!login.trim() || busy} onClick={sendInvite}>
              {busy ? 'Отправляем…' : 'Отправить инвайт'}
            </button>
          </div>
          {err && <div className="notice notice-amber" style={{ marginTop: 12 }}>{err}</div>}
          {ok && <div className="notice notice-ok" style={{ marginTop: 12 }}>{ok}</div>}
          <div className="pair-steps">
            <div><i>1</i><span>Отправьте инвайт</span></div>
            <div><i>2</i><span>Партнёр принимает</span></div>
            <div><i>3</i><span>Тесты и отчёты — общие</span></div>
          </div>
        </div>
      )}

      {s.outgoing && (
        <div className="cd static">
          <div className="cd-r">
            <div className="cd-ic">⏳</div>
            <div className="cd-t">
              <b>Инвайт отправлен @{s.outgoing.toUsername}</b>
              <span>Ждём принятия. Партнёр увидит запрос у себя.</span>
            </div>
            <button className="btn btn-s btn-sm" onClick={() => cancel(s.outgoing!.id)}>Отменить</button>
          </div>
        </div>
      )}

      {s.incoming && (
        <div className="cd static" style={{ border: '1px solid rgba(139,92,246,.35)' }}>
          <div className="cd-r">
            <div className="cd-ic">💌</div>
            <div className="cd-t">
              <b>@{s.incoming.fromUsername} приглашает вас стать парой</b>
              <span>Тесты, пульс и отчёты станут общими.</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-p" style={{ flex: 1 }} disabled={busy} onClick={() => answer(s.incoming!.id, true)}>Принять</button>
            <button className="btn btn-s" style={{ flex: 1 }} disabled={busy} onClick={() => answer(s.incoming!.id, false)}>Отклонить</button>
          </div>
        </div>
      )}

      {s.couple && (
        <div className="cd static">
          <div className="cd-r">
            <div className="cd-ic">💞</div>
            <div className="cd-t">
              <b>Вы и {s.couple.partnerName}</b>
              <span>{s.couple.status === 'ACTIVE' ? 'Пара активна' : 'Ждём, пока партнёр подключится'}</span>
            </div>
            <span className="badge ok">✓</span>
          </div>
        </div>
      )}

      {/* ==== ОПРОСНИКИ ==== */}
      <div className="k" id="tests">Опросники · {done} из {total}</div>
      <div className="prog-line"><div className="prog-fill" style={{ width: `${(done / total) * 100}%` }} /></div>
      <div className="assess-grid">
        {s.assessments.map(a => {
          const statusMap: Record<string, string> = {
            both: 'оба ✓',
            me: 'вы ✓ · партнёр —',
            partner: 'партнёр ✓ · вы —',
            neither: 'не начат',
          }
          const statusKey = a.both ? 'both' : a.me ? 'me' : a.partner ? 'partner' : 'neither'
          const statusText = statusMap[statusKey] || 'не начат'
          return (
            <Link key={a.key} href={`/dashboard/assessments/${a.key}`} className={`a-card ${a.both ? 'done' : ''}`}>
              <i>{a.emoji}</i>
              <b>{a.title}</b>
              <span className="a-status">{statusText}</span>
            </Link>
          )
        })}
      </div>

      {/* ==== РЕЗУЛЬТАТЫ ==== */}
      <div className="k" id="report">Карта пары</div>
      <div className="cd static">
        {s.report ? (
          <>
            <div className="radar-wrap">
              {(() => {
                const axes = s.report.axes ?? []
                const size = 220
                const cx = size / 2
                const cy = size / 2
                const r = 80
                const open = axes.filter(a => a.value !== null)
                const n = Math.max(open.length, 3)
                const pt = (i: number, radius: number) => {
                  const angle = (Math.PI * 2 * i) / n - Math.PI / 2
                  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
                }
                const rings = [0.25, 0.5, 0.75, 1]
                const grid = rings.map(f => open.map((_, i) => pt(i, r * f)))
                const poly = open.map((a, i) => {
                  const v = Math.max(0, Math.min(10, a.value ?? 5))
                  return pt(i, r * (v / 10))
                })
                const polyStr = poly.map(p => `${p.x},${p.y}`).join(' ')
                const labelR = r + 18
                const labels = open.map((a, i) => {
                  const p = pt(i, labelR)
                  return { ...p, text: a.name, value: a.value }
                })
                return (
                  <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Карта пары по осям">
                    {grid.map((ring, ri) => (
                      <polygon key={ri} points={ring.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="var(--line)" strokeWidth={1} />
                    ))}
                    {open.map((_, i) => {
                      const p1 = pt(i, r)
                      const p0 = pt(0, r)
                      return <line key={i} x1={cx} y1={cy} x2={p1.x} y2={p1.y} stroke="var(--line)" strokeWidth={1} />
                    })}
                    <polygon points={polyStr} fill="rgba(139,92,246,.18)" stroke="var(--grad)" strokeWidth={2} strokeLinejoin="round" />
                    {open.map((a, i) => {
                      const p = pt(i, r * (Math.max(0, Math.min(10, a.value ?? 5)) / 10))
                      return <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#8b5cf6" />
                    })}
                    {labels.map((l, i) => (
                      <text key={i} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="var(--mute)" fontWeight={600}>
                        {l.text.length > 9 ? l.text.slice(0, 8) + '…' : l.text}
                      </text>
                    ))}
                  </svg>
                )
              })()}
            </div>
            <div className="small" style={{ textAlign: 'center', marginTop: 8, color: 'var(--mute)' }}>
              Открыто {s.report.openedAxes}/8 осей {s.report.compatibility !== null && `· совместимость ${s.report.compatibility}%`}
            </div>
          </>
        ) : (
          <div className="dim" style={{ textAlign: 'center', padding: '12px 0' }}>
            Пройдите тесты вместе — карта пары откроется по осям.
          </div>
        )}
      </div>

      {/* ==== СИНАСТРИЯ ==== */}
      <div className="k" id="synastry">Синастрия</div>
      <div className="cd res-card">
        {s.synastry?.hasBirthDates ? (
          <>
            <div className="res-num">{s.synastry.score}%</div>
            <b>Совместимость по датам рождения</b>
            <span>По натальным картам и аспектам</span>
          </>
        ) : (
          <>
            <div className="res-lock">🔮</div>
            <b>Синастрия</b>
            <span>Укажите даты рождения обоих в настройках</span>
            <Link href="/dashboard/settings" className="btn btn-s btn-sm" style={{ marginTop: 10 }}>Указать даты</Link>
          </>
        )}
      </div>

      {/* ==== КОЛОДЫ БЛИЗОСТИ ==== */}
      <div className="k" id="decks">Колоды близости</div>
      {!deck ? (
        <div className="deck-grid">
          {DECKS.map(d => (
            <button key={d.key} className="cd deck-card" onClick={() => openDeck(d)}>
              <div className="deck-emoji">{d.emoji}</div>
              <b>{d.title}</b>
              <span className="dim" style={{ fontSize: 12 }}>{d.questions.length} вопросов</span>
              <span className="dim" style={{ fontSize: 12 }}>{d.description}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="cd static">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <b>{deck.emoji} {deck.title}</b>
            <button className="link-btn" onClick={() => setDeck(null)}>← ко всем колодам</button>
          </div>
          {deckIdx < deck.questions.length ? (
            <>
              <div className="deck-q">«{deck.questions[deckIdx].question}»</div>
              <div className="dim" style={{ fontSize: 12, margin: '8px 0 16px' }}>
                {deck.questions[deckIdx].axis
                  ? `Сфера: ${deck.questions[deckIdx].axis}`
                  : 'Просто о важном'} · вопрос {deckIdx + 1} из {deck.questions.length}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-p" style={{ flex: 1 }} onClick={() => { setDoneCount(d => d + 1); setDeckIdx(i => Math.min(i + 1, deck.questions.length - 1)) }}>
                  Обсудили ✓
                </button>
                <button className="btn btn-s" style={{ flex: 1 }} onClick={() => setDeckIdx(i => Math.min(i + 1, deck.questions.length - 1))}>
                  Следующий →
                </button>
              </div>
              <div className="prog-line" style={{ marginTop: 16 }}><div className="prog-fill" style={{ width: `${(doneCount / deck.questions.length) * 100}%` }} /></div>
            </>
          ) : (
            <div className="empty" style={{ padding: '12px 0' }}>
              <i>🎉</i>
              <div className="h2" style={{ marginBottom: 6 }}>Колода пройдена</div>
              <div className="dim" style={{ marginBottom: 16 }}>Обсудили {doneCount} из {deck.questions.length} вопросов.</div>
              <button className="btn btn-p" onClick={() => setDeck(null)}>К другим колодам</button>
            </div>
          )}
        </div>
      )}

      {/* ==== ИСТОРИЯ ПАРЫ ==== */}
      <div className="k" id="story">История пары</div>
      <div className="cd static">
        {timeline.length === 0 ? (
          <div className="dim" style={{ textAlign: 'center', padding: '12px 0' }}>
            Здесь будет ваша история: первые тесты, свидания и достижения.
          </div>
        ) : (
          <div className="timeline">
            {timeline.map(item => (
              <div key={item.id} className="tl-item">
                <div className="tl-emoji">{item.emoji}</div>
                <div className="tl-body">
                  <b>{item.title}</b>
                  <span>{fmtDate(new Date(item.at).toISOString())}</span>
                  {item.type === 'date_visited' && item.memory?.note && (
                    <p className="tl-note">{item.memory.note}</p>
                  )}
                  {item.type === 'date_visited' && item.memory?.venueName && (
                    <div style={{ marginTop: 6 }}>
                      <button className="link-btn" onClick={() => repeatDate(item.memory!.venueName!)}>↻ Повторить</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}