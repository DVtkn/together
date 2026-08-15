'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Progress } from '@/components/ui/progress'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

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
        <div className="loading-screen">
          <div className="loading-icon">💜</div>
          <div className="loading-text">Загружаем ваш дашборд</div>
          <div className="loading-step">Собираем данные о вашей паре…</div>
          <div className="loading-bar">
            <div className="loading-bar-fill" style={{ width: '100%', animation: 'typing-bounce 1.4s infinite' }} />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!data) {
    return (
      <DashboardLayout user={{ name: null, email: '', image: null }} couple={null}>
        <div className="notice notice-rose">⚠️ Не удалось загрузить данные. Попробуйте обновить страницу.</div>
      </DashboardLayout>
    )
  }

  const currentUserName = data.user.name || data.user.email?.split('@')[0] || 'Пользователь'
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
      <div className="container space-y-6">
        {/* HERO */}
        <section className="hero">
          <div className="hero-icon" aria-hidden="true">💜</div>
          <span className="eyebrow">Ваш личный навигатор в отношениях</span>
          <h1 className="gradient-text">
            Привет, {currentUserName}
            {partner?.name ? ` и ${partner.name}` : ''}!
          </h1>
          <p>
            Коротко о том, как дела у вашей пары: опросники, совместный отчёт,
            пульс недели и челленджи — всё в одном месте.
          </p>
          <div className="hero-buttons">
            <Link href="/dashboard/assessments" className="btn btn-primary btn-large">
              📝 Пройти тест
            </Link>
            <Link href="/dashboard/report" className="btn btn-secondary btn-large">
              📊 Смотреть отчёт
            </Link>
          </div>
        </section>

        {justLeft && (
          <div className="notice notice-amber">👋 Вы покинули пару. Найдите партнёра, чтобы совместный отчёт снова стал доступен.</div>
        )}

        {!data.couple && (
          <div className="card card-link" style={{ cursor: 'default' }}>
            <div className="card-header-row">
              <div className="card-icon" aria-hidden="true">💞</div>
              <div>
                <h3>Вы пока не в паре</h3>
                <p>Найдите партнёра по логину, чтобы вместе пройти опросники и получить совместный отчёт.</p>
              </div>
            </div>
            <Link href="/dashboard/settings#couple" className="btn btn-primary" style={{ width: 'auto', display: 'inline-flex', padding: '12px 24px' }}>
              Привязать партнёра
            </Link>
          </div>
        )}

        {/* ЧЕЛЛЕНДЖ НЕДЕЛИ */}
        {data.activeChallenge && (
          <div className="card card-link" style={{ cursor: 'default' }}>
            <div className="card-header-row">
              <div className="card-icon" aria-hidden="true">🎯</div>
              <div>
                <h3>Челлендж недели: {data.activeChallenge.title}</h3>
                <p>{data.activeChallenge.description}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
              <span style={{ fontSize: 14, color: data.activeChallenge.completedByCurrent ? 'var(--success)' : 'var(--text-dim)' }}>
                {data.activeChallenge.completedByCurrent ? '✅ Я выполнил(а)' : '⬜ Мне нужно выполнить'}
              </span>
              <span style={{ fontSize: 14, color: data.activeChallenge.completedByPartner ? 'var(--success)' : 'var(--text-dim)' }}>
                {data.activeChallenge.completedByPartner ? '✅ Партнёр выполнил(а)' : '⬜ Ждём партнёра'}
              </span>
              <Link href="/dashboard/challenges" className="btn btn-primary" style={{ width: 'auto', display: 'inline-flex', padding: '10px 20px', marginLeft: 'auto', marginBottom: 0 }}>
                Подробнее
              </Link>
            </div>
          </div>
        )}

        {/* FEATURES */}
        <h2 className="section-title">Обзор</h2>
        <div className="features-grid">
          {/* Опросники */}
          <Link href="/dashboard/assessments" className="card card-link">
            <div className="card-header-row">
              <div className="card-icon" aria-hidden="true">📝</div>
              <div>
                <h3>Опросники</h3>
                <p>Мой прогресс: {myCompleted}/{data.assessments.length} · вместе: {completedCount}/{data.assessments.length}</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.assessments.map((a) => (
                <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                  <span style={{ flexShrink: 0 }}>
                    {a.bothCompleted ? '✅' : a.completedByCurrent ? '⏳' : '⬜'}
                  </span>
                  <span style={{ color: 'var(--text)' }}>{a.title}</span>
                  {a.bothCompleted && <span style={{ marginLeft: 'auto', color: 'var(--success)' }}>готово</span>}
                </div>
              ))}
              {data.assessments.length === 0 && <p>Не найдено опросников.</p>}
            </div>
          </Link>

          {/* Отчёт */}
          <Link href="/dashboard/report" className="card card-link">
            <div className="card-header-row">
              <div className="card-icon" aria-hidden="true">📊</div>
              <div>
                <h3>Совместный отчёт</h3>
                <p>Радар по 6 осям совместимости</p>
              </div>
            </div>
            {data.latestReport ? (
              <p style={{ marginTop: 8 }}>Отчёт готов — посмотрите сильные стороны и зоны роста вашей пары.</p>
            ) : (
              <p style={{ marginTop: 8 }}>Оба пройдите все опросники — отчёт появится здесь автоматически.</p>
            )}
          </Link>

          {/* Пульс */}
          <Link href="/dashboard/pulse" className="card card-link">
            <div className="card-header-row">
              <div className="card-icon" aria-hidden="true">🌡️</div>
              <div>
                <h3>Пульс недели</h3>
                <p>Близость и разрешение конфликтов</p>
              </div>
            </div>
            {data.currentPulse ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>
                    <span>Моя близость</span>
                    <span>{data.currentPulse.userCloseness}/10</span>
                  </div>
                  <Progress value={data.currentPulse.userCloseness * 10} className="h-2" />
                </div>
                {data.currentPulse.partnerCloseness !== null && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>
                      <span>Близость партнёра</span>
                      <span>{data.currentPulse.partnerCloseness}/10</span>
                    </div>
                    <Progress value={data.currentPulse.partnerCloseness * 10} className="h-2" />
                  </div>
                )}
              </div>
            ) : (
              <p style={{ marginTop: 8 }}>Заполните еженедельный чек-ин, чтобы увидеть динамику.</p>
            )}
          </Link>
        </div>

        {/* БЫСТРЫЕ ДЕЙСТВИЯ */}
        <h2 className="section-title">Быстрые действия</h2>
        <div className="features-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <Link href="/dashboard/partner" className="card card-link">
            <div className="card-header-row" style={{ marginBottom: 0 }}>
              <div className="card-icon" aria-hidden="true">💞</div>
              <div>
                <h3>База знаний</h3>
                <p>Психология, деньги, близость</p>
              </div>
            </div>
          </Link>
          <Link href="/dashboard/venues" className="card card-link">
            <div className="card-header-row" style={{ marginBottom: 0 }}>
              <div className="card-icon" aria-hidden="true">📍</div>
              <div>
                <h3>Куда пойти</h3>
                <p>Идеи для свиданий в вашем городе</p>
              </div>
            </div>
          </Link>
          <Link href="/dashboard/challenges" className="card card-link">
            <div className="card-header-row" style={{ marginBottom: 0 }}>
              <div className="card-icon" aria-hidden="true">🎯</div>
              <div>
                <h3>Челленджи</h3>
                <p>Задания на неделю для пары</p>
              </div>
            </div>
          </Link>
          <Link href="/dashboard/ai" className="card card-link">
            <div className="card-header-row" style={{ marginBottom: 0 }}>
              <div className="card-icon" aria-hidden="true">💬</div>
              <div>
                <h3>ИИ-ассистент</h3>
                <p>Помощь в любой ситуации</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}