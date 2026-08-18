'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { DECKS, IntimacyDeck } from '@/lib/decks'
import { DIM_META } from '@/lib/report/dim-meta'
import { toast } from '@/lib/toast'

type Status = {
  couple: null | { id: string; status: string; partnerName: string | null; startedAt: string | null }
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

interface AnalyticsData {
  compatibility: number | null
  dimensions: Array<{ key: string; title: string; emoji: string; me: number; partner: number; align: number; level: number; score: number }>
  strengths: Array<{ key: string; title: string; emoji: string; score: number; text: string }>
  weaknesses: Array<{ key: string; title: string; emoji: string; score: number; text: string; reason: string }>
  risks: Array<{ key: string; title: string; emoji: string; risk: string; prevention: string }>
  perspectives: string
  partnerPending: boolean
}

type ReportTab = 'str' | 'grow' | 'risk' | 'fut'

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function fmtTogether(iso: string | null): string {
  if (!iso) return 'только начали'
  const start = new Date(iso)
  const now = new Date()
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (now.getDate() < start.getDate()) months -= 1
  if (months <= 0) return 'меньше месяца'
  const years = Math.floor(months / 12)
  const rest = months % 12
  const parts: string[] = []
  if (years) parts.push(`${years} ${plural(years, 'год', 'года', 'лет')}`)
  if (rest) parts.push(`${rest} ${plural(rest, 'месяц', 'месяца', 'месяцев')}`)
  return parts.join(' ')
}

export default function CouplePage() {
  const [s, setS] = useState<Status | null>(null)
  const [an, setAn] = useState<AnalyticsData | null>(null)
  const [tab, setTab] = useState<ReportTab>('str')
  const [testsOpen, setTestsOpen] = useState(false)
  const [synOpen, setSynOpen] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const [login, setLogin] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const router = useRouter()

  const [deck, setDeck] = useState<IntimacyDeck | null>(null)
  const [deckIdx, setDeckIdx] = useState(0)
  const [doneCount, setDoneCount] = useState(0)

  const load = useCallback(() => {
    fetch('/api/couples/status').then(r => r.json()).then(setS).catch(() => {})
    fetch('/api/couple-analytics').then(r => r.json()).then(d => {
      if (d && Array.isArray(d.dimensions)) setAn(d)
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
    else { setOk('Инвайт отправлен. Ждём, пока партнёр примет.'); setLogin(''); toast('Инвайт отправлен'); load() }
    setBusy(false)
    window.dispatchEvent(new Event('together:refresh'))
  }

  async function answer(id: string, accept: boolean) {
    setBusy(true)
    await fetch(`/api/couples/link/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept }),
    })
    toast(accept ? 'Пара создана 💞' : 'Запрос отклонён')
    setBusy(false); load()
    window.dispatchEvent(new Event('together:refresh'))
  }

  async function cancel(id: string) {
    await fetch(`/api/couples/link/${id}`, { method: 'DELETE' })
    toast('Инвайт отменён')
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
  const partner = s.couple?.partnerName ?? null
  const compat = an?.compatibility ?? s.report?.compatibility ?? null

  const dims = an?.dimensions ?? []
  const top = an?.strengths?.[0] ?? null
  const weak = an?.weaknesses?.[0] ?? null
  const gap = (d: { me: number; partner: number }) => Math.abs(d.me - d.partner)
  const match = dims.filter(d => gap(d) <= 15).sort((a, b) => b.score - a.score)
  const diverge = dims.filter(d => gap(d) > 30)
  const advice = weak ? DIM_META[weak.key]?.prevention : 'Держите ритуалы — они ваш фундамент.'

  const noPassport = partner === null || (an && an.dimensions.length === 0)
  const allTestsDone = done === total

  const startTs = s.couple?.startedAt ? new Date(s.couple.startedAt).getTime() : null
  const diffMs = startTs !== null ? Math.max(0, nowMs - startTs) : null
  const tDays = diffMs !== null ? Math.floor(diffMs / 86400000) : null
  const tHours = diffMs !== null ? String(Math.floor(diffMs / 3600000) % 24).padStart(2, '0') : null
  const tMins = diffMs !== null ? String(Math.floor(diffMs / 60000) % 60).padStart(2, '0') : null
  const tSecs = diffMs !== null ? String(Math.floor(diffMs / 1000) % 60).padStart(2, '0') : null

  return (
    <DashboardLayout>
      {/* ==== БЕЗ ПАРЫ: создание/инвайт ==== */}
      {!s.couple && !s.outgoing && !s.incoming && (
        <div className="pair-hero" style={{ textAlign: 'center', padding: '24px 0' }}>
          <div className="pair-emoji">💞</div>
          <div className="h1" style={{ marginBottom: 6 }}>Найдите своего партнёра</div>
          <span className="dim">Отправьте инвайт по логину — партнёр примет его, и здесь появится паспорт вашей пары.</span>
          <div className="pair-form" style={{ maxWidth: 360, margin: '16px auto 0' }}>
            <input className="auth-input" placeholder="@логин партнёра" value={login}
              onChange={e => setLogin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login.trim() && sendInvite()} />
            <button className="btn btn-p" disabled={!login.trim() || busy} onClick={sendInvite}>
              {busy ? 'Отправляем…' : 'Отправить инвайт'}
            </button>
          </div>
          {err && <div className="notice notice-amber" style={{ marginTop: 12 }}>{err}</div>}
          {ok && <div className="notice notice-ok" style={{ marginTop: 12 }}>{ok}</div>}
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

      {s.couple && s.couple.status !== 'ACTIVE' && (
        <div className="cd static">
          <div className="cd-r">
            <div className="cd-ic">💞</div>
            <div className="cd-t">
              <b>Вы и {s.couple.partnerName}</b>
              <span>Ждём, пока партнёр подтвердит пару.</span>
            </div>
          </div>
        </div>
      )}

      {/* ==== ПАСПОРТ ПАРЫ ==== */}
      {partner && s.couple?.status === 'ACTIVE' && (
        <>
          {/* 1 · Компактный hero */}
          <div className="we-compact">
            <div className="we-line">
              <h1 className="h1" style={{ marginBottom: 0 }}>Вы и {partner}</h1>
              {compat !== null && <span className="compat-badge">{compat}%</span>}
            </div>
            <div className="dim">
              Вместе {fmtTogether(s.couple.startedAt)} · {done}/{total} тестов
              {top && ` · ⚡ ${top.title} ${top.score}%`}
            </div>
          </div>

          {/* ⏳ Наше время */}
          {diffMs !== null && (
            <div className="cd static time-card">
              <div className="time-num">
                <b>{tDays}</b> <span>дн</span> {tHours}<span>:</span>{tMins}<span>:</span>{tSecs}
              </div>
              <div className="time-label">мы вместе уже столько</div>
            </div>
          )}

          {noPassport ? (
            <div className="cd static" style={{ maxWidth: 420, margin: '0 auto 20px', textAlign: 'center' }}>
              <div className="cd-ic" style={{ margin: '0 auto 8px', width: 48, height: 48 }}>🧪</div>
              <b>Откройте паспорт пары</b>
              <span className="dim" style={{ display: 'block', margin: '6px 0 12px' }}>
                {an?.partnerPending ? 'Партнёр ещё не прошёл тесты. Как ответит — паспорт появится.' : 'Пройдите первые тесты вместе — совместимость, портрет и суперсила откроются здесь.'}
              </span>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href={s.assessments.find(a => !a.both) ? `/dashboard/assessments/${s.assessments.find(a => !a.both)!.key}` : '#tests'} className="btn btn-primary">Пройти тест</Link>
                <button className="btn btn-s" onClick={() => setTestsOpen(true)}>Смотреть тесты</button>
              </div>
            </div>
          ) : (
            <>
              {/* 2 · Сводка сходств */}
              <div className="sim-chips">
                {match.map(d => <span key={d.key} className="sim-chip ok">✓ {d.title}</span>)}
                {dims.filter(d => gap(d) > 15 && gap(d) <= 30).map(d => <span key={d.key} className="sim-chip mid">~ {d.title}</span>)}
                {diverge.map(d => <span key={d.key} className="sim-chip bad">≠ {d.title}</span>)}
              </div>

              {/* 3 · Точечные оси: вы vs партнёр */}
              <div className="k">Сильные стороны и зоны роста</div>
              <div className="cd static">
                <div className="legend" style={{ marginTop: 0, marginBottom: 12 }}>
                  <span className="dima"><i />вы</span>
                  <span className="anya"><i />{partner}</span>
                  <span style={{ color: 'var(--mute)' }}>отрезок = разрыв</span>
                </div>
                {dims.map(d => {
                  const g = gap(d)
                  const tone = g <= 15 ? 'var(--ok)' : g <= 30 ? 'var(--warn)' : 'var(--red)'
                  return (
                    <div className="axis-row" key={d.key}>
                      <div className="axis-head">
                        <span>{d.emoji} {d.title}</span>
                        <b style={{ color: d.score >= 70 ? 'var(--ok)' : d.score < 60 ? 'var(--warn)' : 'var(--text)' }}>{d.score}%</b>
                      </div>
                      <div className="dot-track">
                        <div className="dot-gap" style={{ left: `${Math.min(d.me, d.partner)}%`, width: `${g}%`, background: tone }} />
                        <i className="dot me" style={{ left: `${d.me}%` }} />
                        <i className="dot pa" style={{ left: `${d.partner}%` }} />
                      </div>
                      <div className="axis-note" style={{ color: tone }}>
                        {g <= 15 ? 'вы совпадаете' : g <= 30 ? 'есть разница' : 'сильно расходитесь — повод поговорить'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* 3 · Отчёт пары */}
          {!noPassport && (
            <>
              <div className="k" id="report">Отчёт пары</div>
              <div className="cd static">
                <div className="seg" style={{ margin: '0 0 12px' }}>
                  <button className={tab === 'str' ? 'on' : ''} onClick={() => setTab('str')}>💪 Силы</button>
                  <button className={tab === 'grow' ? 'on' : ''} onClick={() => setTab('grow')}>⚠️ Рост</button>
                  <button className={tab === 'risk' ? 'on' : ''} onClick={() => setTab('risk')}>🚨 Риски</button>
                  <button className={tab === 'fut' ? 'on' : ''} onClick={() => setTab('fut')}>🔮 Дальше</button>
                </div>
                {tab === 'str' && (
                  an!.strengths.length ? (
                    <div className="an-list">
                      {an!.strengths.map(si => (
                        <div className="an-item ok" key={si.key}>
                          <b style={{ fontSize: 14 }}>{si.title} · {si.score}%</b>
                          <span className="small dim" style={{ display: 'block', marginTop: 2 }}>{si.text}</span>
                        </div>
                      ))}
                    </div>
                  ) : <div className="dim" style={{ textAlign: 'center', padding: '8px 0' }}>Сильных сторон (от 70%) пока нет.</div>
                )}
                {tab === 'grow' && (
                  an!.weaknesses.length ? (
                    <div className="an-list">
                      {an!.weaknesses.map(w => (
                        <div className="an-item warn" key={w.key}>
                          <b style={{ fontSize: 14 }}>{w.title} · {w.score}%</b>
                          <span className="small dim" style={{ display: 'block', marginTop: 2 }}>{w.text} · {w.reason}</span>
                        </div>
                      ))}
                    </div>
                  ) : <div className="dim" style={{ textAlign: 'center', padding: '8px 0' }}>Зон роста ниже 60% нет 💪</div>
                )}
                {tab === 'risk' && (
                  an!.risks.length ? (
                    <div className="an-list">
                      {an!.risks.map(r => (
                        <div className="an-item risk" key={r.key}>
                          <b style={{ fontSize: 14 }}>{r.title}</b>
                          <span className="small dim" style={{ display: 'block', marginTop: 2 }}>{r.risk}</span>
                          <div className="ai-action" style={{ marginTop: 8 }}>🛡 {r.prevention}</div>
                        </div>
                      ))}
                    </div>
                  ) : <div className="dim" style={{ textAlign: 'center', padding: '8px 0' }}>Рисков не выявлено.</div>
                )}
                {tab === 'fut' && (
                  <div className="an-item" style={{ border: 'none', background: 'transparent', padding: 0 }}>
                    <span className="dim" style={{ lineHeight: 1.7, display: 'block' }}>{an!.perspectives}</span>
                  </div>
                )}
              </div>

              {/* 4 · Совет недели */}
              {advice && (
                <div className="cd static advice">
                  <div className="cd-r">
                    <div className="cd-ic">🎯</div>
                    <div className="cd-t">
                      <b>Совет недели</b>
                      <span>{advice}</span>
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-w" style={{ marginTop: 12 }} onClick={() => router.push('/dashboard/ai')}>Разобрать с Психологом</button>
                </div>
              )}
            </>
          )}

          {/* 5 · Тесты — свёрнуто */}
          <div className="k" id="tests">Опросники · {done}/{total}</div>
          <div className="cd card-action" onClick={() => setTestsOpen(o => !o)}>
            <div className="cd-r">
              <div className="cd-ic">🧪</div>
              <div className="cd-t">
                <b>{allTestsDone ? 'Все пройдены ✓' : `Следующий: ${s.assessments.find(a => !a.both)?.title ?? '—'}`}</b>
                <span>{allTestsDone ? 'Перепройти любой — отчёт обновится' : 'продолжить'}</span>
              </div>
              <span className="arr">{testsOpen ? '⌄' : '›'}</span>
            </div>
          </div>
          {testsOpen && (
            <div className="cd static" style={{ marginTop: 0 }}>
              <div className="prog-line"><div className="prog-fill" style={{ width: `${(done / total) * 100}%` }} /></div>
              <div className="assess-grid" style={{ marginTop: 12 }}>
                {s.assessments.map(a => {
                  const statusMap: Record<string, string> = {
                    both: 'Пройден вместе',
                    me: 'Вы прошли · партнёр ещё нет',
                    partner: 'Партнёр прошёл · вы ещё нет',
                    neither: 'Не начат',
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
            </div>
          )}

          {/* 6 · Синастрия компактно */}
          <div className="k">Синастрия</div>
          <div className="cd card-action" onClick={() => setSynOpen(o => !o)}>
            <div className="cd-r">
              <div className="cd-ic">🔮</div>
              <div className="cd-t">
                <b>{s.synastry?.hasBirthDates ? `Синастрия · ${s.synastry.score}%` : 'Синастрия'}</b>
                <span>{s.synastry?.hasBirthDates ? 'Совместимость по датам рождения' : 'Укажите даты рождения в настройках'}</span>
              </div>
              <span className="arr">{synOpen ? '⌄' : '›'}</span>
            </div>
          </div>
          {synOpen && (
            <div className="cd static res-card">
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
          )}
        </>
      )}

      {/* ==== КОЛОДЫ БЛИЗОСТИ ==== */}
      {partner && s.couple?.status === 'ACTIVE' && (
        <>
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
        </>
      )}

    </DashboardLayout>
  )
}