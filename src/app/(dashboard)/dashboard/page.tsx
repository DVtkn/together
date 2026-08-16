'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

const MOODS = [
  { emoji: '😄', text: 'Всё супер' },
  { emoji: '🙂', text: 'Нормально' },
  { emoji: '😐', text: 'Спокойно' },
  { emoji: '🥺', text: 'Мне грустно' },
  { emoji: '😰', text: 'Тревожусь' },
  { emoji: '😤', text: 'Раздражён' },
]
const SCORE: Record<string, number> = { '😄': 5, '🙂': 4, '😐': 3, '🥺': 2, '😰': 2, '😤': 1 }

function greeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Доброе утро'
  if (h >= 12 && h < 18) return 'Привет'
  if (h >= 18 && h < 23) return 'Добрый вечер'
  return 'Не спится?'
}

export default function DashboardPage() {
  const [name, setName] = useState('')
  const [myMood, setMyMood] = useState<{ emoji: string; text: string | null } | null>(null)
  const [partner, setPartner] = useState<{ name: string; mood: { emoji: string; text: string | null; at: string } | null } | null>(null)
  const [week, setWeek] = useState<Array<{ label: string; mine: number | null; theirs: number | null }>>([])
  const [challenge, setChallenge] = useState<any>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/mood').then(r => r.json()),
      fetch('/api/mood/history?days=7').then(r => r.json()),
      fetch('/api/user/profile').then(r => r.json()),
      fetch('/api/dashboard').then(r => r.json()),
    ]).then(([m, h, p, d]) => {
      setMyMood(m.mine ?? null)
      setPartner({ name: p?.couple?.partnerName ?? 'Партнёр', mood: m.partner ? { ...m.partner, at: m.partner.at } : null })
      setChallenge(d?.activeChallenge ?? null)
      setName(d?.user?.name?.split(' ')[0] ?? '')
      const days: any[] = []
      const DN = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
      for (let i = 6; i >= 0; i--) {
        const dt = new Date(); dt.setDate(dt.getDate() - i)
        const key = dt.toDateString()
        const mine = h?.history?.mine?.find((e: any) => new Date(e.createdAt).toDateString() === key)
        const theirs = h?.history?.partner?.find((e: any) => new Date(e.createdAt).toDateString() === key)
        days.push({ label: DN[dt.getDay()], mine: mine ? SCORE[mine.emoji] ?? 3 : null, theirs: theirs ? SCORE[theirs.emoji] ?? 3 : null })
      }
      setWeek(days)
    }).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  async function tap(m: { emoji: string; text: string }) {
    setMyMood(m); setSaved(false)
    await fetch('/api/mood', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji: m.emoji, text: m.text }) })
    setSaved(true)
    window.dispatchEvent(new Event('together:refresh'))
  }

  async function remind() {
    await fetch('/api/notifications/remind-mood', { method: 'POST' }).catch(() => {})
    alert('Напоминание отправлено 💜')
  }

  const hasWeek = week.some(d => d.mine !== null || d.theirs !== null)

  return (
    <DashboardLayout>
      <div className="h1">{greeting()}{name ? `, ${name}` : ''}.</div>
      <div className="dim">Полминуты — и вы на связи.</div>

      {/* 1 · Как ты */}
      <div className="cd static mood-hero">
        <div className="mood-q">Как ты?</div>
        <div className="mood-row">
          {MOODS.map(m => (
            <button key={m.emoji} className={`mood-big ${myMood?.emoji === m.emoji ? 'sel' : ''}`}
              onClick={() => tap(m)} aria-label={m.text}>
              <i>{m.emoji}</i><b>{m.text}</b>
            </button>
          ))}
        </div>
        <div className="autosave-hint">{saved ? '✓ Записано. Партнёр увидит.' : '💜 Один тап — и записано'}</div>
      </div>

      {/* 2 · Как партнёр */}
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
              <b>{partner?.name ?? 'Партнёр'} ещё не отметил(а)</b>
              <span>Когда отметит — увидите здесь</span>
            </div>
            <button className="btn btn-s btn-sm" onClick={remind}>🔔 Напомнить</button>
          </div>
        )}
      </div>

      {/* 3 · Челлендж недели */}
      {challenge && (
        <div className="cd">
          <div className="cd-r">
            <div className="cd-ic">🌙</div>
            <div className="cd-t">
              <b>{challenge.title}</b>
              <span>{challenge.completedByCurrent ? 'Вы — сделали ✓' : 'Вы — ещё нет'} · {challenge.completedByPartner ? 'партнёр ✓' : 'партнёр —'}</span>
            </div>
          </div>
          {!challenge.completedByCurrent && (
            <Link href="/dashboard/challenges" className="btn btn-p btn-w" style={{ marginTop: 12 }}>Отметить выполнение</Link>
          )}
        </div>
      )}

      {/* 4 · Неделя вместе */}
      <div className="cd static">
        <div className="cd-r" style={{ marginBottom: hasWeek ? 14 : 0 }}>
          <div className="cd-ic">📈</div>
          <div className="cd-t"><b>Ваша неделя вместе</b></div>
        </div>
        {hasWeek ? (
          <>
            <div className="week-chart">
              {week.map((d, i) => (
                <div key={i} className="wc-day">
                  <div className="wc-bars">
                    <div className="wc-bar dima" style={{ height: `${d.mine ? d.mine * 16 : 3}px`, opacity: d.mine ? 1 : .15 }} />
                    <div className="wc-bar anya" style={{ height: `${d.theirs ? d.theirs * 16 : 3}px`, opacity: d.theirs ? 1 : .15 }} />
                  </div>
                  <span>{d.label}</span>
                </div>
              ))}
            </div>
            <div className="legend"><span className="dima"><i style={{ background: 'var(--grad)' }} />вы</span><span className="anya"><i style={{ background: 'var(--blue)' }} />{partner?.name ?? 'партнёр'}</span></div>
          </>
        ) : (
          <div className="dim" style={{ textAlign: 'center', padding: '8px 0 4px', fontSize: 13 }}>
            Когда вы оба отметите настроение, здесь появится ваша неделя.
          </div>
        )}
      </div>

      {/* 5 · Быстрые ссылки */}
      <div className="daily-links">
        <Link href="/dashboard/partner" className="cd"><div className="cd-r"><div className="cd-ic">💐</div><div className="cd-t"><b>Партнёр</b><span>Хотелки, цветы, виш-лист</span></div><span className="arr">›</span></div></Link>
        <Link href="/dashboard/pulse" className="cd"><div className="cd-r"><div className="cd-ic">🫀</div><div className="cd-t"><b>Пульс</b><span>Три вопроса о неделе</span></div><span className="arr">›</span></div></Link>
      </div>
    </DashboardLayout>
  )
}