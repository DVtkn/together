'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Heart, BarChart2, Target, Loader2, CheckCircle2, AlertCircle, HeartPulse, Sparkles } from 'lucide-react'

interface AssessmentEntry {
  key: string
  title: string
  completedByCurrent: boolean
  completedByPartner: boolean
  bothCompleted: boolean
}

interface DashboardData {
  user: { name: string | null; email: string }
  couple: {
    id: string
    status: string
    partnerA: { name: string | null }
    partnerB: { name: string | null }
  } | null
  assessments: AssessmentEntry[]
  latestReport: { radarData: unknown; generatedAt: string } | null
  currentPulse: {
    userCloseness: number
    userConflict: number
    partnerCloseness: number | null
    partnerConflict: number | null
  } | null
  activeChallenge: {
    title: string
    description: string
    completedByCurrent: boolean
    completedByPartner: boolean
  } | null
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const justLeft = searchParams.get('left') === 'true'

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <DashboardLayout user={{ name: null, email: '', image: null }} couple={null}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" aria-hidden="true" />
        </div>
      </DashboardLayout>
    )
  }

  if (!data) {
    return (
      <DashboardLayout user={{ name: null, email: '', image: null }} couple={null}>
        <p className="text-slate-500">Не удалось загрузить данные.</p>
      </DashboardLayout>
    )
  }

  const currentUserName = data.user.name || data.user.email.split('@')[0]
  const partner = data.couple
    ? data.couple.partnerA.name !== currentUserName
      ? data.couple.partnerA
      : data.couple.partnerB
    : null

  const completedCount = data.assessments.filter((a) => a.bothCompleted).length
  const myCompleted = data.assessments.filter((a) => a.completedByCurrent).length

  return (
    <DashboardLayout
      user={{ name: data.user.name, email: data.user.email, image: null }}
      couple={data.couple ? { id: data.couple.id, partnerA: data.couple.partnerA, partnerB: data.couple.partnerB, status: data.couple.status } : null}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-950 dark:text-slate-50">
            Привет, {currentUserName}
            {partner?.name ? ` и ${partner.name}` : ''}! ❤️
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Коротко о том, как дела у вашей пары.
          </p>
        </div>

        {justLeft && (
          <div className="p-4 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 text-sm">
            Вы покинули пару. Найдите партнёра, чтобы совместный отчёт снова стал доступен.
          </div>
        )}

        {!data.couple && (
          <Card className="border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20">
            <CardContent className="pt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-slate-950 dark:text-slate-50 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-rose-500" aria-hidden="true" />
                  Вы пока не в паре
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Найдите партнёра по логину, чтобы вместе пройти опросники и получить совместный отчёт.
                </p>
              </div>
              <Button asChild className="bg-rose-500 hover:bg-rose-600 text-white">
                <Link href="/dashboard/settings#couple">Привязать партнёра</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                Опросники
              </CardTitle>
              <CardDescription>Мой прогресс: {myCompleted}/{data.assessments.length} · вместе: {completedCount}/{data.assessments.length}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.assessments.map((a) => (
                <div key={a.key} className="flex items-center gap-2 text-sm">
                  <span className={a.bothCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}>
                    {a.bothCompleted ? '✅' : a.completedByCurrent ? '⏳' : '⬜'}
                  </span>
                  <Link href={`/dashboard/assessments/${a.key}`} className="flex-1 text-slate-700 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400">
                    {a.title}
                  </Link>
                  {a.bothCompleted && <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />}
                </div>
              ))}
              {data.assessments.length === 0 && <p className="text-sm text-slate-500">Не найдено опросников.</p>}
            </CardContent>
          </Card>

          {/* Report */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-rose-500" aria-hidden="true" />
                Совместный отчёт
              </CardTitle>
              <CardDescription>Радар по 6 осям совместимости</CardDescription>
            </CardHeader>
            <CardContent>
              {data.latestReport ? (
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    Отчёт готов. Посмотрите сильные стороны и зоны роста вашей пары.
                  </p>
                  <Button asChild size="sm" className="bg-rose-500 hover:bg-rose-600 text-white">
                    <Link href="/dashboard/report">Открыть отчёт</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Оба пройдите все опросники — отчёт появится здесь автоматически.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pulse */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                Пульс недели
              </CardTitle>
              <CardDescription>Близость и разрешение конфликтов</CardDescription>
            </CardHeader>
            <CardContent>
              {data.currentPulse ? (
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Моя близость</span>
                      <span>{data.currentPulse.userCloseness}/10</span>
                    </div>
                    <Progress value={data.currentPulse.userCloseness * 10} className="h-2" />
                  </div>
                  {data.currentPulse.partnerCloseness !== null && (
                    <div>
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Близость партнёра</span>
                        <span>{data.currentPulse.partnerCloseness}/10</span>
                      </div>
                      <Progress value={data.currentPulse.partnerCloseness * 10} className="h-2 bg-rose-100 dark:bg-rose-950" />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Заполните еженедельный чек-ин, чтобы увидеть динамику.
                </p>
              )}
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/dashboard/pulse">К пульсу</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Challenge */}
        {data.activeChallenge && (
          <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-rose-50 dark:from-amber-950/20 dark:to-rose-950/20">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="text-4xl" aria-hidden="true"><Target /></div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-950 dark:text-slate-50 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" aria-hidden="true" />
                    Челлендж недели: {data.activeChallenge.title}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{data.activeChallenge.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className={data.activeChallenge.completedByCurrent ? 'text-emerald-600' : 'text-slate-500'}>
                      {data.activeChallenge.completedByCurrent ? '✅ Я выполнил(а)' : '⬜ Мне нужно выполнить'}
                    </span>
                    <span className={data.activeChallenge.completedByPartner ? 'text-emerald-600' : 'text-slate-500'}>
                      {data.activeChallenge.completedByPartner ? '✅ Партнёр выполнил(а)' : '⬜ Ждём партнёра'}
                    </span>
                  </div>
                </div>
                <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
                  <Link href="/dashboard/challenges">Подробнее</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
            <Link href="/dashboard/partner">
              <Heart className="h-6 w-6 text-rose-500" aria-hidden="true" />
              <span className="text-sm">База знаний</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
            <Link href="/dashboard/venues">
              <Sparkles className="h-6 w-6 text-rose-500" aria-hidden="true" />
              <span className="text-sm">Куда пойти</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
            <Link href="/dashboard/challenges">
              <Target className="h-6 w-6 text-rose-500" aria-hidden="true" />
              <span className="text-sm">Челленджи</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
            <Link href="/dashboard/ai">
              <Sparkles className="h-6 w-6 text-rose-500" aria-hidden="true" />
              <span className="text-sm">ИИ-ассистент</span>
            </Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}