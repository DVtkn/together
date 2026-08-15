'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Loader2 } from 'lucide-react'
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
  const [submitting, setSubmitting] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Auto-save
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
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
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
    } catch (e) {
      console.error('Submit failed:', e)
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = answeredCount === questions.length

  if (!data) {
    return (
      <DashboardLayout user={{ name: null, email: '', image: null }} couple={null}>
        <div className="loading-screen">
          <div className="loading-icon">📝</div>
          <div className="loading-text">Загружаем опросник</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={{ name: null, email: '', image: null }} couple={null}>
      <div className="test-container">
        {/* Прогресс */}
        <div className="test-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-label">
            Вопрос {currentQuestion?.order || 0} из {questions.length} · {answeredCount} ответов
          </div>
        </div>

        {/* Кнопка назад */}
        <button
          className="btn btn-secondary"
          style={{ width: 'auto', padding: '10px 18px', fontSize: 14, alignSelf: 'flex-start', marginBottom: 8 }}
          onClick={() => router.back()}
        >
          ← Назад к списку
        </button>

        {currentQuestion && (
          <>
            {/* Категория */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span className="test-category">{data.assessment.title}</span>
              {!currentQuestion.visibleToPartner && (
                <span className="test-category" style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)', color: '#FCD34D' }}>
                  🔒 Приватный вопрос
                </span>
              )}
              {currentQuestion.isRiskMarker && (
                <span className="test-category" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: '#34D399' }}>
                  🚩 Сигнальная метка
                </span>
              )}
            </div>

            {/* Вопрос */}
            <h2 className="test-question">{currentQuestion.text}</h2>

            {/* Варианты */}
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
                        className={cn('test-option', selected && 'selected')}
                        style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 96, padding: 12, textAlign: 'center' }}
                        onClick={() => handleAnswerChange(currentQuestion.id, value)}
                      >
                        <span style={{ fontSize: 22, fontWeight: 700 }}>{value}</span>
                        <span style={{ fontSize: 12, marginTop: 6, color: selected ? 'var(--primary)' : 'var(--text-dim)' }}>
                          {label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {currentQuestion.type === 'SINGLE_CHOICE' && currentQuestion.options && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {currentQuestion.options.map((option, index) => {
                    const selected = answers[currentQuestion.id] === option
                    return (
                      <button
                        key={index}
                        type="button"
                        className={cn('test-option', selected && 'selected')}
                        onClick={() => handleAnswerChange(currentQuestion.id, option)}
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
              )}

              {currentQuestion.type === 'MULTIPLE_CHOICE' && currentQuestion.options && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                            width: 24,
                            height: 24,
                            borderRadius: 8,
                            border: '2px solid var(--border-hover)',
                            marginRight: 12,
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: selected ? 'var(--gradient)' : 'transparent',
                            color: '#fff',
                            fontSize: 14,
                          }}
                        >
                          {selected ? '✓' : ''}
                        </span>
                        {option}
                      </button>
                    )
                  })}
                </div>
              )}

              {currentQuestion.type === 'TEXT' && (
                <textarea
                  value={(answers[currentQuestion.id] as string) || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder="Ваш ответ..."
                  rows={6}
                  style={{
                    width: '100%',
                    background: 'var(--surface)',
                    border: '2px solid var(--border)',
                    borderRadius: 16,
                    padding: 20,
                    color: 'var(--text)',
                    fontSize: 16,
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              )}
            </div>

            {/* Подсказка */}
            <p style={{ marginTop: 16, fontSize: 12, color: 'var(--text-dim)' }}>
              Измерение: <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{currentQuestion.dimension}</span>
              {currentQuestion.reverseScored && ' (инвертированная шкала)'}
            </p>
          </>
        )}

        {/* Навигация */}
        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: 'auto', padding: '14px 28px' }}
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            ← Назад
          </button>
          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={!answers[currentQuestion?.id]}
              onClick={handleNext}
            >
              Далее →
            </button>
          ) : canSubmit ? (
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Завершаем...
                </>
              ) : (
                '✅ Завершить опросник'
              )}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              disabled
            >
              Ответьте на вопрос
            </button>
          )}
        </div>

        {/* Индикатор сохранения */}
        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: 'var(--text-dim)' }}>
          {saving ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              Сохранение...
            </span>
          ) : (
            '💾 Ответы сохраняются автоматически'
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}