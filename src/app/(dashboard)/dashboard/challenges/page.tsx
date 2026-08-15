'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Target, CheckCircle, AlertCircle, Sparkles, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface ChallengeData {
  challenges: Array<{
    id: string
    weekNumber: number
    year: number
    title: string
    description: string
    instruction: string
    examplePhrase: string | null
    axis: string
    difficulty: number
    durationMin: number
    status: string
    completedByCurrent: boolean
    completedByPartner: boolean
    createdAt: string
    completedAt: string | null
  }>
}

export default function ChallengesPage() {
  const [data, setData] = useState<ChallengeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/challenges')
      .then((res) => res.json())
      .then((json) => {
        setData(json)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleComplete = async (challengeId: string) => {
    setCompleting(challengeId)
    try {
      await fetch(`/api/challenges/${challengeId}/complete`, { method: 'POST' })
      const res = await fetch('/api/challenges')
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error('Complete failed:', e)
    } finally {
      setCompleting(null)
    }
  }

  if (loading) {
    return (
      <DashboardLayout user={{ name: null, email: '', image: null }} couple={null}>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="pt-6 h-48" /></Card>
          ))}
        </div>
      </DashboardLayout>
    )
  }

  if (!data?.challenges?.length) {
    return (
      <DashboardLayout user={{ name: null, email: '', image: null }} couple={null}>
        <div className="max-w-2xl mx-auto text-center py-12">
          <Target className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50 mb-2">Челленджи</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Небольшие задания на неделю, которые появляются после заполнения пульса. Сделаны под ваши зоны роста.
          </p>
          <Button asChild>
            <a href="/dashboard/pulse">Заполнить пульс</a>
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const activeChallenges = data.challenges.filter((c) => c.status === 'ACTIVE' || c.status === 'PENDING')
  const completedChallenges = data.challenges.filter((c) => c.status === 'COMPLETED')
  const expiredChallenges = data.challenges.filter((c) => c.status === 'EXPIRED')

  return (
    <DashboardLayout user={{ name: null, email: '', image: null }} couple={null}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-950 dark:text-slate-50">Челленджи</h1>
            <p className="text-slate-600 dark:text-slate-400">Маленькие задания для пары. Делаются вдвоём.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />
            <span>Выполнено: {completedChallenges.length}</span>
          </div>
        </div>

        {/* Active Challenge */}
        {activeChallenges.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50 mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-rose-500" aria-hidden="true" />
              Активный челлендж недели
            </h2>
            {activeChallenges.map((challenge) => (
              <Card key={challenge.id} className="border-rose-200 dark:border-rose-800 mb-4">
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                          Ось: {challenge.axis}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                          Сложность: {challenge.difficulty}/3
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                          {challenge.durationMin} мин
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-950 dark:text-slate-50 mb-2">{challenge.title}</h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-3">{challenge.description}</p>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium text-slate-950 dark:text-slate-500">Задание:</span> {challenge.instruction}</p>
                        {challenge.examplePhrase && (
                          <p className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg border-l-4 border-rose-500">
                            <span className="font-medium text-rose-600 dark:text-rose-400">Пример фразы: </span>
                            <span className="italic text-slate-700 dark:text-slate-300">«{challenge.examplePhrase}»</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 lg:w-48">
                      <div className="flex items-center gap-3 w-full">
                        <label className={cn(
                          'flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition-all',
                          challenge.completedByCurrent
                            ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-700'
                            : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        )}>
                          <input
                            type="checkbox"
                            checked={challenge.completedByCurrent}
                            onChange={() => !challenge.completedByCurrent && handleComplete(challenge.id)}
                            disabled={challenge.completedByCurrent || completing === challenge.id}
                            className="h-4 w-4 text-rose-500 rounded focus:ring-rose-500"
                          />
                          <span className="text-sm font-medium">
                            {challenge.completedByCurrent ? 'Выполнено ✓' : 'Отметить выполненным'}
                          </span>
                        </label>
                      </div>
                      {challenge.completedByPartner && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Партнёр выполнил</span>
                        </div>
                      )}
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Неделя {challenge.weekNumber}, {challenge.year}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Completed Challenges */}
        {(completedChallenges.length > 0 || expiredChallenges.length > 0) && (
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50 mb-4">История</h2>
            <div className="space-y-3">
              {[...completedChallenges, ...expiredChallenges]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((challenge) => (
                  <Card key={challenge.id} className={cn(challenge.status === 'EXPIRED' && 'opacity-60')}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-slate-950 dark:text-slate-50">{challenge.title}</h3>
                            {challenge.status === 'COMPLETED' && (
                              <CheckCircle className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                            )}
                            {challenge.status === 'EXPIRED' && (
                              <AlertCircle className="h-4 w-4 text-amber-500" aria-hidden="true" />
                            )}
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{challenge.description}</p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              Ось: {challenge.axis}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              Нед. {challenge.weekNumber}, {challenge.year}
                            </span>
                            {challenge.completedAt && (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                                Завершён {format(new Date(challenge.completedAt), 'd MMM', { locale: ru })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {challenge.completedByCurrent && (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Вы ✓</span>
                          )}
                          {challenge.completedByPartner && (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Партнёр ✓</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <Card className="mt-8 border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">Принцип совместности</p>
                <p>Челленджи — это не соревнование. Задание считается выполненным, только когда оба отметят его. Так оно хотя бы становится общим.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}