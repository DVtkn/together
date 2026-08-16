'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

const ASSESSMENTS = [
  { key: 'attachment', title: 'Стиль привязанности', icon: '🧷', description: 'Как вы ведёте себя в близости и конфликте.', questions: 10 },
  { key: 'love_languages', title: '5 языков любви', icon: '💝', description: 'Как вы выражаете и хотите получать любовь.', questions: 10 },
  { key: 'gottman_conflict', title: 'Конфликты (Готтман)', icon: '⚡', description: 'Четыре всадника, попытки ремонта.', questions: 12 },
  { key: 'values', title: 'Ценности и цели', icon: '💎', description: 'Дети, деньги, карьера, родители.', questions: 11 },
  { key: 'big_five', title: 'Big Five (OCEAN)', icon: '🌈', description: 'Базовая совместимость черт личности.', questions: 10 },
]

interface Progress {
  key: string
  completedByCurrent: boolean
  completedByPartner: boolean
  bothCompleted: boolean
  progress: number
  total: number
}

export default function AssessmentsPage() {
  const [progress, setProgress] = useState<Record<string, Progress>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/assessments')
      .then((res) => res.json())
      .then((data: { assessments: Progress[] }) => {
        const map: Record<string, Progress> = {}
        data.assessments.forEach((a) => (map[a.key] = a))
        setProgress(map)
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

  const done = ASSESSMENTS.filter((a) => progress[a.key]?.bothCompleted)
  const left = ASSESSMENTS.filter((a) => !progress[a.key]?.bothCompleted)

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
                <div className="cd-ic">{a.icon}</div>
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
            const p = progress[a.key] || { progress: 0, total: a.questions }
            const percent = Math.round((p.progress / p.total) * 100)
            return (
              <Link key={a.key} href={`/dashboard/assessments/${a.key}`} className="cd" style={{ borderColor: p.progress > 0 ? 'rgba(139,92,246,.3)' : undefined }}>
                <div className="cd-r">
                  <div className="cd-ic">{a.icon}</div>
                  <div className="cd-t">
                    <b>{a.title}</b>
                    <span>{p.progress > 0 ? `${p.progress}/${p.total} · продолжить` : a.description}</span>
                  </div>
                  {p.progress > 0 ? (
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
