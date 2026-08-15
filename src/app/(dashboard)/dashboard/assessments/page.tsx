'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import {
  Heart,
  Sparkles,
  HeartPulse,
  Target,
  Users,
  CheckCircle,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const ASSESSMENTS = [
  { key: 'attachment', title: 'Стиль привязанности', icon: Heart, description: 'Как вы ведёте себя в близости и конфликте. Основа теории привязанности.', questions: 10 },
  { key: 'love_languages', title: '5 языков любви', icon: Sparkles, description: 'Как вы выражаете и хотите получать любовь. По Гэри Чапману.', questions: 10 },
  { key: 'gottman_conflict', title: 'Конфликты (метод Готтмана)', icon: HeartPulse, description: 'Четыре всадника, попытки ремонта, эмоциональные заявки.', questions: 12 },
  { key: 'values', title: 'Ценности и жизненные цели', icon: Target, description: 'Дети, финансы, карьера, переезд, родители, образ жизни.', questions: 11 },
  { key: 'big_five', title: 'Big Five (OCEAN)', icon: Users, description: 'Базовая совместимость личностных черт. Различия — зона для договорённостей.', questions: 10 },
]

interface AssessmentProgress {
  key: string
  completedByCurrent: boolean
  completedByPartner: boolean
  bothCompleted: boolean
  progress: number
  total: number
}

interface AssessmentsResponse {
  assessments: AssessmentProgress[]
}

export default function AssessmentsPage() {
  const [progress, setProgress] = useState<Record<string, { completedByCurrent: boolean; completedByPartner: boolean; bothCompleted: boolean; progress: number; total: number }>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/assessments')
      .then((res) => res.json())
      .then((data: AssessmentsResponse) => {
        const map: typeof progress = {}
        data.assessments.forEach((a) => {
          map[a.key] = {
            completedByCurrent: a.completedByCurrent,
            completedByPartner: a.completedByPartner,
            bothCompleted: a.bothCompleted,
            progress: a.progress,
            total: a.total,
          }
        })
        setProgress(map)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <DashboardLayout
      user={{ name: null, email: '', image: null }}
      couple={null}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-950 dark:text-slate-50">Опросники</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Вы проходите опросники по отдельности. Ответы друг друга видны, только когда оба закончат.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6 h-32" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {ASSESSMENTS.map((assessment) => {
            const p = progress[assessment.key] || { completedByCurrent: false, completedByPartner: false, bothCompleted: false, progress: 0, total: assessment.questions }
            const isComplete = p.bothCompleted
            const isCurrentDone = p.completedByCurrent
            const isPartnerDone = p.completedByPartner

            return (
              <Link key={assessment.key} href={`/dashboard/assessments/${assessment.key}`}>
                <Card className={cn(
                  'hover:shadow-md transition-shadow cursor-pointer',
                  isComplete ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20' : ''
                )}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'p-3 rounded-xl flex-shrink-0',
                        isComplete ? 'bg-emerald-100 dark:bg-emerald-950/50' : 'bg-slate-100 dark:bg-slate-800'
                      )}>
                        <assessment.icon className={cn('h-6 w-6', isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500')} aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-950 dark:text-slate-50">{assessment.title}</h3>
                          {isComplete && <CheckCircle className="h-5 w-5 text-emerald-500" aria-hidden="true" />}
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{assessment.description}</p>
                        <div className="mt-3 flex items-center gap-4 text-sm">
                          <span className="text-slate-500 dark:text-slate-400">
                            {isComplete
                              ? 'Завершено обоими'
                              : isCurrentDone && !isPartnerDone
                              ? 'Ждём партнёра'
                              : !isCurrentDone && isPartnerDone
                              ? 'Ваша очередь'
                              : 'Не начато'}
                          </span>
                          {!isComplete && (
                            <>
                              <Progress value={Math.round((p.progress / p.total) * 100)} className="h-1.5 w-32" />
                              <span className="text-slate-400 dark:text-slate-500">{p.progress} / {p.total}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ArrowRight className={cn('h-5 w-5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity', isComplete ? 'text-emerald-500' : 'text-slate-400')} aria-hidden="true" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}

          {/* Disclaimer */}
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium mb-1">Принцип честности</p>
                  <p>Вы отвечаете по отдельности, и партнёр не видит ваших ответов, пока не закончите оба. Так проще быть честными.</p>
                  <p className="mt-2">Некоторые вопросы помечены как приватные — их ответы не показываются партнёру вообще, в отчёт попадают только общие метрики.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  )
}