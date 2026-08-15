'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { MapPin, Search, Heart, Star, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const VENUE_TYPE_LABELS: Record<string, string> = {
  RESTAURANT: 'Рестораны',
  CAFE: 'Кафе',
  BAR: 'Бары',
  PARK: 'Парки',
  WALK: 'Прогулки',
  MUSEUM: 'Музеи',
  CINEMA: 'Кино',
  SPA: 'СПА',
}

const PRICE_LABELS: Record<number, string> = {
  1: '💵 доступно',
  2: '💵💵 средне',
  3: '💵💵💵 дорого',
  4: '💵💵💵💵 премиум',
}

interface City {
  id: string
  slug: string
  name: string
  emoji: string
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
  const [cities, setCities] = useState<City[]>([])
  const [myCity, setMyCity] = useState<City | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [needsCity, setNeedsCity] = useState(false)
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null)
  const [type, setType] = useState<string | null>(null)
  const [maxPrice, setMaxPrice] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const [c, p] = await Promise.all([
          fetch('/api/cities').then((r) => r.json()),
          fetch('/api/user/profile').then((r) => r.json()),
        ])
        const list = c.cities || []
        setCities(list)
        const userCity = p.user?.city || null
        setMyCity(userCity)
        setSelectedCityId(userCity?.id || null)
      } catch (e) {
        console.error('load cities failed', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const loadVenues = useMemo(() => async () => {
    if (!selectedCityId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ cityId: selectedCityId })
      if (type) params.set('type', type)
      if (maxPrice) params.set('price', maxPrice)
      if (query.trim()) params.set('query', query.trim())
      const res = await fetch(`/api/venues?${params}`)
      const data = await res.json()
      setVenues(data.venues || [])
      setNeedsCity(!!data.needsCity)
    } catch (e) {
      console.error('load venues failed', e)
    } finally {
      setLoading(false)
    }
  }, [selectedCityId, type, maxPrice, query])

  useEffect(() => {
    if (selectedCityId) {
      const timer = setTimeout(loadVenues, 0)
      return () => clearTimeout(timer)
    }
  }, [selectedCityId, type, maxPrice, loadVenues])

  const saveCity = async (cityId: string) => {
    setSaving(true)
    try {
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cityId }),
      })
      const city = cities.find((c) => c.id === cityId) || null
      setMyCity(city)
      setSelectedCityId(cityId)
    } catch (e) {
      console.error('save city failed', e)
    } finally {
      setSaving(false)
    }
  }

  const clearQuery = () => setQuery('')

  return (
    <DashboardLayout user={{ name: null, email: '', image: null }} couple={null}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">Куда пойти вдвоём</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Рестораны, кафе и места для прогулок в вашем городе. Под фильтр, а не «куда-нибудь».
            </p>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-rose-500" aria-hidden="true" />
            <select
              aria-label="Выбрать город"
              value={selectedCityId || ''}
              onChange={(e) => saveCity(e.target.value)}
              disabled={saving}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-950 dark:text-slate-50 disabled:opacity-50"
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
        </div>

        {needsCity && !selectedCityId && (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Выберите город вверху — покажем подборку мест для свиданий.
              </p>
            </CardContent>
          </Card>
        )}

        {selectedCityId && (
          <>
            {/* Фильтры */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={type === null ? 'default' : 'outline'}
                    onClick={() => setType(null)}
                    className={type === null ? 'bg-rose-500 hover:bg-rose-600 text-white' : ''}
                  >
                    Все
                  </Button>
                  {Object.entries(VENUE_TYPE_LABELS).map(([key, label]) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={type === key ? 'default' : 'outline'}
                      onClick={() => setType(type === key ? null : key)}
                      className={type === key ? 'bg-rose-500 hover:bg-rose-600 text-white' : ''}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    aria-label="Максимальная цена"
                    value={maxPrice || ''}
                    onChange={(e) => setMaxPrice(e.target.value || null)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-950 dark:text-slate-50"
                  >
                    <option value="">Любая цена</option>
                    {[1, 2, 3, 4].map((p) => (
                      <option key={p} value={p}>
                        {PRICE_LABELS[p]}
                      </option>
                    ))}
                  </select>
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Поиск по названию"
                      className="pl-9"
                    />
                    {query && (
                      <button
                        onClick={clearQuery}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label="Очистить поиск"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Список мест */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-rose-500" aria-hidden="true" />
                <span className="sr-only">Загрузка мест</span>
              </div>
            ) : venues.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-10">
                  <p className="text-slate-500 dark:text-slate-400">Под такие фильтры ничего не нашлось.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {venues.map((v) => (
                  <Card key={v.id} className="flex flex-col overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-4xl" aria-hidden="true">{v.emoji}</div>
                        {v.romantic && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-950/40 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                            <Heart className="h-3 w-3" aria-hidden="true" />
                            романтично
                          </span>
                        )}
                      </div>
                      <CardTitle className="mt-2">{v.name}</CardTitle>
                      <CardDescription>
                        {VENUE_TYPE_LABELS[v.type] || v.type}
                        {v.area ? ` · ${v.area}` : ''}
                        {v.address ? ` · ${v.address}` : ''}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-3 pt-2">
                      {v.description && <p className="text-sm text-slate-600 dark:text-slate-400">{v.description}</p>}
                      {v.recommendation && (
                        <p className="text-sm italic text-slate-500 dark:text-slate-400">«{v.recommendation}»</p>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-500 dark:text-slate-400">{PRICE_LABELS[v.priceLevel]}</span>
                        <Star className={cn('h-4 w-4', v.romantic ? 'text-rose-400' : 'text-slate-300 dark:text-slate-600')} aria-hidden="true" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}