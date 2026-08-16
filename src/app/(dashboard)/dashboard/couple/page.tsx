'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { SkeletonCard } from '@/components/skeleton-card'

interface CoupleData {
  user: { name: string | null; email: string }
  couple: { id: string; status: string; partnerA: { name: string | null }; partnerB: { name: string | null } } | null
  assessments: Array<{ key: string; title: string; completedByCurrent: boolean; completedByPartner: boolean; bothCompleted: boolean }>
  latestReport: { radarData: Record<string, number>; generatedAt: string } | null
}

export default function CouplePage() {
  const [data, setData] = useState<CoupleData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <DashboardLayout user={{ name: null, email: '' }} couple={null}>
        <div className="h1">Мы</div>
        <SkeletonCard count={3} />
      </DashboardLayout>
    )
  }

  const total = data.assessments.length
  const done = data.assessments.filter((a) => a.bothCompleted).length
  const radarValues = data.latestReport ? Object.values(data.latestReport.radarData) : []
  const score = radarValues.length
    ? Math.round((radarValues.reduce((s, v) => s + v, 0) / radarValues.length / 10) * 100)
    : null

  return (
    <DashboardLayout user={{ name: data.user.name, email: data.user.email }} couple={data.couple}>
      <div className="h1">Кто вы вдвоём</div>
      <div className="dim">Тесты, отчёт, звёзды.</div>

      {!data.couple && (
        <div className="notice notice-amber" style={{ marginTop: 16 }}>
          Создайте пару в настройках, чтобы видеть совместные результаты.
        </div>
      )}

      <div className="k">Опросники · {done} из {total}</div>
      <Link href="/dashboard/assessments" className="cd">
        <div className="cd-r">
          <div className="cd-ic">🧪</div>
          <div className="cd-t">
            <b>Пройти тесты</b>
            <span>{done === total ? 'Всё пройдено — отчёт готов' : `Осталось: ${total - done}`}</span>
          </div>
          {done < total && <span className="badge warn">{total - done}</span>}
          <span className="arr">›</span>
        </div>
      </Link>

      <div className="k">Результаты</div>
      <Link href="/dashboard/report" className="cd">
        <div className="cd-r">
          <div className="cd-ic">📊</div>
          <div className="cd-t"><b>Отчёт пары</b><span>Где вы сила, где — рост</span></div>
          {score !== null ? <span className="cd-v">{score}%</span> : <span className="arr">›</span>}
        </div>
      </Link>

      <Link href="/dashboard/astro" className="cd">
        <div className="cd-r">
          <div className="cd-ic">🔮</div>
          <div className="cd-t"><b>Синастрия</b><span>По датам рождения</span></div>
          <span className="arr">›</span>
        </div>
      </Link>
    </DashboardLayout>
  )
}
