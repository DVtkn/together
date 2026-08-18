'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ResetForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 4) { setMsg({ type: 'error', text: 'Пароль должен быть не короче 4 символов' }); return }
    if (password !== confirm) { setMsg({ type: 'error', text: 'Пароли не совпадают' }); return }
    setBusy(true); setMsg(null)
    try {
      const r = await fetch('/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const j = await r.json()
      if (r.ok) {
        setMsg({ type: 'success', text: 'Пароль обновлён. Теперь войдите с новым паролем.' })
      } else {
        setMsg({ type: 'error', text: j.error || 'Не получилось сбросить пароль' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Ошибка сети. Попробуйте позже.' })
    } finally { setBusy(false) }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Link href="/" className="logo" style={{ justifyContent: 'center' }}><i>∞</i>Loop</Link>
        <div className="h2" style={{ textAlign: 'center', marginTop: 16 }}>Новый пароль</div>
        <div className="dim" style={{ textAlign: 'center' }}>Придумайте новый пароль для входа</div>

        <form onSubmit={submit} style={{ marginTop: 20 }}>
          <label className="auth-label" htmlFor="password">Новый пароль</label>
          <input className="auth-input" id="password" type="password" value={password}
            onChange={e => setPassword(e.target.value)} autoComplete="new-password" required disabled={busy} />
          <label className="auth-label" htmlFor="confirm">Повторите пароль</label>
          <input className="auth-input" id="confirm" type="password" value={confirm}
            onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required disabled={busy} />
          {msg && <div className={`notice ${msg.type === 'success' ? 'notice-ok' : 'notice-amber'}`} style={{ marginTop: 12 }} role="alert">{msg.text}</div>}
          {msg?.type !== 'success' && (
            <button className="btn btn-p btn-w" style={{ marginTop: 16 }} type="submit" disabled={busy || !token}>
              {busy ? 'Сохраняем…' : 'Сохранить пароль'}
            </button>
          )}
        </form>

        {msg?.type === 'success' ? (
          <Link className="auth-link" href="/signin">Войти в аккаунт</Link>
        ) : (
          <Link className="auth-link" href="/signin">← Вернуться ко входу</Link>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  )
}