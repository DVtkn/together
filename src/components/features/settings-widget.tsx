'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { cn } from '@/lib/utils/cn'
import { SkeletonCard } from '@/components/skeleton-card'
import { signOut } from 'next-auth/react'
import { useProfile, useSettings, useCities } from '@/lib/hooks'
import type { ProfileUser } from '@/lib/hooks'
import { subscribeToPush, unsubscribeFromPush, testPush } from '@/lib/push-client'
import { DateInput } from '@/components/date-input'
import { toast } from '@/lib/toast'
import { parseRuDate, toRuDate } from '@/lib/dates'

interface UserSettings {
  name: string | null
  email: string
  pushEnabled: boolean
  emailEnabled: boolean
  weeklyPulseReminder: boolean
  challengeReminder: boolean
}

interface City {
  id: string
  slug: string
  name: string
  emoji: string
}

interface CoupleData {
  id: string
  status: string
  partnerA: { name: string | null; id: string }
  partnerB: { name: string | null; id: string }
  relationshipStart: string | null
}

interface SettingsInitial {
  settingsRes: { settings?: Record<string, unknown>; couple: CoupleData | null } | null
  citiesRes: { cities: City[] } | null
  profileRes: { user: ProfileUser | null; couple?: { partnerName: string | null } | null } | null
  signals: Array<{ id: string; emoji: string; meaning: string; suggestedReply: string }>
  theme: 'aurora' | 'night'
}

