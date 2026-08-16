'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { cn } from '@/lib/utils/cn'

interface Question {
  id: string
  order: number
  text: string
  type: 'LIKERT_1_5' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TEXT'
  options?: string[]
  dimension: string
  reverseScored: boolean
  visibleToPartner: boolean
  isRiskMarker: boolean
}

interface AssessmentData {
  assessment: {
    id: string
    key: string
    title: string
    description: string
    questions: Question[]
  }
  responses: Record<string, unknown>
  progress: number
  total: number
}

const LIKERT_LABELS = ['Совсем не согласен', 'Не согласен', 'Нейтрально', 'Согласен', 'Полностью согласен']

export default function AssessmentPage() {
  const router = useRouter()
  const params = useParams()
  const key = params.key as string

  const [data, setData] = useState<AssessmentData | null>(null)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch(`/api/assessments?key=${key}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json)
        setAnswers(json.responses || {})
      })
      .catch(() => router.back())
  }, [key, router])

  const questions = data?.assessment.questions || []
  const currentQuestion = questions[currentIndex]
  const progress = data ? Math.round((data.progress / data.total) * 100) : 0
  const answeredCount = Object.keys(answers).length

  const saveAnswers = useCallback(async () => {
    if (!data || saving) return
    setSaving(true)
    try {
      await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: data.assessment.id,
          answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
        }),
      })
      setSaved(true)
      if (saveFlashRef.current) clearTimeout(saveFlashRef.current)
      saveFlashRef.current = setTimeout(() => setSaved(false), 1000)
    } catch (e) {
      console.error('Auto-save failed:', e)
    } finally {
      setSaving(false)
    }
  }, [data, answers, saving])

  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(saveAnswers, 1000)
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [answers, saveAnswers])

  const handleAnswerChange = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex((prev) => prev + 1)
  }

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1)
  }

  const handleSubmit = async () => {
    if (!data) return
    setSubmitting(true)
    try {
      await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: data.assessment.id,
          answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
        }),
      })
      router.push('/dashboard/assessments?saved=true')
      router.refresh()
      fetch('/api/report/analyze', { method: 'POST' }).catch(() => {})
    } catch (e) {
      console.error('Submit failed:', e)
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = answeredCount === questions.length

  if (!data) {
    return (
      <DashboardLayout user={{ name: null, email: '' }} couple={null}>
        <div className="loading-screen">
          <div className="loading-icon">📝</div>
          <div className="loading-text">Загружаем опросник</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={{ name: null, email: '' }} couple={null}>
      {/* Прогресс */}
      <div className="test-progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${Math.max(progress, ((currentIndex + 1) / questions.length) * 100)}%` }} />
        </div>
        <div className="progress-label">
          Вопрос {currentQuestion?.order || 0} из {questions.length} · {answeredCount} ответов
          <span className={`save-dot ${saved ? 'on' : ''}`}>✓</span>
        </div>
      </div>

      <button className="btn btn-s btn-sm" style={{ marginBottom: 20 }} onClick={() => router.back()}>
        ← Назад к списку
      </button>

      {currentQuestion && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="test-category">{data.assessment.title}</span>
            {!currentQuestion.visibleToPartner && (
              <span className="test-category" style={{ background: 'rgba(245,158,11,.1)', borderColor: 'rgba(245,158,11,.3)', color: '#FCD34D' }}>
                🔒 Приватный
              </span>
            )}
            {currentQuestion.isRiskMarker && (
              <span className="test-category" style={{ background: 'rgba(16,185,129,.1)', borderColor: 'rgba(16,185,129,.3)', color: '#34D399' }}>
                🚩 Сигнальная метка
              </span>
            )}
          </div>

          <h2 className="test-question">{currentQuestion.text}</h2>

          <div className="test-options">
            {currentQuestion.type === 'LIKERT_1_5' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {LIKERT_LABELS.map((label, index) => {
                  const value = index + 1
                  const selected = answers[currentQuestion.id] === value
                  return (
                    <button
                      key={index}
                      type="button"
                      className={cn('test-option selected', !selected && '')}
                      style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 92, padding: 12, textAlign: 'center', borderColor: selected ? 'var(--pri)' : undefined }}
                      onClick={() => handleAnswerChange(currentQuestion.id, value)}
                    >
                      <span style={{ fontSize: 22, fontWeight: 700 }}>{value}</span>
                      <span style={{ fontSize: 11, marginTop: 6, color: selected ? 'var(--text)' : 'var(--dim)' }}>{label}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {currentQuestion.type === 'SINGLE_CHOICE' && currentQuestion.options && (
              <>
                {currentQuestion.options.map((option, index) => {
                  const selected = answers[currentQuestion.id] === option
                  return (
                    <button
                      key={index}
                      type="button"
                      className={cn('test-option', selected && 'selected')}
                      onClick={() => handleAnswerChange(currentQuestion.id, option)}
                    >
                      <span
                        style={{
                          width: 22, height: 22, borderRadius: '50%',
                          border: '2px solid var(--line)', flexShrink: 0,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          background: selected ? 'var(--grad)' : 'transparent',
                          color: '#fff', fontSize: 12,
                        }}
                      >
                        {selected ? '✓' : ''}
                      </span>
                      {option}
                    </button>
                  )
                })}
              </>
            )}

            {currentQuestion.type === 'MULTIPLE_CHOICE' && currentQuestion.options && (
              <>
                {currentQuestion.options.map((option, index) => {
                  const selected = (answers[currentQuestion.id] as string[])?.includes(option) || false
                  return (
                    <button
                      key={index}
                      type="button"
                      className={cn('test-option', selected && 'selected')}
                      onClick={() => {
                        const current = (answers[currentQuestion.id] as string[]) || []
                        const updated = selected ? current.filter((o) => o !== option) : [...current, option]
                        handleAnswerChange(currentQuestion.id, updated)
                      }}
                    >
                      <span
                        style={{
                          width: 24, height: 24, borderRadius: 8,
                          border: '2px solid var(--line)', marginRight: 0, flexShrink: 0,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          background: selected ? 'var(--grad)' : 'transparent',
                          color: '#fff', fontSize: 14,
                        }}
                      >
                        {selected ? '✓' : ''}
                      </span>
                      {option}
                    </button>
                  )
                })}
              </>
            )}

            {currentQuestion.type === 'TEXT' && (
              <textarea
                value={(answers[currentQuestion.id] as string) || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                placeholder="Ваш ответ..."
                rows={6}
                className="input"
                style={{ minHeight: 140 }}
              />
            )}
          </div>

          <p className="test-dim">
            Измерение: <span style={{ fontWeight: 600, textTransform: 'capitalize', color: 'var(--dim)' }}>{currentQuestion.dimension}</span>
            {currentQuestion.reverseScored && ' (инвертированная шкала)'}
          </p>
        </>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        <button type="button" className="btn btn-s" onClick={handlePrev} disabled={currentIndex === 0}>
          ← Назад
        </button>
        {currentIndex < questions.length - 1 ? (
          <button
            type="button"
            className="btn btn-p"
            style={{ flex: 1 }}
            disabled={!answers[currentQuestion?.id]}
            onClick={handleNext}
          >
            Далее →
          </button>
        ) : canSubmit ? (
          <button
            type="button"
            className="btn btn-p"
            style={{ flex: 1 }}
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Завершаем...' : '✅ Завершить опросник'}
          </button>
        ) : (
          <button type="button" className="btn btn-s" style={{ flex: 1 }} disabled>
            Ответьте на вопрос
          </button>
        )}
      </div>

      <div className="autosave-hint">💾 Ответы сохраняются автоматически</div>
    </DashboardLayout>
  )
}
