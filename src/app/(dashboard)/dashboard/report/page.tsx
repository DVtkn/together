'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { Line, OrbitControls } from '@react-three/drei'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ArrowLeft, Heart, Users, Target, MessageSquare, Sparkles, Shield, CheckCircle, AlertCircle } from 'lucide-react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const RADAR_AXES = [
  { key: 'communication', label: 'Коммуникация', icon: MessageSquare },
  { key: 'intimacy', label: 'Близость', icon: Heart },
  { key: 'values', label: 'Ценности', icon: Target },
  { key: 'conflict', label: 'Конфликты', icon: Sparkles },
  { key: 'support', label: 'Поддержка', icon: Users },
  { key: 'future', label: 'Будущее', icon: Shield },
]

interface ReportData {
  radarData: Record<string, number>
  strongSides: Array<{ title: string; description: string; evidence: string }>
  growthAreas: Array<{ title: string; description: string; risk: string; action: string }>
  recommendations: Array<{ title: string; description: string; axis: string; difficulty: number; durationMin: number }>
  constellationState: { distance: number; sync: number; colorHue: number; intensity: number }
  generatedAt: string
}

const ConstellationScene = ({ state, reducedMotion }: { state: ReportData['constellationState']; reducedMotion: boolean }) => {
  const groupRef = useRef<THREE.Group>(null!)

  useEffect(() => {
    if (!groupRef.current || reducedMotion) return
    const duration = 20000
    const start = Date.now()
    const animate = () => {
      const elapsed = (Date.now() - start) / duration
      const angle = elapsed * Math.PI * 2
      if (groupRef.current) {
        groupRef.current.rotation.y = angle
      }
      requestAnimationFrame(animate)
    }
    animate()
  }, [reducedMotion])

  const bodyColor = `hsl(${state.colorHue}, 70%, ${60 - state.intensity * 20}%)`
  const glowColor = `hsl(${state.colorHue}, 80%, 60%)`
  const distance = 2 + state.distance * 3

  return (
    <group ref={groupRef}>
      <OrbitControls enableZoom={false} enablePan={false} autoRotate={!reducedMotion} autoRotateSpeed={0.3} />

      {/* Connection line */}
      <Line
        points={[
          [-distance / 2, 0, 0],
          [distance / 2, 0, 0],
        ]}
        lineWidth={2}
        color={glowColor}
        opacity={0.3 * state.intensity}
        dashed={true}
        dashSize={0.1}
        gapSize={0.05}
      />

      {/* Partner A body */}
      <mesh position={[-distance / 2, 0, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={glowColor}
          emissiveIntensity={0.3 * state.intensity}
          transparent
          opacity={0.9}
          metalness={0.1}
          roughness={0.3}
        />
      </mesh>

      {/* Partner B body */}
      <mesh position={[distance / 2, 0, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={glowColor}
          emissiveIntensity={0.3 * state.intensity}
          transparent
          opacity={0.9}
          metalness={0.1}
          roughness={0.3}
        />
      </mesh>

      {/* Pulse rings */}
      {!reducedMotion && [0, 1].map((i) => (
        <PulseRing
          key={i}
          position={[-distance / 2, 0, 0]}
          color={glowColor}
          delay={i * 1.5}
          intensity={state.intensity}
        />
      ))}
      {!reducedMotion && [0, 1].map((i) => (
        <PulseRing
          key={`b-${i}`}
          position={[distance / 2, 0, 0]}
          color={glowColor}
          delay={i * 1.5 + 0.75}
          intensity={state.intensity}
        />
      ))}

      {/* Sync particles */}
      {!reducedMotion && state.sync > 0.3 && Array.from({ length: Math.floor(state.sync * 20) }).map((_, i) => (
        <SyncParticle key={i} distance={distance} color={glowColor} />
      ))}

      {/* Lights */}
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 5, 5]} intensity={1} color={glowColor} />
      <pointLight position={[0, -5, -5]} intensity={0.5} color={bodyColor} />
    </group>
  )
}

const PulseRing = ({ position, color, delay, intensity }: { position: [number, number, number]; color: string; delay: number; intensity: number }) => {
  const ref = useRef<THREE.Mesh>(null!)
  const [scale, setScale] = useState(1)
  const [opacity, setOpacity] = useState(0.5)

  useEffect(() => {
    const animate = () => {
      const t = (Date.now() / 1000 - delay) % 3
      const progress = t / 3
      setScale(1 + progress * 2)
      setOpacity(0.5 * (1 - progress) * intensity)
      requestAnimationFrame(animate)
    }
    const id = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(id)
  }, [delay, intensity])

  return (
    <mesh ref={ref} position={position} scale={scale}>
      <ringGeometry args={[1.2, 1.5, 32]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} side={2} />
    </mesh>
  )
}

const SyncParticle = ({ distance, color }: { distance: number; color: string }) => {
  const offsetRef = useRef(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    offsetRef.current = Math.random()
  }, [])

  useEffect(() => {
    const duration = 3000 + Math.random() * 2000
    const start = Date.now()
    const animate = () => {
      const elapsed = (Date.now() - start) / duration
      const p = (offsetRef.current + elapsed) % 1
      setProgress(p)
      requestAnimationFrame(animate)
    }
    const id = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(id)
  }, [])

  const x = -distance / 2 + distance * progress
  const y = Math.sin(progress * Math.PI * 4) * 0.3
  const z = Math.cos(progress * Math.PI * 4) * 0.3

  return (
    <mesh position={[x, y, z]} scale={0.05 + progress * 0.1}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={1 - progress} />
    </mesh>
  )
}

const RadarChart = ({ data }: { data: Record<string, number> }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null!)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const axes = RADAR_AXES
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 30

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Grid
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1
    for (let i = 1; i <= 5; i++) {
      const r = (radius / 5) * i
      ctx.beginPath()
      ctx.moveTo(centerX + r, centerY)
      for (let j = 0; j < axes.length; j++) {
        const angle = (j / axes.length) * Math.PI * 2 - Math.PI / 2
        ctx.lineTo(centerX + Math.cos(angle) * r, centerY + Math.sin(angle) * r)
      }
      ctx.closePath()
      ctx.stroke()
    }

    // Axes lines
    axes.forEach((_, i) => {
      const angle = (i / axes.length) * Math.PI * 2 - Math.PI / 2
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius)
      ctx.stroke()
    })

    // Data polygon
    ctx.fillStyle = 'rgba(244, 63, 94, 0.15)'
    ctx.strokeStyle = '#f43f5e'
    ctx.lineWidth = 2
    ctx.beginPath()
    axes.forEach((axis, i) => {
      const value = Math.max(0, Math.min(10, data[axis.key] || 0))
      const r = (value / 10) * radius
      const angle = (i / axes.length) * Math.PI * 2 - Math.PI / 2
      const x = centerX + Math.cos(angle) * r
      const y = centerY + Math.sin(angle) * r
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Labels
    ctx.fillStyle = '#1e293b'
    ctx.font = '12px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    axes.forEach((axis, i) => {
      const angle = (i / axes.length) * Math.PI * 2 - Math.PI / 2
      const x = centerX + Math.cos(angle) * (radius + 25)
      const y = centerY + Math.sin(angle) * (radius + 25)
      ctx.fillText(axis.label, x, y)
    })

    // Values
    ctx.fillStyle = '#f43f5e'
    ctx.font = 'bold 14px Inter, sans-serif'
    axes.forEach((axis, i) => {
      const value = (data[axis.key] || 0).toFixed(1)
      const r = ((data[axis.key] || 0) / 10) * radius + 15
      const angle = (i / axes.length) * Math.PI * 2 - Math.PI / 2
      const x = centerX + Math.cos(angle) * r
      const y = centerY + Math.sin(angle) * r
      ctx.fillText(value, x, y)
    })
  }, [data])

  return <canvas ref={canvasRef} width={300} height={300} className="mx-auto" />
}

