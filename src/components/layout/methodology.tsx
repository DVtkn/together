import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle2, HeartHandshake } from 'lucide-react'

const STEPS = [
  {
    title: 'Ответьте на опросники',
    description: 'Пять методик: привязанность, языки любви, конфликты, ценности, характер. На всё уходит примерно 10–15 минут.',
  },
  {
    title: 'Получите совместный отчёт',
    description: 'Когда закончите оба, появится радар, сильные стороны и то, над чем стоит поработать — с конкретными шагами.',
  },
  {
    title: 'Двигайтесь с подсказками',
    description: 'Дальше — еженедельный пульс, челленджи, ассистент и подборка свиданий. Идти вперёд проще, когда рядом есть подсказки.',
  },
]

const Methodology = () => {
  return (
    <section className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-6">
              <HeartHandshake className="h-4 w-4" aria-hidden="true" />
              Научная основа
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-950 dark:text-slate-50 mb-4">
              Не гадание, а проверенные подходы
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
              В основе — исследования Джона Готтмана, теория привязанности, «пять языков любви» и Большая пятёрка. Всё это годами проверяли на реальных парах.
            </p>
            <ul className="space-y-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-white text-sm font-semibold">
                      {i + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-950 dark:text-slate-50 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                      {step.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">{step.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-10 text-center">
            <div className="text-6xl mb-6" aria-hidden="true">❤️</div>
            <h3 className="text-2xl font-bold text-slate-950 dark:text-slate-50 mb-4">
              Начните с первого шага
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Первый опросник — это меньше 10 минут. Ваши ответы видит только партнёр, и только когда вы оба будете готовы.
            </p>
            <Button asChild size="xl" className="bg-rose-500 hover:bg-rose-600 text-white">
              <Link href="/register">Создать пару</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

export { Methodology }