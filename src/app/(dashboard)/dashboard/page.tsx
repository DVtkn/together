'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { SkeletonCard } from '@/components/skeleton-card'

interface DashboardData {
  user: { name: string | null; email: string }
  couple: {
    id: string
    status: string
    partnerA: { name: string | null }
    partnerB: { name: string | null }
  } | null
  assessments: Array<{ key: string; title: string; completedByCurrent: boolean; completedByPartner: boolean; bothCompleted: boolean }>
  latestReport: { radarData: Record<string, number>; generatedAt: string } | null
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
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [partnerMood, setPartnerMood] = useState<{ emoji: string; text: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const justLeft = searchParams.get('left') === 'true'

  useEffect(() => {
    Promise.all([fetch('/api/dashboard').then((r) => r.json()), fetch('/api/mood').then((r) => r.json())])
      .then(([d, m]) => {
        setData(d)
        setPartnerMood(m.partner ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <DashboardLayout user={{ name: null, email: '' }} couple={null}>
        <div className="h1">Дом</div>
        <SkeletonCard count={4} />
      </DashboardLayout>
    )
  }

  const currentUserName = data.user.name || data.user.email.split('@')[0] || 'Друг'
  const partner = data.couple
    ? data.couple.partnerA.name !== currentUserName
      ? data.couple.partnerA.name
      : data.couple.partnerB.name
    : null

  const completedCount = data.assessments.filter((a) => a.bothCompleted).length
  const totalCount = data.assessments.length || 1
  const radarValues = data.latestReport ? Object.values(data.latestReport.radarData) : []
  const compatibility = radarValues.length
    ? Math.round((radarValues.reduce((s, v) => s + v, 0) / radarValues.length / 10) * 100)
    : null
  const pulse = data.currentPulse

  return (
    <DashboardLayout user={{ name: data.user.name, email: data.user.email }} couple={data.couple}>
      <div className="h1">Привет, {currentUserName}.</div>
      <div className="dim">
        {partner
          ? `Вы с ${partner} — ${data.couple?.status === 'PENDING' ? 'пара создана, ждём подключения' : 'вместе'}.`
          : 'Ваш личный навигатор в отношениях.'}
      </div>

      <div className="stats">
        <div className="st">
          <b>{compatibility !== null ? `${compatibility}%` : '—'}</b>
          <span>{compatibility !== null ? 'совместимость' : 'пройдите тесты'}</span>
        </div>
        <div className="st">
          <b>{pulse ? ((pulse.userCloseness + pulse.userConflict) / 2).toFixed(1) : '—'}</b>
          <span>пульс недели</span>
        </div>
        <div className="st">
          <b>{completedCount}/{totalCount}</b>
          <span>тестов вместе</span>
        </div>
      </div>

      {justLeft && (
        <div className="notice notice-amber">👋 Вы покинули пару. Найдите партнёра, чтобы совместный отчёт снова стал доступен.</div>
      )}

      {!data.couple && (
        <>
          <div className="k">Начнём</div>
          <div className="cd" onClick={() => router.push('/dashboard/settings')}>
            <div className="cd-r">
              <div className="cd-ic" style={{ fontSize: 24 }}>💞</div>
              <div className="cd-t"><b>Создать пару</b><span>Найдите партнёра по логину</span></div>
              <span className="arr">›</span>
            </div>
          </div>
        </>
      )}

      {partner && (
        <>
          <div className="k">{partner} сейчас</div>
          <Link href="/dashboard/pulse" className="cd">
            <div className="cd-r">
              <div className="cd-ic" style={{ fontSize: 24 }}>{partnerMood?.emoji ?? '💙'}</div>
              <div className="cd-t">
                <b>{partnerMood ? (partnerMood.text ? partnerMood.text : 'Настроение') : 'Не отметил(а) настроение'}</b>
                <span>обновлено · нажмите, чтобы посмотреть</span>
              </div>
              <span className="arr">›</span>
            </div>
          </Link>
        </>
      )}

      <div className="k">Эта неделя</div>

      {data.activeChallenge && (
        <Link href="/dashboard/challenges" className="cd">
          <div className="cd-r">
            <div className="cd-ic">🌙</div>
            <div className="cd-t">
              <b>{data.activeChallenge.title}</b>
              <span>
                {data.activeChallenge.completedByCurrent ? 'Я сделал(а)' : 'Я — ещё нет'} ·{' '}
                {data.activeChallenge.completedByPartner ? 'партнёр сделал' : 'партнёр — нет'}
              </span>
            </div>
            <span className="arr">›</span>
          </div>
        </Link>
      )}

      <Link href="/dashboard/pulse" className="cd">
        <div className="cd-r">
          <div className="cd-ic">🫀</div>
          <div className="cd-t">
            <b>Настроение и пульс</b>
            <span>Отметь, как ты. Партнёр увидит.</span>
          </div>
          <span className="arr">›</span>
        </div>
      </Link>

      <Link href="/dashboard/date" className="cd">
        <div className="cd-r">
          <div className="cd-ic">📍</div>
          <div className="cd-t"><b>Свидание</b><span>Позови партнёра. Он(а) выберет место.</span></div>
          <span className="arr">›</span>
        </div>
      </Link>

      <Link href="/dashboard/ai" className="cd">
        <div className="cd-r">
          <div className="cd-ic">🦉</div>
          <div className="cd-t"><b>Сова</b><span>Помнит всё о вашей паре.</span></div>
          <span className="arr">›</span>
        </div>
      </Link>

      <Link href="/dashboard/settings" className="cd">
        <div className="cd-r">
          <div className="cd-ic">⚙️</div>
          <div className="cd-t"><b>Настройки</b><span>Профиль, уведомления, данные</span></div>
          <span className="arr">›</span>
        </div>
      </Link>
    </DashboardLayout>
  )
}