export default function SettingsWidget({ initial }: { initial: SettingsInitial }) {
  const router = useRouter()
  const initialSettings = (initial.settingsRes?.settings ?? {}) as unknown as UserSettings
  const [settings, setSettings] = useState<UserSettings>({
    name: initialSettings.name ?? null,
    email: initialSettings.email ?? '',
    pushEnabled: initialSettings.pushEnabled ?? true,
    emailEnabled: initialSettings.emailEnabled ?? true,
    weeklyPulseReminder: initialSettings.weeklyPulseReminder ?? true,
    challengeReminder: initialSettings.challengeReminder ?? true,
  })
  const [couple, setCouple] = useState<CoupleData | null>(initial.settingsRes?.couple ?? null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [leaveText, setLeaveText] = useState('')
  const [deleteText, setDeleteText] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [cities, setCities] = useState<City[]>([])
  const [cityId, setCityId] = useState<string | null>(null)
  const [linkUsername, setLinkUsername] = useState('')
  const [linking, setLinking] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [startDateOpen, setStartDateOpen] = useState(false)

  const [signals, setSignals] = useState<Array<{ id: string; emoji: string; meaning: string; suggestedReply: string }>>(initial.signals)
  const [sigEmoji, setSigEmoji] = useState('🤗')
  const [sigMeaning, setSigMeaning] = useState('')
  const [sigReply, setSigReply] = useState('')
  const [theme, setTheme] = useState<'aurora' | 'night'>(initial.theme)

  const [pushStatus, setPushStatus] = useState<'unsupported' | 'default' | 'granted' | 'denied' | 'loading'>('loading')
  const [pushSubscribed, setPushSubscribed] = useState(false)

  const { data: settingsRes, mutate: mutateSettings } = useSettings(initial.settingsRes ?? undefined)
  const { data: citiesRes } = useCities(initial.citiesRes ?? undefined)
  const { data: profileRes, mutate: mutateProfile } = useProfile(initial.profileRes ?? undefined)

  useEffect(() => {
    // hydrate settings form once data arrives (one-time init, not derived state)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (settingsRes?.settings) setSettings(settingsRes.settings as unknown as UserSettings)
    setCouple(settingsRes?.couple ?? null)
    setCities(citiesRes?.cities || [])
    setCityId(profileRes?.user?.city?.id || null)
    if (settingsRes || citiesRes || profileRes) setLoading(false)
  }, [settingsRes, citiesRes, profileRes])

  useEffect(() => {
    async function checkPushStatus() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushStatus('unsupported')
        return
      }
      setPushStatus('loading')
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          setPushStatus('granted')
          setPushSubscribed(true)
        } else {
          const perm = Notification.permission
          setPushStatus(perm === 'granted' ? 'granted' : perm === 'denied' ? 'denied' : 'default')
        }
      } catch {
        setPushStatus('default')
      }
    }
    checkPushStatus()
  }, [])

  useEffect(() => {
    if (settingsRes?.couple) {
      fetch('/api/signals').then(r => r.json()).then(d => {
        if (d?.signals) setSignals(d.signals)
      }).catch(() => {})
    }
  }, [settingsRes])

  useEffect(() => {
    setTheme(document.body.classList.contains('night') ? 'night' : 'aurora')
    fetch('/api/user/theme').then(r => r.json()).then(d => setTheme(d?.theme === 'night' ? 'night' : 'aurora')).catch(() => {})
  }, [])

  useEffect(() => {
    if (loading) return
    if (window.location.hash === '#signals') {
      const el = document.getElementById('signals')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [loading])

  const addSignal = async () => {
    if (sigMeaning.trim().length < 2 || sigReply.trim().length < 2) return
    const r = await fetch('/api/signals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji: sigEmoji || '🤗', meaning: sigMeaning.trim(), suggestedReply: sigReply.trim() }),
    })
    if (r.ok) {
      const d = await r.json()
      setSignals(prev => [...prev, d.signal])
      setSigMeaning('')
      setSigReply('')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Настройки сохранены' })
        mutateSettings()
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.error || 'Ошибка сохранения' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Ошибка сети' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCity = async (value: string) => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cityId: value || null }),
      })
      if (res.ok) {
        setCityId(value || null)
        setMessage({ type: 'success', text: 'Город обновлён — подборки мест станут актуальнее' })
        mutateProfile()
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.error || 'Ошибка сохранения города' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Ошибка сети' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteText.trim().toLowerCase() !== 'delete') return
    setDeleting(true)
    try {
      const res = await fetch('/api/user/delete', { method: 'DELETE' })
      if (res.ok) {
        signOut({ callbackUrl: '/signin' })
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.error || 'Ошибка удаления' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Ошибка сети' })
    } finally {
      setDeleting(false)
    }
  }

  const handleTogglePush = async (checked: boolean) => {
    setSettings((s) => ({ ...s, pushEnabled: checked }))
    if (checked) {
      const ok = await subscribeToPush()
      if (!ok) {
        setMessage({ type: 'error', text: 'Не удалось включить push-уведомления. Проверьте разрешения браузера.' })
        setSettings((s) => ({ ...s, pushEnabled: false }))
      } else {
        setMessage({ type: 'success', text: 'Push-уведомления включены' })
      }
    } else {
      await unsubscribeFromPush()
      setMessage({ type: 'success', text: 'Push-уведомления выключены' })
    }
  }

  const enablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('unsupported')
      setMessage({ type: 'error', text: 'Push не поддерживается в этом браузере' })
      return
    }
    setPushStatus('loading')
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') {
      setPushStatus('denied')
      setMessage({ type: 'error', text: 'Разрешение не дано. Включите в настройках браузера/системы.' })
      return
    }
    const ok = await subscribeToPush()
    if (ok) {
      setPushStatus('granted')
      setPushSubscribed(true)
      setMessage({ type: 'success', text: 'Push-уведомления включены' })
      await handleTestPush()
    } else {
      setPushStatus('default')
      setMessage({ type: 'error', text: 'Не удалось сохранить подписку' })
    }
  }

  const handleTestPush = async () => {
    const res = await testPush()
    if (res.ok) {
      setMessage({ type: 'success', text: 'Тест-уведомление отправлено ✓' })
    } else {
      setMessage({ type: 'error', text: res.error || 'Ошибка отправки теста' })
    }
  }

  const handleLeaveCouple = async () => {
    if (leaveText.trim().toLowerCase() !== 'leave') return
    setDeleting(true)
    try {
      const res = await fetch('/api/couples/leave', { method: 'POST' })
      if (res.ok) {
        router.push('/dashboard?left=true')
        router.refresh()
        await mutateSettings()
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.error || 'Ошибка' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Ошибка сети' })
    } finally {
      setDeleting(false)
    }
  }

  const handleLinkPartner = async () => {
    const username = linkUsername.trim()
    if (!username) {
      setMessage({ type: 'error', text: 'Укажите логин партнёра' })
      return
    }
    setLinking(true)
    setMessage(null)
    try {
      const res = await fetch('/api/couples/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: username }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Инвайт отправлен. Партнёр примет его в разделе «Пара», и пара станет общей.' })
        setLinkUsername('')
        await mutateSettings()
        router.refresh()
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.error || 'Не удалось создать пару' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Ошибка сети' })
    } finally {
      setLinking(false)
    }
  }

  const handleTheme = async (t: 'aurora' | 'night') => {
    setTheme(t)
    document.body.classList.remove('aurora', 'night')
    document.body.classList.add(t)
    try {
      localStorage.setItem('loop:theme', t)
      document.cookie = `loop:theme=${t};path=/;max-age=31536000;samesite=lax`
    } catch { /* ignore */ }
    try {
      const res = await fetch('/api/user/theme', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: t }),
      })
      if (!res.ok) throw new Error()
      toast('Тема сохранена')
    } catch {
      setMessage({ type: 'error', text: 'Не удалось сохранить тему' })
    }
    window.dispatchEvent(new Event('together:theme'))
  }

  if (loading) {
    return (
      <DashboardLayout user={{ name: null, email: '' }} couple={null}>
        <div className="h1">Настройки</div>
        <SkeletonCard count={3} />
      </DashboardLayout>
    )
  }

  const toggle = (key: keyof UserSettings) => () =>
    setSettings((s) => ({ ...s, [key]: !s[key] }))

  return (
    <DashboardLayout user={{ name: settings.name, email: settings.email }} couple={couple!}>
      <div className="h1">Настройки</div>
      <div className="dim">Профиль, уведомления, пара, данные.</div>
      <button className="btn btn-s mobile-back" onClick={() => router.back()}>← Назад</button>

      {message && (
        <div className={cn('notice', message.type === 'success' ? 'notice-amber' : 'notice-rose')} role="status">
          <span style={{ fontSize: 18 }} aria-hidden="true">{message.type === 'success' ? '✅' : '⚠️'}</span>
          <div>{message.text}</div>
        </div>
      )}

      <div className="k">Аккаунт</div>
      <div className="cd static">
        <div className="cd-r">
          <div className="cd-ic">👤</div>
          <div className="cd-t">
            <b>{profileRes?.user?.name || settings.name || 'Без имени'}</b>
            <span>{profileRes?.user?.email || settings.email || '—'}</span>
          </div>
        </div>
        <button className="btn btn-s btn-w" style={{ marginTop: 12 }} onClick={() => signOut({ callbackUrl: '/' })}>
          Выйти из аккаунта
        </button>
      </div>

      <div className="k">Профиль</div>
      <div className="cd static">
        <label className="field-label" htmlFor="name">Имя</label>
        <input
          id="name"
          className="input"
          value={settings.name || ''}
          onChange={(e) => setSettings((s) => ({ ...s, name: e.target.value || null }))}
          placeholder="Ваше имя"
        />
        <label className="field-label" style={{ marginTop: 12 }} htmlFor="email">Email</label>
        <input id="email" type="email" className="input" value={settings.email} disabled />
        <div className="small" style={{ marginTop: 6 }}>Email используется для входа. Смена пока недоступна.</div>

        <label className="field-label" style={{ marginTop: 12 }} htmlFor="city">Город</label>
        <select
          id="city"
          aria-label="Выбрать город"
          value={cityId || ''}
          onChange={(e) => handleSaveCity(e.target.value)}
          disabled={saving}
          className="input"
        >
          <option value="">Не выбран</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
          ))}
        </select>
        <div className="small" style={{ marginTop: 6 }}>Город нужен для подборок мест в «Куда пойти вдвоём».</div>

        <button className="btn btn-p btn-w" style={{ marginTop: 16 }} onClick={handleSave} disabled={saving}>
          'Сохранить профиль'
        </button>
      </div>

      <div className="k">Тема оформления</div>
      <div className="cd static">
        <div className="cd-t" style={{ padding: 0 }}>
          <b>Аврора или Ночь</b>
          <span>Переключается сразу и сохраняется для вашего аккаунта.</span>
        </div>
        <div className="theme-opt" style={{ marginTop: 14 }}>
          <button className={cn(theme === 'aurora' && 'on')} onClick={() => handleTheme('aurora')} aria-pressed={theme === 'aurora'}>
            <i>☀️</i>
            <b>Аврора</b>
            <span>Светлая, мягкая</span>
          </button>
          <button className={cn(theme === 'night' && 'on')} onClick={() => handleTheme('night')} aria-pressed={theme === 'night'}>
            <i>🌙</i>
            <b>Ночь</b>
            <span>Тёмная, глубокая</span>
          </button>
        </div>
      </div>

      <div className="k">Уведомления</div>
      <div className="cd static">
        <div className="cd-r">
          <div className="cd-ic">🔔</div>
          <div className="cd-t">
            <b>Push-уведомления</b>
            <span>
              {pushStatus === 'loading' ? 'проверка…' :
               pushStatus === 'unsupported' ? 'Push не поддерживается' :
               pushStatus === 'denied' ? 'запрещены в системе — Настройки iPhone → Уведомления → Loop' :
               pushSubscribed ? 'включены на этом устройстве ✓' : 'не включены'}
            </span>
          </div>
        </div>
        {pushStatus !== 'unsupported' && pushStatus !== 'denied' && (
          <>
            <button className="btn btn-p btn-w" style={{ marginTop: 12 }} onClick={enablePush} disabled={pushStatus === 'loading' || pushSubscribed}>
              {pushSubscribed ? 'Включены ✓' : 'Включить на этом устройстве'}
            </button>
            {pushSubscribed && (
              <button className="btn btn-s btn-w" style={{ marginTop: 8 }} onClick={handleTestPush} disabled={pushStatus === 'loading'}>
                🔔 Тест-уведомление
              </button>
            )}
          </>
        )}
        <span className="small">На iPhone: открывайте Loop с иконки на экране «Дом» и включайте здесь — разрешение из Safari не переносится.</span>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 18 }}>
          <div className="cd-t" style={{ padding: 0 }}>
            <b>Email-уведомления</b>
            <span>Письма на email</span>
          </div>
          <button className={cn('tgl', settings.emailEnabled && 'on')} onClick={toggle('emailEnabled')} role="switch" aria-checked={settings.emailEnabled} aria-label="Email-уведомления" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 18 }}>
          <div className="cd-t" style={{ padding: 0 }}>
            <b>Еженедельный пульс</b>
            <span>Напоминание заполнить чек-ин в понедельник</span>
          </div>
          <button className={cn('tgl', settings.weeklyPulseReminder && 'on')} onClick={toggle('weeklyPulseReminder')} role="switch" aria-checked={settings.weeklyPulseReminder} aria-label="Еженедельный пульс" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 18 }}>
          <div className="cd-t" style={{ padding: 0 }}>
            <b>Новые челленджи</b>
            <span>Сообщить, когда появится челлендж недели</span>
          </div>
          <button className={cn('tgl', settings.challengeReminder && 'on')} onClick={toggle('challengeReminder')} role="switch" aria-checked={settings.challengeReminder} aria-label="Новые челленджи" />
        </div>
        <button className="btn btn-s btn-w" style={{ marginTop: 16 }} onClick={handleSave} disabled={saving}>
          'Сохранить уведомления'
        </button>
      </div>

      <div className="k">Пара</div>
      {!couple ? (
        <div className="cd static">
          <div className="cd-t" style={{ padding: 0 }}>
            <b>Создать пару</b>
            <span>Свяжите аккаунты: общие опросники, челленджи, места и Психолог станут доступны обоим.</span>
          </div>
          <label className="field-label" style={{ marginTop: 14 }} htmlFor="partner-username">Логин партнёра</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="partner-username"
              className="input"
              value={linkUsername}
              onChange={(e) => setLinkUsername(e.target.value)}
              placeholder="Например: sveta"
              disabled={linking}
            />
            <button className="btn btn-p" onClick={handleLinkPartner} disabled={linking || !linkUsername.trim()}>
              Связать
            </button>
          </div>
          <div className="small" style={{ marginTop: 6 }}>У партнёра должен быть аккаунт, и он не должен состоять в другой паре. Инвайт действует 72 часа.</div>
        </div>
      ) : (
        <div className="cd static">
          <div className="cd-t" style={{ padding: 0 }}>
            <b>Ваша пара</b>
            <span>Статус: {couple.status === 'ACTIVE' ? 'Активна' : couple.status === 'PENDING' ? 'Ожидание партнёра' : 'Архив'}</span>
          </div>

          {couple.status === 'PENDING' && (
            <div className="notice notice-amber" style={{ marginTop: 12 }}>
              <span style={{ fontSize: 18 }} aria-hidden="true">⏳</span>
              <div><strong>Партнёр ещё не присоединился.</strong> Приглашение действует 7 дней.</div>
            </div>
          )}

          {couple.status === 'ACTIVE' && (
            <>
              <div className="avs" style={{ marginTop: 14 }}>
                <div className="av" style={{ width: 40, height: 40, fontSize: 15 }}>{couple.partnerA.name?.charAt(0).toUpperCase() || 'А'}</div>
                <div className="av p" style={{ width: 40, height: 40, fontSize: 15 }}>{couple.partnerB.name?.charAt(0).toUpperCase() || 'Б'}</div>
              </div>
              <div className="small" style={{ marginTop: 10 }}>
                {couple.partnerA.name || 'Партнёр А'} · {couple.partnerB.name || 'Партнёр Б'}
                {couple.relationshipStart && ` · вместе с ${new Date(couple.relationshipStart).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`}
              </div>

              {!startDateOpen ? (
                <button className="link-btn" style={{ marginTop: 8 }} onClick={() => {
                  if (couple.relationshipStart) setStartDate(toRuDate(couple.relationshipStart))
                  setStartDateOpen(true)
                }}>📅 Дата начала отношений</button>
              ) : (
                <div style={{ maxWidth: 220, marginTop: 10 }}>
                  <DateInput value={startDate} onChange={setStartDate} autoFocus />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      className="btn btn-p btn-sm"
                      style={{ flex: 1 }}
                      disabled={!parseRuDate(startDate) || saving}
                      onClick={async () => {
                        if (!parseRuDate(startDate)) return
                        setSaving(true)
                        try {
                          const r = await fetch('/api/couple', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ relationshipStart: startDate }),
                          })
                          if (r.ok) {
                            setCouple(prev => prev ? { ...prev, relationshipStart: startDate } : prev)
                            setStartDateOpen(false)
                            toast('Счётчик обновлён')
                            window.dispatchEvent(new Event('together:refresh'))
                          } else {
                            const j = await r.json().catch(() => ({}))
                            toast(j.error || 'Не получилось')
                          }
                        } finally { setSaving(false) }
                      }}
                    >Сохранить</button>
                    <button className="btn btn-s btn-sm" style={{ flex: 1 }} onClick={() => setStartDateOpen(false)}>Отмена</button>
                  </div>
                </div>
              )}

              <Link href="/dashboard/story" className="cd" style={{ marginTop: 14, textDecoration: 'none' }}>
                <div className="cd-r">
                  <div className="cd-ic">📖</div>
                  <div className="cd-t">
                    <b>История пары</b>
                    <span>Таймлайн: тесты, свидания, достижения</span>
                  </div>
                  <span className="arr">›</span>
                </div>
              </Link>

              <div className="notice notice-rose" style={{ marginTop: 14 }}>
                <span style={{ fontSize: 18 }} aria-hidden="true">🚪</span>
                <div>
                  <strong>Покинуть пару нельзя отменить.</strong> Совместные данные станут недоступны, личная история останется.
                  <div className="small" style={{ marginTop: 8 }}>
                    Введите слово <b style={{ color: 'var(--warn)' }}>leave</b> для подтверждения
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="leave"
                      value={leaveText}
                      onChange={(e) => setLeaveText(e.target.value)}
                      disabled={deleting}
                    />
                    <button className="btn btn-danger" onClick={handleLeaveCouple} disabled={deleting || leaveText.trim().toLowerCase() !== 'leave'}>
                      {deleting ? '…' : 'Покинуть пару'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div id="signals" style={{ scrollMarginTop: 80 }}>
        <div className="k">Тихие сигналы</div>
        <div className="cd static">
          <div className="dim" style={{ fontSize: 12, marginBottom: 12 }}>
            Кнопка 🕊️ в углу экрана — один тап, и партнёр увидит сигнал с мягким ответом.
          </div>
        <div className="signal-list" style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
          {signals.map(s => (
            <div key={s.id} className="feed-item" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>{s.emoji}</span>
              <div style={{ flex: 1 }}>
                <b>{s.meaning}</b>
                <span className="small" style={{ display: 'block' }}>{s.suggestedReply}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" style={{ width: 56, textAlign: 'center' }} maxLength={4} value={sigEmoji} onChange={e => setSigEmoji(e.target.value)} aria-label="Эмодзи сигнала" />
            <input className="input" style={{ flex: 1 }} placeholder="Смысл: «Обними меня»" value={sigMeaning} onChange={e => setSigMeaning(e.target.value)} />
          </div>
          <input className="input" placeholder="Мягкий ответ: «Иду. Крепко обнимаю»" value={sigReply} onChange={e => setSigReply(e.target.value)} />
          <button className="btn btn-p btn-w" disabled={sigMeaning.trim().length < 2 || sigReply.trim().length < 2} onClick={addSignal}>Добавить сигнал</button>
        </div>
        </div>
      </div>

      <div className="k">Данные</div>
      <div className="cd static">
        <div className="cd-t" style={{ padding: 0 }}>
          <b>Экспорт данных (GDPR / 152-ФЗ)</b>
          <span>Скачать все ваши данные в JSON. Данные партнёра не включаются.</span>
        </div>
        <a href="/api/user/export" className="btn btn-s" style={{ marginTop: 12, textDecoration: 'none', display: 'inline-flex' }}>
          Скачать мои данные (JSON)
        </a>
      </div>

      <div className="cd static">
        <div className="cd-t" style={{ padding: 0 }}>
          <b style={{ color: 'var(--red)' }}>Удалить аккаунт</b>
          <span>Удалит все ваши данные: профиль, ответы, пульс, диалоги, пару. Необратимо.</span>
        </div>
        <div className="small" style={{ marginTop: 8 }}>
          Введите слово <b style={{ color: 'var(--warn)' }}>delete</b> для подтверждения
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
            type="text"
            className="auth-input"
            placeholder="delete"
            value={deleteText}
            onChange={(e) => setDeleteText(e.target.value)}
            disabled={deleting}
          />
          <button className="btn btn-danger" onClick={handleDeleteAccount} disabled={deleting || deleteText.trim().toLowerCase() !== 'delete'}>
            {deleting ? '…' : 'Удалить навсегда'}
          </button>
        </div>
      </div>

      <div className="notice notice-amber" style={{ marginTop: 20 }}>
        <span style={{ fontSize: 20 }} aria-hidden="true">⚠️</span>
        <div>
          <strong>Важно.</strong> Loop — инструмент самопознания, не медицинская услуга. При признаках кризиса или насилия обратитесь к специалисту.
        </div>
      </div>
    </DashboardLayout>
  )
}
