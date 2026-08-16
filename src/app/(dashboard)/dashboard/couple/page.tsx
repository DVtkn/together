'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

type Status = {
  couple: null | { id: string; status: string; partnerName: string | null }
  outgoing: null | { id: string; toUsername: string }
  incoming: null | { id: string; fromUsername: string }
  assessments: Array<{ key: string; title: string; emoji: string; me: boolean; partner: boolean; both: boolean }>
  report: null | { compatibility: number }
  synastry: null | { score: number; hasBirthDates: boolean }
}

export default function CouplePage() {
  const [s, setS] = useState<Status | null>(null)
  const [login, setLogin] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/couples/status').then(r => r.json()).then(setS).catch(() => {})
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
  }

  async function answer(id: string, accept: boolean) {
    setBusy(true)
    await fetch(`/api/couples/link/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept }),
    })
    setBusy(false); load()
  }

  async function cancel(id: string) {
    await fetch(`/api/couples/link/${id}`, { method: 'DELETE' })
    load()
  }

  if (!s) return (
    <DashboardLayout>
      <div className="loading-screen"><div className="loading-icon">💞</div><div className="loading-text">Загружаем</div></div>
    </DashboardLayout>
  )

  const done = s.assessments.filter(a => a.both).length
  const total = s.assessments.length || 10

  return (
    <DashboardLayout>
      <div className="h1">Кто вы вдвоём</div>
      <div className="dim">Тесты, отчёт, звёзды — всё о вашей паре.</div>

      {/* ==== ПАРА ==== */}
      <div className="k">Пара</div>

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
      <div className="k">Опросники · {done} из {total}</div>
      <div className="prog-line"><div className="prog-fill" style={{ width: `${(done / total) * 100}%` }} /></div>
      <div className="assess-grid">
        {s.assessments.map(a => (
          <Link key={a.key} href={`/dashboard/assessments/${a.key}`} className={`a-card ${a.both ? 'done' : ''}`}>
            <i>{a.emoji}</i>
            <b>{a.title}</b>
            <span className="a-status">
              {a.both ? 'оба ✓' : a.me ? 'вы ✓ · партнёр —' : a.partner ? 'партнёр ✓ · вы —' : 'не начат'}
            </span>
          </Link>
        ))}
      </div>

      {/* ==== РЕЗУЛЬТАТЫ ==== */}
      <div className="k">Результаты</div>
      <div className="grid-2res">
        <Link href="/dashboard/report" className="cd res-card">
          {s.report ? (
            <>
              <div className="res-num">{s.report.compatibility}%</div>
              <b>Отчёт пары</b>
              <span>Где вы сила, где — рост</span>
            </>
          ) : (
            <>
              <div className="res-lock">🔒</div>
              <b>Отчёт пары</b>
              <span>Откроется, когда оба пройдут тесты · {done}/{total}</span>
            </>
          )}
        </Link>
        <Link href="/dashboard/astro" className="cd res-card">
          {s.synastry?.hasBirthDates ? (
            <>
              <div className="res-num">{s.synastry.score}%</div>
              <b>Синастрия</b>
              <span>По датам рождения</span>
            </>
          ) : (
            <>
              <div className="res-lock">🔮</div>
              <b>Синастрия</b>
              <span>Укажите даты рождения в настройках</span>
            </>
          )}
        </Link>
      </div>
    </DashboardLayout>
  )
}