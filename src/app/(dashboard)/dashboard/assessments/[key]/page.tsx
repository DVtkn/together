'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { RadioGroup } from '@radix-ui/react-radio-group'
import { Textarea } from '@/components/ui/textarea'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
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
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" aria-hidden="true" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={{ name: null, email: '', image: null }} couple={null}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">{data.assessment.title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{data.assessment.description}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-500 dark:text-slate-400">Прогресс</span>
            <span className="font-medium text-slate-950 dark:text-slate-50">
              {answeredCount} / {questions.length} ({progress}%)
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        {currentQuestion && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Вопрос {currentQuestion.order} из {questions.length}
                </span>
                {currentQuestion.isRiskMarker && (
                  <AlertCircle className="h-4 w-4 text-amber-500" aria-label="Приватный вопрос — ответ не показывается партнёру" />
                )}
                {!currentQuestion.visibleToPartner && (
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                    Приватно
                  </span>
                )}
              </div>
              <CardTitle className="text-lg">{currentQuestion.text}</CardTitle>
            </CardHeader>
            <CardContent>
              {currentQuestion.type === 'LIKERT_1_5' && (
                <RadioGroup
                  value={answers[currentQuestion.id] as string}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, Number(value))}
                  className="grid grid-cols-5 gap-2 md:gap-4"
                >
                  {LIKERT_LABELS.map((label, index) => (
                    <label key={index} className={cn(
                      'relative cursor-pointer py-3 px-2 text-center text-sm font-medium rounded-lg transition-all',
                      answers[currentQuestion.id] === index + 1
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    )}>
                      <input
                        type="radio"
                        value={String(index + 1)}
                        className="sr-only peer"
                      />
                      <span className="block">{index + 1}</span>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-xs opacity-0 peer-checked:opacity-100 transition-opacity white-space-nowrap">
                        {label}
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              )}

              {currentQuestion.type === 'SINGLE_CHOICE' && currentQuestion.options && (
                <RadioGroup
                  value={answers[currentQuestion.id] as string}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                  className="space-y-2"
                >
                  {currentQuestion.options.map((option, index) => (
                    <label key={index} className={cn(
                      'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border',
                      answers[currentQuestion.id] === option
                        ? 'bg-rose-50 border-rose-500 dark:bg-rose-950/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    )}>
                      <input
                        type="radio"
                        value={option}
                        className="h-4 w-4 text-rose-500 focus:ring-rose-500"
                      />
                      <span className="text-slate-950 dark:text-slate-50">{option}</span>
                    </label>
                  ))}
                </RadioGroup>
              )}

              {currentQuestion.type === 'MULTIPLE_CHOICE' && currentQuestion.options && (
                <div className="space-y-2">
                  {currentQuestion.options.map((option, index) => {
                    const selected = (answers[currentQuestion.id] as string[])?.includes(option) || false
                    return (
                      <label key={index} className={cn(
                        'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border',
                        selected
                          ? 'bg-rose-50 border-rose-500 dark:bg-rose-950/20'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      )}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => {
                            const current = (answers[currentQuestion.id] as string[]) || []
                            const updated = e.target.checked
                              ? [...current, option]
                              : current.filter((o) => o !== option)
                            handleAnswerChange(currentQuestion.id, updated)
                          }}
                          className="h-4 w-4 text-rose-500 rounded focus:ring-rose-500"
                        />
                        <span className="text-slate-950 dark:text-slate-50">{option}</span>
                      </label>
                    )
                  })}
                </div>
              )}

              {currentQuestion.type === 'TEXT' && (
                <Textarea
                  value={(answers[currentQuestion.id] as string) || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder="Ваш ответ..."
                  className="min-h-[120px]"
                  rows={5}
                />
              )}

              {/* Dimension hint */}
              <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
                Измерение: <span className="font-medium capitalize">{currentQuestion.dimension}</span>
                {currentQuestion.reverseScored && ' (инвертированная шкала)'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
            Назад
          </Button>
          <div className="flex items-center gap-2">
            {currentIndex < questions.length - 1 ? (
              <Button onClick={handleNext} disabled={!answers[currentQuestion?.id]}>
                Далее
              </Button>
            ) : canSubmit ? (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Завершить
                  </>
                ) : (
                  <>
                    Завершить опросник
                    <CheckCircle className="ml-2 h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </Button>
            ) : (
              <Button variant="outline" disabled>
                Ответьте на вопрос
              </Button>
            )}
          </div>
        </div>

        {/* Save indicator */}
        <div className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
          {saving ? (
            <span className="flex items-center justify-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              Сохранение...
            </span>
          ) : (
            'Ответы сохраняются автоматически'
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}