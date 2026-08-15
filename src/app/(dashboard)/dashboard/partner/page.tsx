'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import {
  Heart,
  Plus,
  Trash2,
  Smile,
  Gift,
  Flower2,
  ShoppingBag,
  CheckCircle2,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react'
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

interface Flower {
  slug: string
  name: string
  emoji: string
  meaning: string | null
  favorite: boolean
}

export default function PartnerPage() {
  const [tab, setTab] = useState('mood')
  const [mood, setMood] = useState<{ emoji: string; text: string | null } | null>(null)
  const [partnerMood, setPartnerMood] = useState<{ emoji: string; text: string | null } | null>(null)
  const [moodText, setMoodText] = useState('')

  const [cravings, setCravings] = useState<{ id: string; item: string; status: string }[]>([])
  const [partnerCravings, setPartnerCravings] = useState<{ id: string; item: string; status: string }[]>([])
  const [cravingInput, setCravingInput] = useState('')

  const [flowers, setFlowers] = useState<Flower[]>([])

  const [wishes, setWishes] = useState<{ id: string; title: string; link: string | null; status: string; priceRange: string | null }[]>([])
  const [partnerWishes, setPartnerWishes] = useState<{ id: string; title: string; link: string | null; status: string }[]>([])
  const [wishTitle, setWishTitle] = useState('')
  const [wishLink, setWishLink] = useState('')
  const [wishPrice, setWishPrice] = useState('')

  const [loading, setLoading] = useState(true)

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
    const timer = setTimeout(loadAll, 0)
    return () => clearTimeout(timer)
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

  const saveMoodText = async () => {
    const emoji = mood?.emoji || '🙂'
    await fetch('/api/mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji, text: moodText || undefined }),
    })
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
    <DashboardLayout user={{ name: null, email: '', image: null }} couple={null}>
      <div className="space-y-6">
        {loading && (
          <Card>
            <CardContent className="pt-6 flex justify-center py-12">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span>Загружаем данные партнёра...</span>
              </div>
            </CardContent>
          </Card>
        )}
        {!loading && (
        <>
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">База знаний о партнёре</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Расскажите о себе — партнёр увидит и перестанет угадывать, что вам дарить.
          </p>
        </div>

        {/* Mood banner */}
        <Card className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="text-5xl">{partnerMood?.emoji || '💙'}</div>
                <div>
                  {partnerMood ? (
                    <>
                      <p className="font-medium text-slate-950 dark:text-slate-50">
                        У партнёра сейчас {partnerMood.emoji} {partnerMood.text || 'настроение'}
                      </p>
                      {partnerMood.text && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">«{partnerMood.text}»</p>
                      )}
                    </>
                  ) : (
                    <p className="font-medium text-slate-950 dark:text-slate-50">Партнёр ещё не указал настроение</p>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setTab('mood')}>
                Установить своё
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="mood">Настроение</TabsTrigger>
            <TabsTrigger value="cravings">Хотелки</TabsTrigger>
            <TabsTrigger value="flowers">Цветы</TabsTrigger>
            <TabsTrigger value="wishlist">Виш-лист</TabsTrigger>
          </TabsList>

          {/* MOOD */}
          <TabsContent value="mood" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smile className="h-5 w-5 text-rose-500" aria-hidden="true" />
                  Моё настроение
                </CardTitle>
                <CardDescription>Нажмите на emoji — партнёр сразу увидит ваш статус</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {MOODS.map((m) => (
                    <button
                      key={m.emoji}
                      onClick={() => setMoodNow(m.emoji)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-xl border transition-colors text-2xl',
                        mood?.emoji === m.emoji
                          ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/30'
                          : 'border-slate-200 hover:border-rose-200 dark:border-slate-700'
                      )}
                      aria-label={m.label}
                    >
                      <span>{m.emoji}</span>
                      <span className="text-[10px] text-slate-500">{m.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={moodText}
                    onChange={(e) => setMoodText(e.target.value)}
                    placeholder="Пара слов о настроении (необязательно)"
                    maxLength={100}
                  />
                  <Button onClick={saveMoodText} variant="outline" className="shrink-0">
                    Сохранить
                  </Button>
                </div>
                {mood && (
                  <p className="mt-3 text-sm text-slate-500">
                    Текущий статус: {mood.emoji} {mood.text && `— «${mood.text}»`}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CRAVINGS */}
          <TabsContent value="cravings" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-rose-500" aria-hidden="true" />
                  Мои хотелки-мелочи
                </CardTitle>
                <CardDescription>
                  «Хочу шоколадку по дороге домой» — партнёр увидит карточку и отметит «взял(а)»
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input
                    value={cravingInput}
                    onChange={(e) => setCravingInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCraving()}
                    placeholder="Например: шоколадка, свежий кофе, мягкие кроссовки..."
                  />
                  <Button onClick={addCraving} className="shrink-0">
                    <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                    Добавить
                  </Button>
                </div>
                <div className="space-y-2">
                  {cravings.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                      {c.status === 'PICKED_UP' ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" aria-hidden="true" />
                      ) : (
                        <Heart className="h-5 w-5 text-rose-400 shrink-0" aria-hidden="true" />
                      )}
                      <span className={cn('flex-1', c.status === 'PICKED_UP' && 'line-through opacity-60')}>{c.item}</span>
                      {c.status === 'PICKED_UP' && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Взял(а)</span>}
                      <Button variant="ghost" size="icon" onClick={() => deleteCraving(c.id)} aria-label="Удалить">
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  ))}
                  {cravings.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-6">Пока пусто. Добавьте первую хотелку 🍫</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {partnerCravings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Хотелки партнёра — что можно захватить по дороге</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {partnerCravings.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30">
                      <span className={cn('flex-1', c.status === 'PICKED_UP' && 'line-through opacity-60')}>{c.item}</span>
                      {c.status === 'PICKED_UP' ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Уже взял(а)</span>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => pickCraving(c.id, 'pick')}>
                          Взял(а)!
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* FLOWERS */}
          <TabsContent value="flowers" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flower2 className="h-5 w-5 text-rose-500" aria-hidden="true" />
                  Любимые цветы ({myFavoriteCount})
                </CardTitle>
                <CardDescription>
                  Отметьте любимые цветы, чтобы партнёр точно не ошибся с букетом.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                  {flowers.map((f) => (
                    <button
                      key={f.slug}
                      onClick={() => toggleFlower(f.slug)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-center',
                        f.favorite
                          ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/30 shadow-sm'
                          : 'border-slate-200 hover:border-rose-200 dark:border-slate-700'
                      )}
                    >
                      <span className="text-3xl">{f.emoji}</span>
                      <span className="text-xs font-medium text-slate-950 dark:text-slate-50">{f.name}</span>
                      {f.favorite && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Мой любимый</span>}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WISHLIST */}
          <TabsContent value="wishlist" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-rose-500" aria-hidden="true" />
                  Мой виш-лист
                </CardTitle>
                <CardDescription>
                  Добавьте желание, можно со ссылкой. Партнёр увидит и сможет отметить «подарено».
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <Input value={wishTitle} onChange={(e) => setWishTitle(e.target.value)} placeholder="Что хотите? (зелёная кофемолка, книга...)" />
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                      <Input value={wishLink} onChange={(e) => setWishLink(e.target.value)} placeholder="Ссылка (Ozon, Wildberries...)" className="pl-9" />
                    </div>
                    <Input value={wishPrice} onChange={(e) => setWishPrice(e.target.value)} placeholder="Цена" className="w-28" />
                    <Button onClick={addWish} className="shrink-0">
                      <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                      Добавить
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {wishes.map((w) => (
                    <div key={w.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <Gift className="h-5 w-5 text-rose-400 shrink-0" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className={cn('font-medium truncate', w.status === 'BOUGHT' && 'line-through opacity-60')}>{w.title}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {w.priceRange && `${w.priceRange} · `}
                          {w.status === 'WANTED' ? 'Хочу' : w.status === 'BOUGHT' ? 'Подарен(a)' : w.status === 'LATE' ? 'С опозданием' : 'Отменено'}
                        </p>
                      </div>
                      {w.link && (
                        <a href={w.link} target="_blank" rel="noopener noreferrer" className="text-xs text-rose-500 hover:underline shrink-0">
                          Ссылка
                        </a>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => deleteWish(w.id)} aria-label="Удалить">
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  ))}
                  {wishes.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-6">Виш-лист пуст — добавьте первое желание 🎁</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {partnerWishes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Желания партнёра</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {partnerWishes.map((w) => (
                    <div key={w.id} className="flex items-center gap-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30">
                      <Gift className="h-5 w-5 text-rose-400 shrink-0" aria-hidden="true" />
                      <span className={cn('flex-1 truncate', w.status === 'BOUGHT' && 'line-through opacity-60')}>{w.title}</span>
                      {w.status === 'BOUGHT' ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Подарен(a)</span>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => markWish(w.id, 'BOUGHT')}>
                          Подарил(а)!
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
        </>
        )}
      </div>
    </DashboardLayout>
  )
}