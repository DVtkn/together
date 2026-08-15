'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Heart, HeartPulse, Calendar, Loader2, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'

interface PulseData {
  checkins: Array<{
    year: number
    weekNumber: number
    user: { closeness: number; conflictResolution: number; missing: string | null } | null
    partner: { closeness: number; conflictResolution: number; missing: string | null } | null
  }>
}

export default function PulsePage() {
  const [data, setData] = useState<PulseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0)
  const [closeness, setCloseness] = useState(5)
  const [conflictResolution, setConflictResolution] = useState(5)
  const [missing, setMissing] = useState('')

  useEffect(() => {
    fetch('/api/pulse')
      .then((res) => res.json())
      .then((json: PulseData) => {
        setData(json)
        setLoading(false)
        // Find current week
        const now = new Date()
        const currentWeek = json.checkins.findIndex(
          (c) => c.year === now.getFullYear() && c.weekNumber === Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (24 * 60 * 60 * 1000) / 7) + 1
        )
        if (currentWeek >= 0) setCurrentWeekIndex(currentWeek)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await fetch('/api/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closeness, conflictResolution, missing: missing || undefined }),
      })
      // Refresh data
      const res = await fetch('/api/pulse')
      const json = await res.json()
      setData(json)
      setMissing('')
    } catch (e) {
      console.error('Submit failed:', e)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout user={{ name: null, email: '', image: null }} couple={null}>
        <div className="space-y-6">
          <Card className="animate-pulse"><CardContent className="pt-6 h-48" /></Card>
          <Card className="animate-pulse"><CardContent className="pt-6 h-48" /></Card>
        </div>
      </DashboardLayout>
    )
  }

  if (!data?.checkins?.length) {
    return (
      <DashboardLayout user={{ name: null, email: '', image: null }} couple={null}>
        <div className="max-w-2xl mx-auto text-center py-12">
          <HeartPulse className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50 mb-2">Пульс отношений</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">Раз в неделю три коротких вопроса — и видно, куда движется ваша пара.</p>
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Заполнить пульс на этой неделе</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Насколько вы чувствовали близость на этой неделе? (1–10)</Label>
                <Input type="range" min={1} max={10} value={closeness} onChange={(e) => setCloseness(Number(e.target.value))} className="mt-2" />
                <div className="text-center text-2xl font-bold text-rose-500 mt-1">{closeness}</div>
              </div>
              <div>
                <Label>Насколько спокойно решались разногласия? (1–10)</Label>
                <Input type="range" min={1} max={10} value={conflictResolution} onChange={(e) => setConflictResolution(Number(e.target.value))} className="mt-2" />
                <div className="text-center text-2xl font-bold text-blue-500 mt-1">{conflictResolution}</div>
              </div>
              <div>
                <Label htmlFor="missing">Чего не хватило на этой неделе? (опционально)</Label>
                <Textarea id="missing" value={missing} onChange={(e) => setMissing(e.target.value)} placeholder="Например: больше времени вдвоём, поддержки, понимания..." rows={3} />
              </div>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  const weeks = data.checkins
  const currentWeek = weeks[currentWeekIndex]
  const userCurrent = currentWeek?.user

  // Calculate trends
  const userClosenessValues = weeks.map((w) => w.user?.closeness).filter((v): v is number => v !== null)
  const userConflictValues = weeks.map((w) => w.user?.conflictResolution).filter((v): v is number => v !== null)
  const avgCloseness = userClosenessValues.length ? userClosenessValues.reduce((a, b) => a + b, 0) / userClosenessValues.length : 0
  const avgConflict = userConflictValues.length ? userConflictValues.reduce((a, b) => a + b, 0) / userConflictValues.length : 0
  const trendCloseness = userClosenessValues.length > 1 ? userClosenessValues[userClosenessValues.length - 1] - userClosenessValues[0] : 0
  const trendConflict = userConflictValues.length > 1 ? userConflictValues[userConflictValues.length - 1] - userConflictValues[0] : 0

  return (
    <DashboardLayout user={{ name: null, email: '', image: null }} couple={null}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-950 dark:text-slate-50">Пульс отношений</h1>
            <p className="text-slate-600 dark:text-slate-400">Еженедельные чек-ины для отслеживания динамики</p>
          </div>
        </div>

        {/* Current Week Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>На этой неделе</CardTitle>
            <CardDescription>Три вопроса — займёт около 30 секунд</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>Близость (1–10)</Label>
                <Input type="range" min={1} max={10} value={closeness} onChange={(e) => setCloseness(Number(e.target.value))} className="mt-2" />
                <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400 mt-1">
                  <span>1 — Далеко</span>
                  <span className="font-bold text-rose-500">{closeness}</span>
                  <span>10 — Очень близко</span>
                </div>
              </div>
              <div>
                <Label>Конструктивность конфликтов (1–10)</Label>
                <Input type="range" min={1} max={10} value={conflictResolution} onChange={(e) => setConflictResolution(Number(e.target.value))} className="mt-2" />
                <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400 mt-1">
                  <span>1 — Деструктивно</span>
                  <span className="font-bold text-blue-500">{conflictResolution}</span>
                  <span>10 — Полностью конструктивно</span>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="missing">Чего не хватило на этой неделе? (опционально)</Label>
              <Textarea id="missing" value={missing} onChange={(e) => setMissing(e.target.value)} placeholder="Например: больше качественного времени, поддержки, понимания..." rows={3} />
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Сохранение...</> : userCurrent ? 'Обновить' : 'Сохранить'}
            </Button>
            {userCurrent && (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                Уже заполнено: близость {userCurrent.closeness}/10, конфликты {userCurrent.conflictResolution}/10
              </p>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Средняя близость</p>
                  <p className="text-3xl font-bold text-rose-500">{avgCloseness.toFixed(1)} / 10</p>
                </div>
                <Heart className="h-8 w-8 text-rose-500" aria-hidden="true" />
              </div>
              {trendCloseness !== 0 && (
                <div className="mt-2 flex items-center gap-1 text-sm">
                  <TrendingUp className={cn('h-4 w-4', trendCloseness > 0 ? 'text-emerald-500' : 'text-red-500')} aria-hidden="true" />
                  <span className={cn(trendCloseness > 0 ? 'text-emerald-500' : 'text-red-500')}>
                    {trendCloseness > 0 ? '+' : ''}{trendCloseness.toFixed(1)} за период
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Средняя конструктивность</p>
                  <p className="text-3xl font-bold text-blue-500">{avgConflict.toFixed(1)} / 10</p>
                </div>
                <HeartPulse className="h-8 w-8 text-blue-500" aria-hidden="true" />
              </div>
              {trendConflict !== 0 && (
                <div className="mt-2 flex items-center gap-1 text-sm">
                  <TrendingUp className={cn('h-4 w-4', trendConflict > 0 ? 'text-emerald-500' : 'text-red-500')} aria-hidden="true" />
                  <span className={cn(trendConflict > 0 ? 'text-emerald-500' : 'text-red-500')}>
                    {trendConflict > 0 ? '+' : ''}{trendConflict.toFixed(1)} за период
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Недель заполнено</p>
                  <p className="text-3xl font-bold text-slate-950 dark:text-slate-50">{weeks.filter((w) => w.user).length}</p>
                </div>
                <Calendar className="h-8 w-8 text-slate-500" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Текущая неделя</p>
                  <p className="text-lg font-bold text-slate-950 dark:text-slate-50">
                    {currentWeek ? `${format(startOfWeek(new Date(currentWeek.year, 0, 1 + (currentWeek.weekNumber - 1) * 7), { weekStartsOn: 1 }), 'd MMM', { locale: ru })} — ${format(endOfWeek(new Date(currentWeek.year, 0, 1 + (currentWeek.weekNumber - 1) * 7), { weekStartsOn: 1 }), 'd MMM', { locale: ru })}` : '—'}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-slate-500" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Динамика близости (12 недель)</CardTitle>
            </CardHeader>
            <CardContent>
              <PulseChart
                data={weeks.slice(-12).map((w) => ({
                  label: `${w.weekNumber}`,
                  user: w.user?.closeness || null,
                  partner: w.partner?.closeness || null,
                }))}
                color="rose"
                max={10}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Динамика конструктивности конфликтов</CardTitle>
            </CardHeader>
            <CardContent>
              <PulseChart
                data={weeks.slice(-12).map((w) => ({
                  label: `${w.weekNumber}`,
                  user: w.user?.conflictResolution || null,
                  partner: w.partner?.conflictResolution || null,
                }))}
                color="blue"
                max={10}
              />
            </CardContent>
          </Card>
        </div>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle>История чек-инов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400">Неделя</th>
                    <th className="text-center py-2 px-3 text-slate-500 dark:text-slate-400">Ваша близость</th>
                    <th className="text-center py-2 px-3 text-slate-500 dark:text-slate-400">Партнёра близость</th>
                    <th className="text-center py-2 px-3 text-slate-500 dark:text-slate-400">Ваши конфликты</th>
                    <th className="text-center py-2 px-3 text-slate-500 dark:text-slate-400">Партнёра конфликты</th>
                    <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400">Комментарий</th>
                  </tr>
                </thead>
                <tbody>
                  {weeks.slice().reverse().map((week) => (
                    <tr key={`${week.year}-${week.weekNumber}`} className="border-b border-slate-100 dark:border-slate-800/50">
                      <td className="py-2 px-3 text-slate-950 dark:text-slate-500 font-medium">
                        Нед. {week.weekNumber}, {week.year}
                      </td>
                      <td className="text-center py-2 px-3">
                        {week.user != null ? (
                          <span className={cn('font-bold', week.user.closeness >= 7 ? 'text-emerald-500' : week.user.closeness >= 4 ? 'text-amber-500' : 'text-red-500')}>
                            {week.user.closeness}/10
                          </span>
                        ) : '—'}
                      </td>
                      <td className="text-center py-2 px-3">
                        {week.partner != null ? (
                          <span className={cn('font-bold', week.partner.closeness >= 7 ? 'text-emerald-500' : week.partner.closeness >= 4 ? 'text-amber-500' : 'text-red-500')}>
                            {week.partner.closeness}/10
                          </span>
                        ) : '—'}
                      </td>
                      <td className="text-center py-2 px-3">
                        {week.user != null ? (
                          <span className={cn('font-bold', week.user.conflictResolution >= 7 ? 'text-emerald-500' : week.user.conflictResolution >= 4 ? 'text-amber-500' : 'text-red-500')}>
                            {week.user.conflictResolution}/10
                          </span>
                        ) : '—'}
                      </td>
                      <td className="text-center py-2 px-3">
                        {week.partner != null ? (
                          <span className={cn('font-bold', week.partner.conflictResolution >= 7 ? 'text-emerald-500' : week.partner.conflictResolution >= 4 ? 'text-amber-500' : 'text-red-500')}>
                            {week.partner.conflictResolution}/10
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {week.user?.missing || week.partner?.missing || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

function PulseChart({ data, color, max }: { data: Array<{ label: string; user: number | null; partner: number | null }>; color: 'rose' | 'blue'; max: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null!)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const padding = 40
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    ctx.clearRect(0, 0, width, height)

    // Grid
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Y labels
    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px Inter, sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i
      const value = max - (max / 5) * i
      ctx.fillText(value.toString(), padding - 8, y)
    }

    const strokeColor = color === 'rose' ? '#f43f5e' : '#3b82f6'
    const partnerColor = '#94a3b8'

    // Partner line
    ctx.strokeStyle = partnerColor
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    data.forEach((point, i) => {
      if (point.partner !== null) {
        const x = padding + (chartWidth / (data.length - 1)) * i
        const y = padding + chartHeight - (point.partner / max) * chartHeight
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
    })
    ctx.stroke()
    ctx.setLineDash([])

    // User line
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = 2.5
    ctx.beginPath()
    data.forEach((point, i) => {
      if (point.user !== null) {
        const x = padding + (chartWidth / (data.length - 1)) * i
        const y = padding + chartHeight - (point.user / max) * chartHeight
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    // Points
    data.forEach((point, i) => {
      if (point.user !== null) {
        const x = padding + (chartWidth / (data.length - 1)) * i
        const y = padding + chartHeight - (point.user / max) * chartHeight
        ctx.fillStyle = strokeColor
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(x, y, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    })

    // X labels
    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    data.forEach((point, i) => {
      const x = padding + (chartWidth / (data.length - 1)) * i
      ctx.fillText(point.label, x, height - padding + 8)
    })
  }, [data, color, max])

  return <canvas ref={canvasRef} width={600} height={250} className="w-full h-auto" />
}