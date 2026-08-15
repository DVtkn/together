'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { User, Bell, Trash2, AlertTriangle, Loader2, Heart, Users } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { signOut } from 'next-auth/react'
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

  useEffect(() => {
    Promise.all([
      fetch('/api/user/settings').then((res) => res.json()),
      fetch('/api/cities').then((res) => res.json()),
      fetch('/api/user/profile').then((res) => res.json()),
    ])
      .then(([settingsRes, citiesRes, profileRes]) => {
        setSettings(settingsRes.settings)
        setCouple(settingsRes.couple)
        setCities(citiesRes.cities || [])
        setCityId(profileRes.user?.city?.id || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])
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
        const settingsRes = await fetch('/api/user/settings').then((r) => r.json())
        setCouple(settingsRes.couple)
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
      <DashboardLayout user={{ name: null, email: '', image: null }} couple={null}>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="pt-6 h-32" /></Card>
          ))}
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={{ name: settings.name, email: settings.email, image: null }} couple={couple!}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-950 dark:text-slate-50">Настройки</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Управление профилем, уведомлениями и парой</p>
        </div>

        {message && (
          <div className={cn(
            'p-4 rounded-lg text-sm flex items-center gap-2',
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
          )}>
            {message.type === 'success' ? <Heart className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            {message.text}
          </div>
        )}

        {/* Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-rose-500" aria-hidden="true" />
              <CardTitle>Профиль</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={settings.name || ''}
                onChange={(e) => setSettings((s) => ({ ...s, name: e.target.value || null }))}
                placeholder="Ваше имя"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={settings.email} disabled className="bg-slate-50 dark:bg-slate-800" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Email используется для входа. Смена email пока недоступна.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Город</Label>
              <select
                id="city"
                aria-label="Выбрать город"
                value={cityId || ''}
                onChange={(e) => handleSaveCity(e.target.value)}
                disabled={saving}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-950 dark:text-slate-50 disabled:opacity-50"
              >
                <option value="">Не выбран</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Город нужен, чтобы страница «Места» показывала подходящие рестораны и прогулки.
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Сохранение...</> : 'Сохранить профиль'}
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-rose-500" aria-hidden="true" />
              <CardTitle>Уведомления</CardTitle>
            </div>
            <CardDescription>Настройте, как получать напоминания</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-950 dark:text-slate-50">Push-уведомления</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Получать уведомления в браузере</p>
              </div>
              <Switch
                checked={settings.pushEnabled}
                onCheckedChange={(checked) => handleTogglePush(checked)}
                disabled={saving}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-950 dark:text-slate-50">Email-уведомления</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Получать письма на email</p>
              </div>
              <Switch
                checked={settings.emailEnabled}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, emailEnabled: checked }))}
                disabled={saving}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-950 dark:text-slate-50">Еженедельный пульс</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Напоминание заполнить чек-ин в понедельник</p>
              </div>
              <Switch
                checked={settings.weeklyPulseReminder}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, weeklyPulseReminder: checked }))}
                disabled={saving || !settings.pushEnabled && !settings.emailEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-950 dark:text-slate-50">Новые челленджи</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Сообщить, когда появится новый челлендж недели</p>
              </div>
              <Switch
                checked={settings.challengeReminder}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, challengeReminder: checked }))}
                disabled={saving || !settings.pushEnabled && !settings.emailEnabled}
              />
            </div>

            <Button onClick={handleSave} disabled={saving} variant="secondary">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Сохранение...</> : 'Сохранить уведомления'}
            </Button>
          </CardContent>
        </Card>

        {/* Couple Management */}
        {!couple && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-rose-500" aria-hidden="true" />
                <CardTitle>Создать пару</CardTitle>
              </div>
              <CardDescription>
                Свяжите аккаунты: общие опросники, челленджи, места и диалог с ИИ-психологом станут доступны обоим.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="partner-username">Логин партнёра</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="partner-username"
                    value={linkUsername}
                    onChange={(e) => setLinkUsername(e.target.value)}
                    placeholder="Например: sveta"
                    disabled={linking}
                  />
                  <Button onClick={handleLinkPartner} disabled={linking || !linkUsername.trim()}>
                    {linking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Связать
                  </Button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Второй человек должен иметь зарегистрированный аккаунт и пока не состоять в другой паре.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {couple && (
          <Card className="border-amber-200 dark:border-amber-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-500" aria-hidden="true" />
                <CardTitle>Ваша пара</CardTitle>
              </div>
              <CardDescription>Статус: {couple.status === 'ACTIVE' ? 'Активна' : couple.status === 'PENDING' ? 'Ожидание партнёра' : 'Архив'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {couple.status === 'PENDING' && (
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">Партнёр ещё не присоединился</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">Приглашение действует 7 дней. Вы можете отправить ссылку повторно.</p>
                  <Button asChild variant="outline">
                    <a href="/dashboard/settings#invite">Управлять приглашением</a>
                  </Button>
                </div>
              )}

              {couple.status === 'ACTIVE' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center">
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                          {couple.partnerA.name?.charAt(0).toUpperCase() || 'А'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-950 dark:text-slate-500">{couple.partnerA.name || 'Партнёр А'}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Инициатор пары</p>
                      </div>
                    </div>
                    {couple.startedAt && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">Вместе с {new Date(couple.startedAt).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">
                          {couple.partnerB.name?.charAt(0).toUpperCase() || 'Б'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-950 dark:text-slate-500">{couple.partnerB.name || 'Партнёр Б'}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Присоединился по приглашению</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Покинуть пару нельзя отменить: связь с партнёром удалится. Личная история останется у каждого, а совместные данные станут недоступны.</p>
                    <div className="flex items-center gap-3">
                      <Input
                        type="text"
                        placeholder="Введите LEAVE для подтверждения"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        className="w-48"
                        disabled={deleting}
                      />
                      <Button variant="destructive" onClick={handleLeaveCouple} disabled={deleting || deletePassword !== 'LEAVE'}>
                        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Покинуть пару'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Danger Zone */}
        <Card className="border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" aria-hidden="true" />
              <CardTitle className="text-red-700 dark:text-red-300">Опасная зона</CardTitle>
            </div>
            <CardDescription>Необратимые действия</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-red-700 dark:text-red-300 mb-2">Удалить аккаунт полностью</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Это удалит <strong>все ваши данные</strong>: профиль, ответы на опросники, историю пульса, диалоги с ИИ, участие в паре.
                Данные партнёра (если вы в паре) сохранятся, но пара будет разорвана.
                <br /><br />
                Введите <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-mono">DELETE</code> для подтверждения.
              </p>
              <div className="flex items-center gap-3">
                <Input
                  type="text"
                  placeholder="Введите DELETE для подтверждения"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-48"
                  disabled={deleting}
                />
                <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting || deletePassword !== 'DELETE'}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Удалить аккаунт навсегда'}
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium text-red-700 dark:text-red-300 mb-2">Экспорт данных (GDPR / 152-ФЗ)</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Скачать все ваши данные в JSON: профиль, ответы на опросники (ваши), пульс-чекины, историю ИИ-чатов.
                Данные партнёра не включаются.
              </p>
              <Button variant="outline" asChild>
                <a href="/api/user/export">Скачать мои данные (JSON)</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">Важно</p>
                <p>Together — инструмент самопознания и коммуникации, <strong>не медицинская и не психотерапевтическая услуга</strong>. Результаты не являются диагнозом. При признаках кризиса или насилия — обратитесь к специалисту.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}