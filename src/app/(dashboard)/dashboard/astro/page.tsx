'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { computeZodiac } from '@/lib/astro/zodiac'
import { computeNatalChart } from '@/lib/astro/ephemeris'
import { computeSynastry } from '@/lib/astro/synastry'

export default function AstroPage() {
  const [myDob, setMyDob] = useState<string>('')
  const [partnerDob, setPartnerDob] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('astro-partner-dob') ?? ''
  })
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<ReturnType<typeof computeSynastry> | null>(null)
  const [myZodiac, setMyZodiac] = useState<ReturnType<typeof computeZodiac> | null>(null)
  const [partnerZodiac, setPartnerZodiac] = useState<ReturnType<typeof computeZodiac> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/user/profile')
      .then((r) => r.json())
      .then((p) => {
        if (p.user?.dateOfBirth) {
          const d = new Date(p.user.dateOfBirth)
          setMyDob(d.toISOString().slice(0, 10))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleCalculate = () => {
    setError(null)
    if (!myDob || !partnerDob) {
      setError('Укажите обе даты рождения')
      return
    }
    localStorage.setItem('astro-partner-dob', partnerDob)
    try {
      const z1 = computeZodiac(new Date(myDob))
      const z2 = computeZodiac(new Date(partnerDob))
      setMyZodiac(z1)
      setPartnerZodiac(z2)

      const chart1 = computeNatalChart(new Date(myDob))
      const chart2 = computeNatalChart(new Date(partnerDob))
      const syn = computeSynastry(
        chart1.planetPositions,
        chart2.planetPositions,
        { animal: z1.chineseZodiac, element: z1.chineseElement },
        { animal: z2.chineseZodiac, element: z2.chineseElement }
      )
      setResult(syn)
    } catch (e) {
      console.error('Synastry failed:', e)
      setError('Не удалось рассчитать. Проверьте даты.')
    }
  }

  if (loading) {
    return (
      <DashboardLayout user={{ name: null, email: '' }} couple={null}>
        <div className="loading-screen">
          <div className="loading-icon">🔮</div>
          <div className="loading-text">Загружаем</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={{ name: null, email: '' }} couple={null}>
      <div className="h1">Синастрия</div>
      <div className="dim">Совместимость по датам рождения. Развлечение и повод поговорить.</div>

      <div className="cd static mt">
        <label className="field-label" htmlFor="astro-my">Моя дата рождения</label>
        <input
          id="astro-my"
          type="date"
          className="input"
          value={myDob}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setMyDob(e.target.value)}
        />

        <label className="field-label" style={{ marginTop: 14 }} htmlFor="astro-partner">Дата рождения партнёра</label>
        <input
          id="astro-partner"
          type="date"
          className="input"
          value={partnerDob}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setPartnerDob(e.target.value)}
        />

        {error && (
          <div className="notice notice-amber" style={{ marginTop: 12 }}>
            <span style={{ fontSize: 18 }} aria-hidden="true">⚠️</span>
            <div>{error}</div>
          </div>
        )}

        <button className="btn btn-p btn-w" style={{ marginTop: 16 }} onClick={handleCalculate}>
          Рассчитать совместимость
        </button>
      </div>

      {myZodiac && partnerZodiac && result && (
        <>
          <div className="stats" style={{ marginTop: 24 }}>
            <div className="st">
              <b>{result.overallScore}%</b>
              <span>совместимость</span>
            </div>
            <div className="st">
              <b>{myZodiac.zodiacSignRu} + {partnerZodiac.zodiacSignRu}</b>
              <span>знаки зодиака</span>
            </div>
            <div className="st">
              <b>{result.chineseCompatibility.score}</b>
              <span>восточный гороскоп</span>
            </div>
          </div>

          <div className="cd static">
            <div className="cd-r">
              <div className="cd-ic">🌞</div>
              <div className="cd-t">
                <b>Знаки</b>
                <span>Вы — {myZodiac.zodiacSignRu} ({myZodiac.chineseZodiacRu}, {myZodiac.chineseElementRu}). Партнёр — {partnerZodiac.zodiacSignRu} ({partnerZodiac.chineseZodiacRu}, {partnerZodiac.chineseElementRu}).</span>
              </div>
            </div>
            <div className="small" style={{ marginTop: 8, color: 'var(--mute)' }}>Ориентировочно (без точного времени рождения).</div>
          </div>

          {result.textualSummary.strengths.length > 0 && (
            <>
              <div className="k">Сила</div>
              {result.textualSummary.strengths.map((s, i) => (
                <div key={i} className="cd static">
                  <div className="cd-r">
                    <div className="cd-ic">💫</div>
                    <div className="cd-t"><span>{s}</span></div>
                  </div>
                </div>
              ))}
            </>
          )}

          {result.textualSummary.growthAreas.length > 0 && (
            <>
              <div className="k">Рост</div>
              {result.textualSummary.growthAreas.map((s, i) => (
                <div key={i} className="cd static">
                  <div className="cd-r">
                    <div className="cd-ic">⚡</div>
                    <div className="cd-t"><span>{s}</span></div>
                  </div>
                </div>
              ))}
            </>
          )}

          {result.aspects.length > 0 && (
            <>
              <div className="k">Аспекты планет</div>
              <div className="feed">
                {result.aspects.slice(0, 8).map((a, i) => (
                  <div key={i} className="feed-item">
                    <b>{a.planet1} {a.aspect} {a.planet2}</b>
                    <span>
                      {a.interpretation}
                      <span className="small"> · орбис {a.orb}°</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="notice notice-amber" style={{ marginTop: 20 }}>
            <span style={{ fontSize: 20 }} aria-hidden="true">🧭</span>
            <div>
              <strong>Важно.</strong> Астрология — не наука. Используйте результат как повод обсудить отношения, а не как приговор.
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
