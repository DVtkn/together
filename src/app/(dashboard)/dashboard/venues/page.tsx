'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { cn } from '@/lib/utils/cn'
import { useCities, useProfile } from '@/lib/hooks'
import useSWR from 'swr'

const VENUE_TYPE_LABELS: Record<string, string> = {
  RESTAURANT: '🍽 Рестораны',
  CAFE: '☕ Кафе',
  BAR: '🍸 Бары',
  PARK: '🌳 Парки',
  WALK: '🚶 Прогулки',
  MUSEUM: '🖼 Музеи',
  CINEMA: '🎬 Кино',
  SPA: '💆 СПА',
}

const PRICE_LABELS: Record<number, string> = {
  1: '💵 доступно',
  2: '💵💵 средне',
  3: '💵💵💵 дорого',
  4: '💵💵💵💵 премиум',
}

interface Venue {
  id: string
  type: string
  name: string
  description: string | null
  emoji: string
  area: string | null
  address: string | null
  priceLevel: number
  romantic: boolean
  recommendation: string | null
}

export default function VenuesPage() {
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null)
  const [type, setType] = useState<string | null>(null)
  const [maxPrice, setMaxPrice] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: citiesData } = useCities()
  const { data: profileData } = useProfile()

  const cities = citiesData?.cities || []
  const userCity = profileData?.user?.city || null

  // Инициализация выбранного города из профиля (adjust-state-during-render)
  if (userCity?.id && selectedCityId === null) {
    setSelectedCityId(userCity.id)
  }

  const params = new URLSearchParams()
  if (selectedCityId) params.set('cityId', selectedCityId)
  if (type) params.set('type', type)
  if (maxPrice) params.set('price', maxPrice)
  if (query.trim()) params.set('query', query.trim())

  const { data: venuesData, isLoading: loading } = useSWR<{ venues: Venue[]; needsCity?: boolean }>(
    selectedCityId ? `/api/venues?${params.toString()}` : null
  )

  const venues = venuesData?.venues || []
  const needsCity = venuesData?.needsCity ?? false
  const myCity = selectedCityId ? (cities.find((c) => c.id === selectedCityId) ?? userCity) : userCity

  const saveCity = async (cityId: string) => {
    setSaving(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cityId }),
      })
      if (res.ok) setSelectedCityId(cityId || null)
    } catch (e) {
      console.error('save city failed', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout user={{ name: null, email: '' }} couple={null}>
      <div className="h1">Куда пойти вдвоём</div>
      <div className="dim">Рестораны, кафе и прогулки. Под фильтр, а не «куда-нибудь».</div>

      <div className="mt" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <b className="small">Город:</b>
        <select
          aria-label="Выбрать город"
          value={selectedCityId || ''}
          onChange={(e) => saveCity(e.target.value)}
          disabled={saving}
          className="input"
          style={{ flex: 1, minWidth: 180 }}
        >
          <option value="">{myCity ? myCity.name : 'Выберите город'}</option>
          {cities
            .filter((c) => c.id !== myCity?.id)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
        </select>
      </div>

      {needsCity && !selectedCityId && (
        <div className="notice notice-amber mt">
          <span style={{ fontSize: 20 }} aria-hidden="true">📍</span>
          <div>Выберите город вверху — покажем подборку мест для свиданий.</div>
        </div>
      )}

      {selectedCityId && (
        <>
          <div className="chips mt">
            <button className={cn('chip', type === null && 'sel')} onClick={() => setType(null)}>Все</button>
            {Object.entries(VENUE_TYPE_LABELS).map(([key, label]) => (
              <button key={key} className={cn('chip', type === key && 'sel')} onClick={() => setType(type === key ? null : key)}>
                {label}
              </button>
            ))}
          </div>

          <div className="mt" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              aria-label="Максимальная цена"
              value={maxPrice || ''}
              onChange={(e) => setMaxPrice(e.target.value || null)}
              className="input"
              style={{ flex: 1, minWidth: 150 }}
            >
              <option value="">Любая цена</option>
              {[1, 2, 3, 4].map((p) => (
                <option key={p} value={p}>{PRICE_LABELS[p]}</option>
              ))}
            </select>
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 Поиск по названию"
              style={{ flex: 2, minWidth: 180 }}
            />
          </div>

          {loading ? (
            <div className="loading-screen" style={{ paddingTop: 60 }}>
              <div className="loading-text">Ищем места…</div>
            </div>
          ) : venues.length === 0 ? (
            <div className="empty mt">
              <i>🔍</i>
              <div className="dim">Под такие фильтры ничего не нашлось.</div>
            </div>
          ) : (
            <div className="ven-grid mt">
              {venues.map((v) => (
                <div key={v.id} className="cd static">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: 32 }} aria-hidden="true">{v.emoji}</div>
                    {v.romantic && <span className="badge pri">💗 романтично</span>}
                  </div>
                  <b style={{ fontSize: 15, marginTop: 8, display: 'block' }}>{v.name}</b>
                  <div className="small" style={{ marginTop: 2 }}>
                    {VENUE_TYPE_LABELS[v.type] || v.type}
                    {v.area ? ` · ${v.area}` : ''}
                  </div>
                  {v.description && <p style={{ fontSize: 13, color: 'var(--dim)', marginTop: 8, lineHeight: 1.5 }}>{v.description}</p>}
                  {v.recommendation && (
                    <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--mute)', marginTop: 6 }}>«{v.recommendation}»</p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)', fontSize: 13 }}>
                    <span style={{ color: 'var(--dim)' }}>{PRICE_LABELS[v.priceLevel]}</span>
                    {v.address && <span className="small" style={{ color: 'var(--mute)' }}>{v.address}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  )
}
