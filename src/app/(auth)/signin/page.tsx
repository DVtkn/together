'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { signinSchema } from '@/lib/utils/validation'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const error = searchParams.get('error')

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const validation = signinSchema.safeParse({ username, password })
    if (!validation.success) {
      setFormError(validation.error.issues[0].message)
      return
    }

    setIsLoading(true)
    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      })

      if (result?.error) {
        setFormError('Неверный логин или пароль')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setFormError('Произошла ошибка. Попробуйте позже.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignIn = (provider: string) => {
    signIn(provider, { callbackUrl })
  }

  const shownError = formError || (error === 'CredentialsSignin' ? 'Неверный логин или пароль' : error ? 'Ошибка входа. Попробуйте снова.' : '')

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Link href="/" className="logo" style={{ justifyContent: 'center' }}><i></i>Together</Link>
        <div className="h2" style={{ textAlign: 'center', marginTop: 16 }}>С возвращением</div>
        <div className="dim" style={{ textAlign: 'center' }}>Войдите, чтобы продолжить</div>

        <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          <label className="auth-label" htmlFor="username">Логин</label>
          <input className="auth-input" id="username" name="username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required disabled={isLoading} />
          <label className="auth-label" htmlFor="password">Пароль</label>
          <input className="auth-input" id="password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required disabled={isLoading} />
          {shownError && <div className="notice notice-amber" style={{ marginTop: 12 }} role="alert">{shownError}</div>}
          <button className="btn btn-p btn-w" style={{ marginTop: 16 }} type="submit" disabled={isLoading}>
            {isLoading ? 'Входим…' : 'Войти'}
          </button>
        </form>

        <div className="auth-divider">или</div>

        <div className="auth-oauth">
          <button className="btn btn-s" onClick={() => handleOAuthSignIn('google')} disabled={isLoading} type="button">Google</button>
          <button className="btn btn-s" onClick={() => handleOAuthSignIn('apple')} disabled={isLoading} type="button">Apple</button>
        </div>

        <Link className="auth-link" href="/register">Нет пары? Создать аккаунт</Link>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  )
}