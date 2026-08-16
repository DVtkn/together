'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { cn } from '@/lib/utils/cn'

const MOODS = [
  { emoji: '😄', label: 'Отлично' },
  { emoji: '🙂', label: 'Хорошо' },
  { emoji: '😐', label: 'Нормально' },
  { emoji: '😔', label: 'Грустно' },
  { emoji: '😫', label: 'Плохо' },
  { emoji: '🤯', label: 'Тяжело' },
  { emoji: '💗', label: 'Влюблён(а)' },
  { emoji: '😴', label: 'Устал(а)' },
  { emoji: '🤩', label: 'Восторг' },
  { emoji: '😢', label: 'Хочу обнимашек' },
]

const TABS = [
  { key: 'mood', label: 'Настроение' },
  { key: 'cravings', label: 'Хотелки' },
  { key: 'flowers', label: 'Цветы' },
  { key: 'wishlist', label: 'Виш-лист' },
]

interface Flower {
  slug: string
  name: string
  emoji: string
  meaning: string | null
  favorite: boolean
}

interface Craving { id: string; item: string; status: string }
interface Wish { id: string; title: string; link: string | null; status: string; priceRange: string | null }

export default function PartnerPage() {
  const [tab, setTab] = useState('mood')
  const [loading, setLoading] = useState(true)

  const [mood, setMood] = useState<{ emoji: string; text: string | null } | null>(null)
  const [partnerMood, setPartnerMood] = useState<{ emoji: string; text: string | null } | null>(null)
  const [moodText, setMoodText] = useState('')

  const [cravings, setCravings] = useState<Craving[]>([])
  const [partnerCravings, setPartnerCravings] = useState<Craving[]>([])
  const [cravingInput, setCravingInput] = useState('')

  const [flowers, setFlowers] = useState<Flower[]>([])

  const [wishes, setWishes] = useState<Wish[]>([])
  const [partnerWishes, setPartnerWishes] = useState<Wish[]>([])
  const [wishTitle, setWishTitle] = useState('')
  const [wishLink, setWishLink] = useState('')
  const [wishPrice, setWishPrice] = useState('')

  const loadAll = async () => {
    try {
      const [m, c, f, w] = await Promise.all([
        fetch('/api/mood').then((r) => r.json()),
        fetch('/api/cravings').then((r) => r.json()),
        fetch('/api/flowers').then((r) => r.json()),
        fetch('/api/wishlist').then((r) => r.json()),
      ])
      setMood(m.mine)
      setPartnerMood(m.partner)
      if (m.mine?.text) setMoodText(m.mine.text)
      setCravings(c.cravings?.mine || [])
      setPartnerCravings(c.cravings?.partner || [])
      setFlowers(f.flowers || [])
      setWishes(w.items?.mine || [])
      setPartnerWishes(w.items?.partner || [])
    } catch (e) {
      console.error('load failed', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/mood').then((r) => r.json()),
      fetch('/api/cravings').then((r) => r.json()),
      fetch('/api/flowers').then((r) => r.json()),
      fetch('/api/wishlist').then((r) => r.json()),
    ])
      .then(([m, c, f, w]) => {
        if (cancelled) return
        setMood(m.mine)
        setPartnerMood(m.partner)
        if (m.mine?.text) setMoodText(m.mine.text)
        setCravings(c.cravings?.mine || [])
        setPartnerCravings(c.cravings?.partner || [])
        setFlowers(f.flowers || [])
        setWishes(w.items?.mine || [])
        setPartnerWishes(w.items?.partner || [])
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const setMoodNow = async (emoji: string) => {
    const res = await fetch('/api/mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji, text: moodText || undefined }),
    })
    const data = await res.json()
    if (data.mood) setMood(data.mood)
  }

  const addCraving = async () => {
    if (!cravingInput.trim()) return
    const res = await fetch('/api/cravings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: cravingInput.trim() }),
    })
    if (res.ok) {
      loadAll()
      setCravingInput('')
    }
  }

  const pickCraving = async (id: string, action: 'pick' | 'unpick') => {
    await fetch(`/api/cravings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    loadAll()
  }

  const deleteCraving = async (id: string) => {
    await fetch(`/api/cravings/${id}`, { method: 'DELETE' })
    loadAll()
  }

  const toggleFlower = async (slug: string) => {
    await fetch('/api/flowers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    })
    loadAll()
  }

  const addWish = async () => {
    if (!wishTitle.trim()) return
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: wishTitle.trim(),
        link: wishLink.trim() || undefined,
        priceRange: wishPrice.trim() || undefined,
      }),
    })
    if (res.ok) {
      loadAll()
      setWishTitle('')
      setWishLink('')
      setWishPrice('')
    }
  }

  const markWish = async (id: string, status: string) => {
    await fetch(`/api/wishlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    loadAll()
  }

  const deleteWish = async (id: string) => {
    await fetch(`/api/wishlist/${id}`, { method: 'DELETE' })
    loadAll()
  }

  const myFavoriteCount = flowers.filter((f) => f.favorite).length

  return (
    <DashboardLayout user={{ name: null, email: '' }} couple={null}>
      <div className="h1">Партнёр</div>
      <div className="dim">Расскажите о себе — партнёр перестанет угадывать, что вам дарить.</div>

      {loading ? (
        <div className="loading-screen">
          <div className="loading-icon">💐</div>
          <div className="loading-text">Загружаем данные партнёра</div>
        </div>
      ) : (
        <>
          <div className="cd static mt">
            <div className="cd-r">
              <div className="cd-ic" style={{ fontSize: 30 }}>{partnerMood?.emoji || '💙'}</div>
              <div className="cd-t">
                {partnerMood ? (
                  <>
                    <b>У партнёра сейчас {partnerMood.text || 'настроение'}</b>
                    {partnerMood.text && <span>«{partnerMood.text}»</span>}
                  </>
                ) : (
                  <b>Партнёр ещё не указал настроение</b>
                )}
              </div>
            </div>
          </div>

          <div className="tabs mt">
            {TABS.map((t) => (
              <button key={t.key} className={cn('tab-btn', tab === t.key && 'on')} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'mood' && (
            <div className="cd static mt">
              <div className="cd-t" style={{ padding: 0 }}>
                <b>Моё настроение</b>
                <span>Нажмите на emoji — партнёр сразу увидит ваш статус</span>
              </div>
              <div className="mood-pick" style={{ marginTop: 12 }}>
                {MOODS.map((m) => (
                  <button
                    key={m.emoji}
                    className={mood?.emoji === m.emoji ? 'mood-opt on' : 'mood-opt'}
                    onClick={() => setMoodNow(m.emoji)}
                    aria-pressed={mood?.emoji === m.emoji}
                    aria-label={m.label}
                  >
                    <i>{m.emoji}</i>
                    <b>{m.label}</b>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <input
                  className="input"
                  value={moodText}
                  onChange={(e) => setMoodText(e.target.value)}
                  onBlur={() => mood && setMoodNow(mood.emoji)}
                  placeholder="Пара слов о настроении (необязательно)"
                  maxLength={100}
                />
                <button className="btn btn-s" onClick={() => mood && setMoodNow(mood.emoji)}>Сохранить</button>
              </div>
              {mood && (
                <div className="small" style={{ marginTop: 10, color: 'var(--dim)' }}>
                  Текущий статус: {mood.emoji} {mood.text && `— «${mood.text}»`}
                </div>
              )}
            </div>
          )}

          {tab === 'cravings' && (
            <>
              <div className="cd static mt">
                <div className="cd-t" style={{ padding: 0 }}>
                  <b>Мои хотелки-мелочи</b>
                  <span>«Хочу шоколадку по дороге домой» — партнёр отметит «взял(а)»</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <input
                    className="input"
                    value={cravingInput}
                    onChange={(e) => setCravingInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCraving()}
                    placeholder="Например: шоколадка, свежий кофе…"
                  />
                  <button className="btn btn-p" onClick={addCraving}>+ Добавить</button>
                </div>
                <div className="feed" style={{ marginTop: 12 }}>
                  {cravings.map((c) => (
                    <div key={c.id} className="feed-item">
                      <b className={cn(c.status === 'PICKED_UP' && 'line-through')}>{c.item}</b>
                      <span>
                        {c.status === 'PICKED_UP' ? <span className="badge ok">Взял(а)</span> : <span className="badge pri">ожидает</span>}
                      </span>
                      <button className="icon-btn" onClick={() => deleteCraving(c.id)} aria-label="Удалить">🗑</button>
                    </div>
                  ))}
                  {cravings.length === 0 && <div className="dim">Пока пусто. Добавьте первую хотелку 🍫</div>}
                </div>
              </div>

              {partnerCravings.length > 0 && (
                <div className="cd static mt">
                  <div className="cd-t" style={{ padding: 0 }}>
                    <b>Хотелки партнёра — захватить по дороге</b>
                  </div>
                  <div className="feed" style={{ marginTop: 12 }}>
                    {partnerCravings.map((c) => (
                      <div key={c.id} className="feed-item">
                        <b className={cn(c.status === 'PICKED_UP' && 'line-through')}>{c.item}</b>
                        {c.status === 'PICKED_UP' ? (
                          <span className="badge ok">Уже взял(а)</span>
                        ) : (
                          <button className="btn btn-s btn-sm" onClick={() => pickCraving(c.id, 'pick')}>Взял(а)!</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'flowers' && (
            <div className="cd static mt">
              <div className="cd-t" style={{ padding: 0 }}>
                <b>Любимые цветы ({myFavoriteCount})</b>
                <span>Отметьте любимые — партнёр не ошибётся с букетом</span>
              </div>
              <div className="flower-grid" style={{ marginTop: 12 }}>
                {flowers.map((f) => (
                  <button
                    key={f.slug}
                    className={cn('flower-cell', f.favorite && 'sel')}
                    onClick={() => toggleFlower(f.slug)}
                    aria-pressed={f.favorite}
                  >
                    <i>{f.emoji}</i>
                    <b>{f.name}</b>
                    {f.favorite && <span>Мой любимый</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'wishlist' && (
            <>
              <div className="cd static mt">
                <div className="cd-t" style={{ padding: 0 }}>
                  <b>Мой виш-лист</b>
                  <span>Добавьте желание, можно со ссылкой</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  <input className="input" value={wishTitle} onChange={(e) => setWishTitle(e.target.value)} placeholder="Что хотите? (зелёная кофемолка…)" />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input" value={wishLink} onChange={(e) => setWishLink(e.target.value)} placeholder="Ссылка (Ozon, WB…)" style={{ flex: 1 }} />
                    <input className="input" value={wishPrice} onChange={(e) => setWishPrice(e.target.value)} placeholder="Цена" style={{ width: 110 }} />
                  </div>
                  <button className="btn btn-p" onClick={addWish}>+ Добавить</button>
                </div>
                <div className="feed" style={{ marginTop: 12 }}>
                  {wishes.map((w) => (
                    <div key={w.id} className="feed-item">
                      <b className={cn(w.status === 'BOUGHT' && 'line-through')}>{w.title}</b>
                      <span className="small">
                        {w.priceRange && `${w.priceRange} · `}
                        {w.status === 'BOUGHT' ? <span className="badge ok">Подарен(а)</span> : <span className="badge pri">Хочу</span>}
                        {w.link && (
                          <a href={w.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--pri)', marginLeft: 8 }}>Ссылка</a>
                        )}
                      </span>
                      <button className="icon-btn" onClick={() => deleteWish(w.id)} aria-label="Удалить">🗑</button>
                    </div>
                  ))}
                  {wishes.length === 0 && <div className="dim">Виш-лист пуст — добавьте первое желание 🎁</div>}
                </div>
              </div>

              {partnerWishes.length > 0 && (
                <div className="cd static mt">
                  <div className="cd-t" style={{ padding: 0 }}>
                    <b>Желания партнёра</b>
                  </div>
                  <div className="feed" style={{ marginTop: 12 }}>
                    {partnerWishes.map((w) => (
                      <div key={w.id} className="feed-item">
                        <b className={cn(w.status === 'BOUGHT' && 'line-through')}>{w.title}</b>
                        {w.status === 'BOUGHT' ? (
                          <span className="badge ok">Подарен(а)</span>
                        ) : (
                          <button className="btn btn-s btn-sm" onClick={() => markWish(w.id, 'BOUGHT')}>Подарил(а)!</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </DashboardLayout>
  )
}
