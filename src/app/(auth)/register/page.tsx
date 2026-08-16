'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Lock, Eye, EyeOff, Loader2, User, Shield, Calendar } from 'lucide-react'
import { registerSchema } from '@/lib/utils/validation'

export default function RegisterPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center space-x-2 mb-6" aria-label="Together Home">
              <svg className="h-10 w-10 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span className="text-2xl font-semibold text-slate-950 dark:text-slate-50">Together</span>
            </Link>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">Создать аккаунт</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Пароль и дата рождения. Последняя нужна, чтобы посчитать вашу синастрию.
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              {formError && (
                <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-lg dark:bg-red-950/20 dark:text-red-400" role="alert">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Логин</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="ivan_ivanov"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10"
                      maxLength={20}
                      disabled={isLoading}
                      required
                      pattern="^[a-zA-Z0-9_]+$"
                      autoComplete="username"
                    />
                  </div>
                  <p className="text-xs text-slate-500">3–20 символов, только буквы, цифры и подчёркивание</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Имя (как к вам можно обращаться)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Иван"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      maxLength={50}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Дата рождения</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-xs text-slate-500">По ней посчитаем знак зодиака и синастрию. Позже можно поменять.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Пароль</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Минимум 8 символов"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      autoComplete="new-password"
                      disabled={isLoading}
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="new-password"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                      required
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Согласен с{' '}
                      <Link href="#terms" className="text-rose-500 hover:underline">Условиями использования</Link>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedPrivacy}
                      onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                      required
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Согласен с{' '}
                      <Link href="#privacy" className="text-rose-500 hover:underline">Политикой приватности</Link>
                      {' '}и обработкой специальных категорий персональных данных (психологические данные)
                    </span>
                  </label>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Shield className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                    <span>Мы не передаём данные третьим лицам. Подробнее в политике.</span>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      Создание аккаунта...
                    </>
                  ) : (
                    'Создать аккаунт и пару'
                  )}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                    Или продолжить с
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => signIn('google', { callbackUrl: '/dashboard?welcome=true' })}
                  disabled={isLoading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </Button>
                <Button
                  variant="outline"
                  onClick={() => signIn('apple', { callbackUrl: '/dashboard?welcome=true' })}
                  disabled={isLoading}
                >
                  <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18.71 19.5c-2.3 1.72-4.77 3-7.41 3-7.12 0-12.7-4.97-12.7-11.36 0-6.28 5.61-11.52 12.53-11.68.06 1.1.12 2.27.08 3.4-.03-1.45-.39-3.14-1.78-4.16C14.2 1.59 17.5 0 21.14 0c4.7 0 8.14 3.58 8.14 8.2 0 2.33-.89 4.59-2.41 6.32-1.5 1.7-3.43 2.8-5.6 3.15-.3.43-.33 1.07-.07 1.54.81 1.41 1.99 3.3 1.99 5.6 0 4.12-2.86 8.1-8.34 9.16zM17.07 4.88c-1.18 2.47-3.65 5.83-6.73 5.83-2.7 0-5.18-1.77-6.17-4.2h12.94z" />
                  </svg>
                  Apple
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                Уже есть аккаунт?{' '}
                <Link href="/signin" className="font-medium text-rose-500 hover:underline">
                  Войти
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}