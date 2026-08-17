'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

interface Venue {
  id: string
  name: string
  address: string | null
  phone: string | null
  comment: string | null
  avgRating: number | null
  ratingsCount: number
  picks: number
  addedBy: string
  isNew: boolean
}

export default function VenuesPage() {
  const [city, setCity] = useState<string>('')
  const [dish, setDish] = useState<string>('')
  const [top, setTop] = useState<Venue[]>([])
  const [fresh, setFresh] = useState<Venue[]>([])

  const loadVenues = async () => {
    if (!city) return
    try {
      const res = await fetch(`/api/venues?city=${encodeURIComponent(city)}&dish=${encodeURIComponent(dish)}`)
      const data = await res.json()
      setTop(data.top || [])
      setFresh(data.fresh || [])
    } catch (e) {
      console.error('Failed to load venues:', e)
    }
  }

  const handleAdd = () => {
    alert('Функция добавления заведения будет доступна позже')
  }

  return (
    <DashboardLayout>
      <div className="h1">Куда поесть? · {city || ''} · {dish || ''}</div>

      <div className="cd static" style={{ marginBottom: 20 }}>
        <div className="cd-r">
          <div className="cd-ic">🏙️</div>
          <div className="cd-t">
            <b>Город</b>
            <input
              type="text"
              placeholder="Например: Томск"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={!!top.length}
              style={{ width: '100%' }}
            />
          </div>
          <span className="arr">›</span>
        </div>
        <div className="cd-r" style={{ paddingLeft: 12 }}>
          <div className="cd-ic">🍽️</div>
          <div className="cd-t">
            <b>Блюдо</b>
            <input
              type="text"
              placeholder="Например: роллы"
              value={dish}
              onChange={(e) => setDish(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div>
        {top.length > 0 && (
          <div>
            <div className="k">Лучшие venue (≥4.3)</div>
            <div className="venue-list">
              {top.map((v) => {
                const ratingOk = v.avgRating != null && v.avgRating >= 4.7
                return (
                  <div
                    key={v.id}
                    className="ven"
                    onClick={() => alert(`Выбрано: ${v.name}`)}
                  >
                    <div className="ven-ic">🍽️</div>
                    <div className="ven-t">
                      <b>{v.name}</b>
                      <span>{v.address || ''} · добавил {v.addedBy}</span>
                    </div>
                    <span className={ratingOk ? 'rate good' : 'rate'}>
                      {v.avgRating?.toFixed(1)}★ {v.ratingsCount} оценок
                    </span>
                    <button className="btn btn-s btn-sm" onClick={handleAdd}>★ Оценить</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {fresh.length > 0 && (
          <div>
            <div className="k">Новые · без рейтинга</div>
            <div className="venue-list">
              {fresh.map((v) => (
                <div key={v.id} className="ven">
                  <div className="ven-ic">🆕</div>
                  <div className="ven-t">
                    <b>{v.name}</b>
                    <span>{v.address || ''} · добавил {v.addedBy}</span>
                  </div>
                  <span className="rate new">новое</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button className="btn btn-s btn-w" onClick={handleAdd}>
            + Добавить заведение
          </button>
          <span className="dim">Будьте primeros в городе</span>
        </div>
      </div>
    </DashboardLayout>
  )
}
