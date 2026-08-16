'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { registerSchema } from '@/lib/utils/validation'

export default function RegisterPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const validation = registerSchema.safeParse({ username, password, name, dateOfBirth: dateOfBirth || undefined })
    if (!validation.success) {
      setFormError(validation.error.issues[0].message)
      return
    }

    if (password !== confirmPassword) {
      setFormError('Пароли не совпадают')
      return
    }

    if (!acceptedTerms || !acceptedPrivacy) {
      setFormError('Необходимо согласиться с условиями и политикой приватности')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name, dateOfBirth: dateOfBirth || undefined }),
      })

      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || 'Ошибка регистрации')
        return
      }

      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      })

      if (result?.error) {
        setFormError('Аккаунт создан, но вход не удался. Попробуйте войти вручную.')
      } else {
        router.push('/dashboard?welcome=true')
        router.refresh()
      }
    } catch {
      setFormError('Произошла ошибка. Попробуйте позже.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Link href="/" className="logo" style={{ justifyContent: 'center' }}><i></i>Together</Link>
        <div className="h2" style={{ textAlign: 'center', marginTop: 16 }}>Создать аккаунт</div>
        <div className="dim" style={{ textAlign: 'center' }}>Пароль и дата рождения. Последняя нужна, чтобы посчитать вашу синастрию.</div>

        <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          <label className="auth-label" htmlFor="username">Логин</label>
          <input className="auth-input" id="username" name="username" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} autoComplete="username" required disabled={isLoading} />
          <div className="small" style={{ marginTop: 4 }}>3–20 символов, только буквы, цифры и подчёркивание</div>

          <label className="auth-label" htmlFor="name">Имя (как к вам можно обращаться)</label>
          <input className="auth-input" id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} disabled={isLoading} />

          <label className="auth-label" htmlFor="dateOfBirth">Дата рождения</label>
          <input className="auth-input" id="dateOfBirth" name="dateOfBirth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required disabled={isLoading} />
          <div className="small" style={{ marginTop: 4 }}>По ней посчитаем знак зодиака и синастрию. Позже можно поменять.</div>

          <label className="auth-label" htmlFor="password">Пароль</label>
          <input className="auth-input" id="password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={4} autoComplete="new-password" required disabled={isLoading} />
          <div className="small" style={{ marginTop: 4 }}>Минимум 4 символа</div>

          <label className="auth-label" htmlFor="confirmPassword">Подтвердите пароль</label>
          <input className="auth-input" id="confirmPassword" name="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required disabled={isLoading} />

          <div className="auth-checks">
            <label className="auth-check">
              <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} required />
              <span>Согласен с <Link href="#terms">Условиями использования</Link></span>
            </label>
            <label className="auth-check">
              <input type="checkbox" checked={acceptedPrivacy} onChange={(e) => setAcceptedPrivacy(e.target.checked)} required />
              <span>Согласен с <Link href="#privacy">Политикой приватности</Link> и обработкой специальных категорий персональных данных (психологические данные)</span>
            </label>
            <div className="small" style={{ marginTop: 4 }}>Мы не передаём данные третьим лицам. Подробнее в политике.</div>
          </div>

          {formError && <div className="notice notice-amber" style={{ marginTop: 12 }} role="alert">{formError}</div>}

          <button className="btn btn-p btn-w" style={{ marginTop: 16 }} type="submit" disabled={isLoading}>
            {isLoading ? 'Создание аккаунта…' : 'Создать аккаунт и пару'}
          </button>
        </form>

        <Link className="auth-link" href="/signin">Уже есть аккаунт? Войти</Link>
      </div>
    </div>
  )
}