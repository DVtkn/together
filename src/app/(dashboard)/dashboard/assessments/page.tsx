'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

interface AssessmentCard {
  key: string
  title: string
  description: string
  emoji: string | null
  total: number
  completedByCurrent: boolean
  completedByPartner: boolean
  bothCompleted: boolean
  progress: number
}

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<AssessmentCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/assessments')
      .then((res) => res.json())
      .then((data: { assessments: AssessmentCard[] }) => {
        setAssessments(data.assessments || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <DashboardLayout user={{ name: null, email: '' }} couple={null}>
        <div className="loading-screen">
          <div className="loading-icon">📝</div>
          <div className="loading-text">Загружаем опросники</div>
        </div>
      </DashboardLayout>
    )
  }

  const done = assessments.filter((a) => a.bothCompleted)
  const left = assessments.filter((a) => !a.bothCompleted)

  return (
    <DashboardLayout user={{ name: null, email: '' }} couple={null}>
      <div className="h1">Тесты</div>
      <div className="dim">Каждый проходит отдельно. Честно.</div>

      {done.length > 0 && (
        <>
          <div className="k">Пройдено</div>
          {done.map((a) => (
            <Link key={a.key} href={`/dashboard/assessments/${a.key}`} className="cd">
              <div className="cd-r">
                <div className="cd-ic">{a.emoji || '📝'}</div>
                <div className="cd-t"><b>{a.title}</b><span>{a.description}</span></div>
                <span className="badge ok">✓</span>
              </div>
            </Link>
          ))}
        </>
      )}

      {left.length > 0 && (
        <>
          <div className="k">Осталось</div>
          {left.map((a) => {
            const percent = a.total ? Math.round((a.progress / a.total) * 100) : 0
            return (
              <Link key={a.key} href={`/dashboard/assessments/${a.key}`} className="cd" style={{ borderColor: a.progress > 0 ? 'rgba(139,92,246,.3)' : undefined }}>
                <div className="cd-r">
                  <div className="cd-ic">{a.emoji || '📝'}</div>
                  <div className="cd-t">
                    <b>{a.title}</b>
                    <span>{a.progress > 0 ? `${a.progress}/${a.total} · продолжить` : a.description}</span>
                  </div>
                  {a.progress > 0 ? (
                    <span className="badge pri">{percent}%</span>
                  ) : (
                    <span className="arr">›</span>
                  )}
                </div>
              </Link>
            )
          })}
        </>
      )}

      <div className="notice notice-amber" style={{ marginTop: 16 }}>
        <span style={{ fontSize: 20 }} aria-hidden="true">🤝</span>
        <div>
          <strong>Принцип честности.</strong> Вы отвечаете по отдельности. Некоторые вопросы приватные — их ответы не показываются партнёру вообще.
        </div>
      </div>
    </DashboardLayout>
  )
}
