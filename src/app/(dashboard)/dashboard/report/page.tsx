'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { SkeletonCard } from '@/components/skeleton-card'

interface ProgressiveAxis {
  key: string
  axis: string
  value: number | null
  sourceTests: string[]
}

interface TestStatus {
  key: string
  title: string
  emoji: string | null
  bothDone: boolean
  score: number | null
}

interface ProgressiveReport {
  axes: ProgressiveAxis[]
  tests: TestStatus[]
  completedBoth: number
  total: number
  compatibility: number | null
  nextTest: { key: string; title: string; emoji: string | null } | null
}

interface AnalysisData {
  summary: string
  strengths: Array<{ title: string; text: string }>
  weaknesses: Array<{ title: string; text: string }>
  growthPoints: Array<{ title: string; text: string; action: string }>
  perspectives: string
  breakupRisks: Array<{ risk: string; cause: string; prevention: string }>
}

const AXIS_META: Record<string, { icon: string }> = {
  communication: { icon: '💬' },
  intimacy: { icon: '💞' },
  values: { icon: '🎯' },
  conflict: { icon: '⚡' },
  support: { icon: '🤝' },
  future: { icon: '🔮' },
  money: { icon: '💰' },
  trust: { icon: '🔐' },
}

const RadarChart = ({ axes }: { axes: ProgressiveAxis[] }) => {
  const size = 340
  const cx = size / 2
  const cy = size / 2
  const radius = 108
  const angleFor = (i: number) => (i / axes.length) * Math.PI * 2 - Math.PI / 2
  const point = (i: number, r: number): [number, number] => [
    cx + Math.cos(angleFor(i)) * r,
    cy + Math.sin(angleFor(i)) * r,
  ]

  const dataPolygon = axes.map((a, i) => point(i, ((a.value ?? 0) / 10) * radius))
    .map(([x, y]) => `${x},${y}`)
    .join(' ')

  const hasData = axes.some((a) => a.value !== null)

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
        const pts = axes.map((_, i) => point(i, r)).map(([x, y]) => `${x},${y}`).join(' ')
        return <polygon key={l} points={pts} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
      })}

      {axes.map((a, i) => {
        const [x, y] = point(i, radius)
        return <line key={a.key} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
      })}

      {hasData && (
        <polygon points={dataPolygon} fill="url(#radarGrad)" fillOpacity={0.22} stroke="url(#radarGrad)" strokeWidth={2.5} strokeLinejoin="round" />
      )}

      {axes.map((a, i) => {
        const [x, y] = point(i, radius + 30)
        const locked = a.value === null
        return (
          <g key={a.key}>
            <text x={x} y={y - 8} textAnchor="middle" fill={locked ? 'rgba(255,255,255,.35)' : '#94A3B8'} fontSize={11} fontWeight={600}>
              {locked ? '🔒' : AXIS_META[a.key]?.icon ?? ''} {a.axis}
            </text>
            <text x={x} y={y + 10} textAnchor="middle" fill={locked ? 'rgba(255,255,255,.25)' : '#F1F5F9'} fontSize={13} fontWeight={700}>
              {a.value !== null ? a.value.toFixed(1) : '—'}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function ReportPage() {
  const [report, setReport] = useState<ProgressiveReport | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/report').then((r) => r.json()),
      fetch('/api/report/analysis').then((r) => r.json()),
    ])
      .then(([reportData, analysisData]) => {
        setReport(reportData.report)
        if (analysisData.analysis) {
          setAnalysis({
            summary: analysisData.analysis.summary,
            strengths: analysisData.analysis.strengths || [],
            weaknesses: analysisData.analysis.weaknesses || [],
            growthPoints: analysisData.analysis.growthPoints || [],
            perspectives: analysisData.analysis.perspectives,
            breakupRisks: analysisData.analysis.breakupRisks || [],
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const analyze = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/report/analyze', { method: 'POST' })
      const data = await res.json()
      if (data.analysis) {
        setAnalysis({
          summary: data.analysis.summary,
          strengths: data.analysis.strengths || [],
          weaknesses: data.analysis.weaknesses || [],
          growthPoints: data.analysis.growthPoints || [],
          perspectives: data.analysis.perspectives,
          breakupRisks: data.analysis.breakupRisks || [],
        })
      }
    } catch {
      // пользователь может попробовать ещё раз
    } finally {
      setBusy(false)
    }
  }

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
          <div className="h2" style={{ marginBottom: 6 }}>Карта пары появится, когда вы соединитесь</div>
          <div className="dim" style={{ marginBottom: 18 }}>
            Сначала создайте пару, затем проходите тесты вместе — карта растёт с каждым тестом.
          </div>
          <Link href="/dashboard/couple" className="btn btn-p">
            Создать пару
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const openedAxes = report.axes.filter((a) => a.value !== null)
  const lockedAxes = report.axes.filter((a) => a.value === null)
  const sorted = [...openedAxes].sort((a, b) => (b.value as number) - (a.value as number))
  const strengths = sorted.slice(0, Math.min(3, sorted.length))
  const growth = sorted.slice(-Math.min(2, sorted.length)).reverse()
  const score = report.compatibility
  const canAnalyze = report.completedBoth >= 3

  return (
    <DashboardLayout user={{ name: null, email: '' }} couple={null}>
      <div className="h1">Карта пары</div>
      <div className="dim">Без оценок. Только факты.</div>

      {/* Прогресс-плашка */}
      <div className="notice notice-ok mt" style={{ marginTop: 14 }}>
        <span style={{ fontSize: 20 }} aria-hidden="true">🧭</span>
        <div>
          <strong>Открыто {openedAxes.length} из {report.axes.length} осей.</strong>{' '}
          {report.nextTest
            ? `Следующий тест: ${report.nextTest.emoji ?? ''} ${report.nextTest.title}`
            : 'Все оси открыты — карта полная!'}
        </div>
      </div>

      {/* Радар всегда виден */}
      <div className="radar mt">
        <RadarChart axes={report.axes} />
        <div style={{ display: 'flex', gap: 14, fontSize: 12, marginTop: 12, alignItems: 'center' }}>
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <i style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--grad)', display: 'inline-block', fontStyle: 'normal' }}></i>
            Ваша пара
          </span>
          {score !== null ? (
            <b style={{ marginLeft: 'auto', fontSize: 26, background: 'var(--grad)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{score}%</b>
          ) : (
            <b style={{ marginLeft: 'auto', fontSize: 26, color: 'rgba(255,255,255,.35)' }}>—</b>
          )}
        </div>
      </div>

      {score === null && (
        <div className="cd static" style={{ textAlign: 'center', padding: 24, marginTop: 4 }}>
          <div className="dim" style={{ marginBottom: 14 }}>
            Ни один тест ещё не пройден обоими. Пройдите первый тест вместе — и на радаре появятся первые оси.
          </div>
          <Link href="/dashboard/assessments" className="btn btn-p">
            Пройти первый тест
          </Link>
        </div>
      )}

      {lockedAxes.length > 0 && score !== null && (
        <div className="dim" style={{ marginTop: 12, fontSize: 13, textAlign: 'center' }}>
          🔒 Недоступные оси откроются, когда оба пройдут их тесты.
        </div>
      )}

      {/* Сила / рост */}
      {strengths.length > 0 && (
        <>
          <div className="k">💪 Сила</div>
          {strengths.map((a) => (
            <div key={a.key} className="cd static">
              <div className="cd-r">
                <div className="cd-ic">{AXIS_META[a.key]?.icon ?? '💜'}</div>
                <div className="cd-t">
                  <b>{a.axis}</b>
                  <span>{a.sourceTests.map((t) => report.tests.find((x) => x.key === t)?.title).filter(Boolean).join(', ')}</span>
                </div>
                <span className="badge ok">{(a.value as number).toFixed(1)}</span>
              </div>
            </div>
          ))}
        </>
      )}

      {growth.length > 0 && (
        <>
          <div className="k" style={{ marginTop: 4 }}>🌱 Рост</div>
          {growth.map((a) => (
            <div key={a.key} className="cd static">
              <div className="cd-r">
                <div className="cd-ic">{AXIS_META[a.key]?.icon ?? '💜'}</div>
                <div className="cd-t">
                  <b>{a.axis}</b>
                  <span>{a.sourceTests.map((t) => report.tests.find((x) => x.key === t)?.title).filter(Boolean).join(', ')}</span>
                </div>
                <span className="badge">{Math.round((a.value as number) * 10)}%</span>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ИИ-анализ */}
      <div className="k">ИИ-анализ пары</div>
      {!analysis ? (
        <div className="cd static" style={{ textAlign: 'center', padding: 24 }}>
          <div className="dim" style={{ marginBottom: 14 }}>
            {canAnalyze
              ? 'Сова проанализирует ваши совместные ответы.'
              : `Сова разберёт ваши ответы, когда вы пройдёте хотя бы 3 теста вместе. Осталось: ${Math.max(0, 3 - report.completedBoth)}.`}
          </div>
          <button className="btn btn-p" onClick={analyze} disabled={busy || !canAnalyze}>
            {busy ? 'Сова изучает ответы…' : 'Получить ИИ-анализ'}
          </button>
          {!canAnalyze && (
            <div className="autosave-hint" style={{ marginTop: 10 }}>
              Пройдите вместе ещё {Math.max(0, 3 - report.completedBoth)} тест(а).
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="cd static">
            <div className="cd-r">
              <div className="cd-ic">🧠</div>
              <div className="cd-t"><b>Ваш портрет</b><span>{analysis.summary}</span></div>
            </div>
          </div>

          {analysis.strengths.length > 0 && (
            <>
              <div className="k">💪 Сильные стороны</div>
              {analysis.strengths.map((s, i) => (
                <div key={i} className="cd static ai ok"><b>{s.title}</b><span>{s.text}</span></div>
              ))}
            </>
          )}

          {analysis.weaknesses.length > 0 && (
            <>
              <div className="k">⚠️ Слабые стороны</div>
              {analysis.weaknesses.map((s, i) => (
                <div key={i} className="cd static ai warn"><b>{s.title}</b><span>{s.text}</span></div>
              ))}
            </>
          )}

          {analysis.growthPoints.length > 0 && (
            <>
              <div className="k">🌱 Точки роста</div>
              {analysis.growthPoints.map((s, i) => (
                <div key={i} className="cd static ai grow">
                  <b>{s.title}</b><span>{s.text}</span>
                  <div className="ai-action">→ {s.action}</div>
                </div>
              ))}
            </>
          )}

          {analysis.perspectives && (
            <>
              <div className="k">🔮 Перспективы</div>
              <div className="cd static"><span>{analysis.perspectives}</span></div>
            </>
          )}

          {analysis.breakupRisks.length > 0 && (
            <>
              <div className="k">🚨 На что обратить внимание</div>
              {analysis.breakupRisks.map((s, i) => (
                <div key={i} className="cd static ai risk">
                  <b>{s.risk}</b>
                  <span>Причина: {s.cause}</span>
                  <div className="ai-action">🛡 {s.prevention}</div>
                </div>
              ))}
              <div className="autosave-hint">Анализ — не приговор и не медицинская услуга. Это повод для разговора.</div>
            </>
          )}
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