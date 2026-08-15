import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Heart, Sparkles, Shield } from 'lucide-react'

const Hero = () => {
  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-rose-50 via-slate-50 to-white dark:from-rose-950/20 dark:via-slate-950 dark:to-slate-950" aria-hidden="true" />

      <div className="absolute -top-12 -right-12 w-24 h-24 bg-rose-200/30 dark:bg-rose-900/20 rounded-full blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-pink-200/30 dark:bg-pink-900/10 rounded-full blur-3xl" aria-hidden="true" />

      <div className="mx-auto max-w-2xl px-4 sm:px-6 text-center">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-100/60 dark:bg-rose-950/40 px-4 py-2 text-sm font-medium text-rose-700 dark:text-rose-300 mb-6">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Для двоих, а не для статистики</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-950 dark:text-slate-50 mb-4">
            Узнавать друг друга, а не догадываться
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 mb-6 max-w-xl mx-auto">
            Короткие опросники, общий отчёт и ассистент, который помогает говорить, а не угадывать.
            Без нотаций и без диагнозов — только вы двое.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" className="bg-rose-500 hover:bg-rose-600 text-white">
              <Link href="/register">Начать бесплатно</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/signin">Войти</Link>
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
              Ваши ответы видит только партнёр
            </span>
            <span className="inline-flex items-center gap-2">
              <Heart className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
              Опираемся на Готтмана и теорию привязанности
            </span>
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              Ассистент, который не ставит диагнозы
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

export { Hero }