'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { cn } from '@/lib/utils/cn'

const ASSESSMENTS = [
  { key: 'attachment', title: 'Стиль привязанности', icon: '🧷', description: 'Как вы ведёте себя в близости и конфликте. Основа теории привязанности.', questions: 10 },
  { key: 'love_languages', title: '5 языков любви', icon: '💝', description: 'Как вы выражаете и хотите получать любовь. По Гэри Чапману.', questions: 10 },
  { key: 'gottman_conflict', title: 'Конфликты (метод Готтмана)', icon: '⚡', description: 'Четыре всадника, попытки ремонта, эмоциональные заявки.', questions: 12 },
  { key: 'values', title: 'Ценности и жизненные цели', icon: '🎯', description: 'Дети, финансы, карьера, переезд, родители, образ жизни.', questions: 11 },
  { key: 'big_five', title: 'Big Five (OCEAN)', icon: '🧩', description: 'Базовая совместимость личностных черт. Различия — зона для договорённостей.', questions: 10 },
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

const STATUS_EMOJI: Record<string, string> = {
  both: '✅ Завершено обоими',
  current: '⏳ Ждём партнёра',
  partner: '👈 Ваша очередь',
  none: '⬜ Не начато',
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
      <div className="container space-y-6">
        <section className="hero" style={{ paddingBottom: 24 }}>
          <div className="hero-icon" aria-hidden="true">📝</div>
          <span className="eyebrow">Совместимость</span>
          <h1>Опросники</h1>
          <p>
            Вы проходите опросники по отдельности. Ответы друг друга видны, только когда оба закончат.
          </p>
        </section>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="card" style={{ animation: 'pulseGlow 1.5s infinite', minHeight: 120 }} />
            ))}
          </div>
        ) : (
          <div className="features-grid" style={{ gridTemplateColumns: '1fr' }}>
            {ASSESSMENTS.map((assessment) => {
              const p = progress[assessment.key] || { completedByCurrent: false, completedByPartner: false, bothCompleted: false, progress: 0, total: assessment.questions }
              const isComplete = p.bothCompleted
              const isCurrentDone = p.completedByCurrent
              const isPartnerDone = p.completedByPartner
              const status = isComplete ? 'both' : isCurrentDone && !isPartnerDone ? 'current' : !isCurrentDone && isPartnerDone ? 'partner' : 'none'

              return (
                <Link key={assessment.key} href={`/dashboard/assessments/${assessment.key}`} className="card card-link">
                  <div className="card-header-row">
                    <div className="card-icon" aria-hidden="true">{assessment.icon}</div>
                    <div>
                      <h3>
                        {assessment.title}
                        {isComplete && <span style={{ marginLeft: 8 }}>✅</span>}
                      </h3>
                      <p>{assessment.description}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <span className={cn('text-sm', isComplete ? 'text-[var(--success)]' : 'text-[var(--text-dim)]')}>
                      {STATUS_EMOJI[status]}
                    </span>
                    {!isComplete && (
                      <>
                        <Progress value={Math.round((p.progress / p.total) * 100)} className="h-1.5" style={{ width: 160 }} />
                        <span className="text-sm text-[var(--text-dim)]">{p.progress} / {p.total}</span>
                      </>
                    )}
                    <span style={{ marginLeft: 'auto', color: 'var(--primary)', fontWeight: 600 }}>→</span>
                  </div>
                </Link>
              )
            })}

            <div className="notice notice-amber" style={{ marginTop: 8 }}>
              <span style={{ fontSize: 20 }} aria-hidden="true">🤝</span>
              <div>
                <strong>Принцип честности.</strong> Вы отвечаете по отдельности, и партнёр не видит ваших ответов, пока не закончите оба.
                Некоторые вопросы помечены как приватные — их ответы не показываются партнёру вообще, в отчёт попадают только общие метрики.
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}