'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { cn } from '@/lib/utils/cn'
import { SkeletonCard } from '@/components/skeleton-card'
import { signOut } from 'next-auth/react'
import { useProfile, useSettings as useSettingsSWR, useCities } from '@/lib/hooks'
import { subscribeToPush, unsubscribeFromPush } from '@/lib/push-client'

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
  startedAt: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<UserSettings>({
    name: null,
    email: '',
    pushEnabled: true,
    emailEnabled: true,
    weeklyPulseReminder: true,
    challengeReminder: true,
  })
  const [couple, setCouple] = useState<CoupleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [cities, setCities] = useState<City[]>([])
  const [cityId, setCityId] = useState<string | null>(null)
  const [linkUsername, setLinkUsername] = useState('')
  const [linking, setLinking] = useState(false)

  const { data: settingsRes, mutate: mutateSettings } = useSettingsSWR()
  const { data: citiesRes } = useCities()
  const { data: profileRes, mutate: mutateProfile } = useProfile()

  useEffect(() => {
    // hydrate settings form once data arrives (one-time init, not derived state)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (settingsRes?.settings) setSettings(settingsRes.settings as unknown as UserSettings)
    setCouple(settingsRes?.couple ?? null)
    setCities(citiesRes?.cities || [])
    setCityId(profileRes?.user?.city?.id || null)
    if (settingsRes || citiesRes || profileRes) setLoading(false)
  }, [settingsRes, citiesRes, profileRes])

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
    if (deletePassword !== 'DELETE') return
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

  const handleLeaveCouple = async () => {
    if (deletePassword !== 'LEAVE') return
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
        setMessage({ type: 'success', text: 'Пара создана! Пригласите партнёра войти в аккаунт — общие данные станут доступны сразу.' })
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

      {message && (
        <div className={cn('notice', message.type === 'success' ? 'notice-amber' : 'notice-rose')} role="status">
          <span style={{ fontSize: 18 }} aria-hidden="true">{message.type === 'success' ? '✅' : '⚠️'}</span>
          <div>{message.text}</div>
        </div>
      )}

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
          {saving ? 'Сохранение…' : 'Сохранить профиль'}
        </button>
      </div>

      <div className="k">Уведомления</div>
      <div className="cd static">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div className="cd-t" style={{ padding: 0 }}>
            <b>Push-уведомления</b>
            <span>Получать уведомления в браузере</span>
          </div>
          <button className={cn('tgl', settings.pushEnabled && 'on')} onClick={() => handleTogglePush(!settings.pushEnabled)} role="switch" aria-checked={settings.pushEnabled} aria-label="Push-уведомления" />
        </div>
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
          {saving ? 'Сохранение…' : 'Сохранить уведомления'}
        </button>
      </div>

      <div className="k">Пара</div>
      {!couple ? (
        <div className="cd static">
          <div className="cd-t" style={{ padding: 0 }}>
            <b>Создать пару</b>
            <span>Свяжите аккаунты: общие опросники, челленджи, места и Сова станут доступны обоим.</span>
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
          <div className="small" style={{ marginTop: 6 }}>У партнёра должен быть аккаунт, и он не должен состоять в другой паре.</div>
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
                {couple.startedAt && ` · вместе с ${new Date(couple.startedAt).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`}
              </div>

              <div className="notice notice-rose" style={{ marginTop: 14 }}>
                <span style={{ fontSize: 18 }} aria-hidden="true">🚪</span>
                <div>
                  <strong>Покинуть пару нельзя отменить.</strong> Совместные данные станут недоступны, личная история останется.
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="Введите LEAVE"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      disabled={deleting}
                    />
                    <button className="btn btn-dg" onClick={handleLeaveCouple} disabled={deleting || deletePassword !== 'LEAVE'}>
                      Покинуть пару
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

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
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
            type="text"
            className="input"
            placeholder="Введите DELETE"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            disabled={deleting}
          />
          <button className="btn btn-dg" onClick={handleDeleteAccount} disabled={deleting || deletePassword !== 'DELETE'}>
            {deleting ? '…' : 'Удалить навсегда'}
          </button>
        </div>
      </div>

      <div className="notice notice-amber" style={{ marginTop: 20 }}>
        <span style={{ fontSize: 20 }} aria-hidden="true">⚠️</span>
        <div>
          <strong>Важно.</strong> Together — инструмент самопознания, не медицинская услуга. При признаках кризиса или насилия обратитесь к специалисту.
        </div>
      </div>
    </DashboardLayout>
  )
}
