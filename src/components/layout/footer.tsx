import Link from 'next/link'
import { Send } from 'lucide-react'

const Footer = () => {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="font-semibold text-slate-950 dark:text-slate-50 mb-4 flex items-center gap-2">
              <svg className="h-6 w-6 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              Together
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Короткие опросники, общий отчёт и ассистент — чтобы быть ближе, а не на расстоянии вытянутой руки.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-950 dark:text-slate-50 mb-4">Продукт</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard" className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                  Дашборд
                </Link>
              </li>
              <li>
                <Link href="/dashboard/partner" className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                  База знаний о партнёре
                </Link>
              </li>
              <li>
                <Link href="/dashboard/report" className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                  Отчёт
                </Link>
              </li>
              <li>
                <Link href="/dashboard/venues" className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                  Куда пойти
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-950 dark:text-slate-50 mb-4">Аккаунт</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/register" className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                  Регистрация
                </Link>
              </li>
              <li>
                <Link href="/signin" className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                  Войти
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-950 dark:text-slate-50 mb-4">Контакты</h4>
            <div className="flex gap-3">
              <a
                href="https://t.me/together_app"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-500 hover:border-rose-300 transition-colors"
                aria-label="Telegram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Send className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 dark:text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} Together. Все права защищены.</p>
          <p className="text-xs max-w-md">
            Together не является медицинским или психотерапевтическим сервисом. Астрологические данные и рекомендации не заменяют помощь специалиста.
          </p>
        </div>
      </div>
    </footer>
  )
}

export { Footer }