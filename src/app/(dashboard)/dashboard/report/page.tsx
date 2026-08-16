'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { SkeletonCard } from '@/components/skeleton-card'

const RADAR_AXES = [
  { key: 'communication', label: 'Коммуникация', icon: '💬' },
  { key: 'intimacy', label: 'Близость', icon: '💞' },
  { key: 'values', label: 'Ценности', icon: '🎯' },
  { key: 'conflict', label: 'Конфликты', icon: '⚡' },
  { key: 'support', label: 'Поддержка', icon: '🤝' },
  { key: 'future', label: 'Будущее', icon: '🔮' },
]

interface ReportData {
  radarData: Record<string, number>
  strongSides: Array<{ title: string; description: string; evidence: string }>
  growthAreas: Array<{ title: string; description: string; risk: string; action: string }>
  recommendations: Array<{ title: string; description: string; axis: string; difficulty: number; durationMin: number }>
  constellationState: { distance: number; sync: number; colorHue: number; intensity: number }
  generatedAt: string
}

const RadarChart = ({ data }: { data: Record<string, number> }) => {
  const size = 340
  const cx = size / 2
  const cy = size / 2
  const radius = 108
  const angleFor = (i: number) => (i / RADAR_AXES.length) * Math.PI * 2 - Math.PI / 2
  const point = (i: number, r: number): [number, number] => [
    cx + Math.cos(angleFor(i)) * r,
    cy + Math.sin(angleFor(i)) * r,
  ]
  const val = (key: string) => Math.max(0, Math.min(10, data[key] || 0))

  const dataPolygon = RADAR_AXES.map((a, i) => point(i, (val(a.key) / 10) * radius))
    .map(([x, y]) => `${x},${y}`)
    .join(' ')

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Радар совместимости">
      <defs>
        <linearGradient id="radarGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>

      {[1, 2, 3, 4, 5].map((l) => {
        const r = (radius / 5) * l
        const pts = RADAR_AXES.map((_, i) => point(i, r)).map(([x, y]) => `${x},${y}`).join(' ')
        return <polygon key={l} points={pts} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
      })}

      {RADAR_AXES.map((a, i) => {
        const [x, y] = point(i, radius)
        return <line key={a.key} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
      })}

      <polygon points={dataPolygon} fill="url(#radarGrad)" fillOpacity={0.22} stroke="url(#radarGrad)" strokeWidth={2.5} strokeLinejoin="round" />

      {RADAR_AXES.map((a, i) => {
        const [x, y] = point(i, (val(a.key) / 10) * radius)
        return <circle key={a.key} cx={x} cy={y} r={4.5} fill="#8B5CF6" stroke="#fff" strokeWidth={1.5} />
      })}

      {RADAR_AXES.map((a, i) => {
        const [x, y] = point(i, radius + 26)
        return (
          <g key={a.key}>
            <text x={x} y={y - 8} textAnchor="middle" fill="#94A3B8" fontSize={11} fontWeight={600}>{a.label}</text>
            <text x={x} y={y + 10} textAnchor="middle" fill="#F1F5F9" fontSize={13} fontWeight={700}>{val(a.key).toFixed(1)}</text>
          </g>
        )
      })}
    </svg>
  )
}

export default function ReportPage() {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reports')
      .then((res) => res.json())
      .then((data) => {
        setReport(data.report)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <DashboardLayout user={{ name: null, email: '' }} couple={null}>
        <div className="h1">Наш отчёт</div>
        <div className="sk sk-line" style={{ height: 20, width: '60%', marginBottom: 18 }} />
        <SkeletonCard count={3} />
        <div className="sk sk-line" style={{ height: 220, borderRadius: 16, marginTop: 4 }} />
      </DashboardLayout>
    )
  }

  if (!report) {
    return (
      <DashboardLayout user={{ name: null, email: '' }} couple={null}>
        <div className="empty" style={{ paddingTop: 60 }}>
          <i>🔍</i>
          <div className="h2" style={{ marginBottom: 6 }}>Отчёт не найден</div>
          <div className="dim" style={{ marginBottom: 18 }}>
            Пройдите все опросники вместе с партнёром, чтобы получить совместный отчёт.
          </div>
          <Link href="/dashboard/assessments" className="btn btn-p">
            Перейти к опросникам
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const radarValues = Object.values(report.radarData)
  const avg = radarValues.length ? radarValues.reduce((s, v) => s + v, 0) / radarValues.length : 0
  const score = Math.round((avg / 10) * 100)

  return (
    <DashboardLayout user={{ name: null, email: '' }} couple={null}>
      <div className="h1">Карта пары</div>
      <div className="dim">Без оценок. Только факты.</div>

      <div className="radar mt">
        <RadarChart data={report.radarData} />
        <div style={{ display: 'flex', gap: 14, fontSize: 12, marginTop: 12, alignItems: 'center' }}>
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <i style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--grad)', display: 'inline-block', fontStyle: 'normal' }}></i>
            Ваша пара
          </span>
          <b style={{ marginLeft: 'auto', fontSize: 26, background: 'var(--grad)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{score}%</b>
        </div>
      </div>

      {report.strongSides.length > 0 && (
        <>
          <div className="k">Сила</div>
          {report.strongSides.map((side, i) => (
            <div key={i} className="cd static">
              <div className="cd-r">
                <div className="cd-ic">💬</div>
                <div className="cd-t">
                  <b>{side.title}</b>
                  <span>{side.description}</span>
                </div>
              </div>
              {side.evidence && <div className="small" style={{ marginTop: 8, color: 'var(--ok)' }}>Доказательство: {side.evidence}</div>}
            </div>
          ))}
        </>
      )}

      {report.growthAreas.length > 0 && (
        <>
          <div className="k">Рост</div>
          {report.growthAreas.map((area, i) => (
            <div key={i} className="cd static">
              <div className="cd-r">
                <div className="cd-ic">⚡</div>
                <div className="cd-t">
                  <b>{area.title}</b>
                  <span>{area.description}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, fontSize: 13 }}>
                {area.risk && <span style={{ color: 'var(--warn)' }}>Риск: {area.risk}</span>}
                {area.action && <span style={{ color: 'var(--ok)' }}>Действие: {area.action}</span>}
              </div>
            </div>
          ))}
        </>
      )}

      {report.recommendations.length > 0 && (
        <>
          <div className="k">Рекомендации на неделю</div>
          {report.recommendations.map((rec, i) => (
            <div key={i} className="cd static">
              <div className="cd-r">
                <div className="cd-ic">💡</div>
                <div className="cd-t">
                  <b>{rec.title}</b>
                  <span>{rec.description}</span>
                  <div className="small" style={{ marginTop: 4 }}>{rec.axis} · сложность {rec.difficulty}/3 · {rec.durationMin} мин</div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      <Link href="/dashboard/ai" className="btn btn-p btn-w mt">
        Обсудить с Совой
      </Link>

      <div className="notice notice-amber" style={{ marginTop: 24 }}>
        <span style={{ fontSize: 20 }} aria-hidden="true">⚠️</span>
        <div>
          <strong>Важно.</strong> Together — инструмент самопознания, не медицинская услуга. Отчёт — повод поговорить, а не приговор.
        </div>
      </div>
    </DashboardLayout>
  )
}