export default function ReportPage() {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const reducedMotion = useReducedMotion()

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
      <DashboardLayout user={{ name: null, email: '', image: null }} couple={null}>
        <div className="space-y-6">
          <Card className="animate-pulse"><CardContent className="pt-6 h-96" /></Card>
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="pt-6 h-32" /></Card>
          ))}
        </div>
      </DashboardLayout>
    )
  }

  if (!report) {
    return (
      <DashboardLayout user={{ name: null, email: '', image: null }} couple={null}>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50 mb-2">Отчёт не найден</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">Пройдите все опросники вместе с партнёром, чтобы получить отчёт</p>
          <Button asChild>
            <Link href="/dashboard/assessments">Перейти к опросникам</Link>
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={{ name: null, email: '', image: null }} couple={null}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-950 dark:text-slate-50">Совместный отчёт</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Сгенерирован {new Date(report.generatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Constellation + Radar */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* 3D Constellation */}
          <Card className="h-[500px] lg:h-[600px]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-rose-500" aria-hidden="true" />
                <CardTitle>Созвездие пары</CardTitle>
              </div>
              <CardDescription>
                Картинка вашей связи: расстояние — близость, синхронность — общие цели, цвет — эмоциональный фон.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 h-[calc(100%-80px)]">
              <Canvas
                camera={{ position: [0, 0, 8], fov: 30 }}
                gl={{ antialias: true, alpha: true }}
                style={{ width: '100%', height: '100%' }}
              >
                <ConstellationScene state={report.constellationState} reducedMotion={reducedMotion} />
              </Canvas>
            </CardContent>
          </Card>

          {/* Radar Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-rose-500" aria-hidden="true" />
                <CardTitle>Радар совместимости</CardTitle>
              </div>
              <CardDescription>Оценка по 6 темам (0–10). Чем выше и ровнее фигура, тем увереннее вы друг в друге.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <RadarChart data={report.radarData} />
              <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                {RADAR_AXES.map((axis) => (
                  <div key={axis.key} className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <axis.icon className="h-5 w-5 mx-auto text-rose-500 mb-1" aria-hidden="true" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">{axis.label}</p>
                    <p className="text-2xl font-bold text-slate-950 dark:text-slate-50">{report.radarData[axis.key]?.toFixed(1) || '—'}</p>
                    <Progress value={(report.radarData[axis.key] || 0) * 10} className="mt-1 h-1" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Strong Sides */}
        {report.strongSides.length > 0 && (
          <Card className="mb-6 border-emerald-200 dark:border-emerald-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                <CardTitle>Сильные стороны вашей пары</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.strongSides.map((side, i) => (
                  <div key={i} className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                    <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-1">{side.title}</h4>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-2">{side.description}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Доказательство: {side.evidence}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Growth Areas */}
        {report.growthAreas.length > 0 && (
          <Card className="mb-6 border-rose-200 dark:border-rose-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-rose-500" aria-hidden="true" />
                <CardTitle>Зоны роста</CardTitle>
              </div>
              <CardDescription>То, над чем стоит поработать. У каждой зоны есть конкретный шаг.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.growthAreas.map((area, i) => (
                  <div key={i} className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-800">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center">
                        <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{i + 1}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-rose-800 dark:text-rose-200 mb-1">{area.title}</h4>
                        <p className="text-sm text-rose-700 dark:text-rose-300 mb-2">{area.description}</p>
                        <div className="grid sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded bg-rose-100 dark:bg-rose-950/50">
                            <span className="font-medium text-rose-600 dark:text-rose-400">Риск:</span>
                            <span className="ml-1 text-rose-700 dark:text-rose-300">{area.risk}</span>
                          </div>
                          <div className="p-2 rounded bg-emerald-100 dark:bg-emerald-950/50">
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">Действие:</span>
                            <span className="ml-1 text-emerald-700 dark:text-emerald-300">{area.action}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-rose-500" aria-hidden="true" />
                <CardTitle>Рекомендации на эту неделю</CardTitle>
              </div>
              <CardDescription>Небольшие шаги на неделю, собранные под ваши зоны роста. Лучше делать вместе.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center">
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{i + 1}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-950 dark:text-slate-50 mb-1">{rec.title}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{rec.description}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                          Ось: {rec.axis}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                          Сложность: {rec.difficulty}/3
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                          {rec.durationMin} мин
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Disclaimer */}
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">Важно помнить</p>
                <p>Together — инструмент самопознания и коммуникации, <strong>не медицинская и не психотерапевтическая услуга</strong>. Результаты не являются диагнозом. Отчёт — повод поговорить, а не приговор. При признаках кризиса или насилия — обратитесь к специалисту.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}