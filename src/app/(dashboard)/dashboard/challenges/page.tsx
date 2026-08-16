'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { cn } from '@/lib/utils/cn'

interface Challenge {
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
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/challenges')
      .then((res) => res.json())
      .then((json: { challenges: Challenge[] }) => {
        setChallenges(json.challenges ?? [])
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
      setChallenges(json.challenges ?? [])
    } catch (e) {
      console.error('Complete failed:', e)
    } finally {
      setCompleting(null)
    }
  }

  if (loading) {
    return (
      <DashboardLayout user={{ name: null, email: '' }} couple={null}>
        <div className="loading-screen">
          <div className="loading-icon">🌙</div>
          <div className="loading-text">Загружаем челленджи</div>
        </div>
      </DashboardLayout>
    )
  }

  const active = challenges.filter((c) => c.status === 'ACTIVE' || c.status === 'PENDING')
  const history = challenges
    .filter((c) => c.status === 'COMPLETED' || c.status === 'EXPIRED')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const completedCount = challenges.filter((c) => c.status === 'COMPLETED').length

  if (challenges.length === 0) {
    return (
      <DashboardLayout user={{ name: null, email: '' }} couple={null}>
        <div className="h1">Челленджи</div>
        <div className="dim">Небольшие задания на неделю — под ваши зоны роста.</div>
        <div className="empty" style={{ paddingTop: 60 }}>
          <i>🌙</i>
          <div className="h2" style={{ marginBottom: 6 }}>Пока пусто</div>
          <div className="dim" style={{ marginBottom: 18 }}>Челленджи появятся после заполнения пульса.</div>
          <Link href="/dashboard/pulse" className="btn btn-p">Заполнить пульс</Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={{ name: null, email: '' }} couple={null}>
      <div className="h1">Челленджи</div>
      <div className="dim">
        Маленькие задания для пары · выполнено: <b style={{ color: 'var(--text)' }}>{completedCount}</b>
      </div>

      {active.map((challenge) => (
        <div key={challenge.id} className="cd static mt">
          <div className="cd-r">
            <div className="cd-ic">🌙</div>
            <div className="cd-t">
              <b>{challenge.title}</b>
              <span>{challenge.description}</span>
            </div>
          </div>
          <div className="small" style={{ marginTop: 8 }}>Ось: {challenge.axis} · сложность {challenge.difficulty}/3 · {challenge.durationMin} мин</div>
          <div className="small" style={{ marginTop: 4 }}>Задание: {challenge.instruction}</div>
          {challenge.examplePhrase && (
            <div className="notice notice-amber" style={{ marginTop: 12 }}>
              <span>💬</span>
              <div><strong>Пример фразы:</strong> «{challenge.examplePhrase}»</div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <button
              className={cn('btn', challenge.completedByCurrent ? 'btn-ok' : 'btn-p')}
              disabled={challenge.completedByCurrent || completing === challenge.id}
              onClick={() => !challenge.completedByCurrent && handleComplete(challenge.id)}
            >
              {challenge.completedByCurrent ? '✓ Я сделал(а)' : completing === challenge.id ? '…' : 'Я сделал(а)'}
            </button>
            {challenge.completedByPartner && <span className="badge ok">Партнёр ✓</span>}
            <span className="small" style={{ marginLeft: 'auto', color: 'var(--mute)' }}>
              Нед. {challenge.weekNumber}, {challenge.year}
            </span>
          </div>
        </div>
      ))}

      {history.length > 0 && (
        <>
          <div className="k">История</div>
          <div className="feed">
            {history.map((challenge) => (
              <div key={challenge.id} className="feed-item" style={{ opacity: challenge.status === 'EXPIRED' ? 0.6 : 1 }}>
                <b>{challenge.title}</b>
                <span>
                  {challenge.status === 'COMPLETED' ? '✓ завершён' : 'просрочен'} · {challenge.axis} · Нед. {challenge.weekNumber}
                  <span className="small"> · вы {challenge.completedByCurrent ? '✓' : '—'} · партнёр {challenge.completedByPartner ? '✓' : '—'}</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="notice notice-amber" style={{ marginTop: 24 }}>
        <span style={{ fontSize: 20 }} aria-hidden="true">🤝</span>
        <div>
          <strong>Принцип совместности.</strong> Это не соревнование. Задание считается выполненным, только когда оба отметят его.
        </div>
      </div>
    </DashboardLayout>
  )
}
