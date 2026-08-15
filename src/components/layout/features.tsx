import { BarChart2, Bot, BookOpen, HeartPulse, MapPin, ShoppingBag } from 'lucide-react'

const FEATURES = [
  {
    icon: BookOpen,
    title: 'База знаний о партнёре',
    description: 'Цветы, виш-лист, хотелки и настроение. Партнёр видит, что вам нравится, и перестаёт гадать.',
  },
  {
    icon: BarChart2,
    title: 'Совместный отчёт',
    description: 'Пять опросников — и общий радар по 6 темам: привязанность, конфликты, ценности, будущее. Видно, где вы уже близки, а где стоит поговорить.',
  },
  {
    icon: HeartPulse,
    title: 'Пульс отношений',
    description: 'Раз в неделю — три коротких вопроса. Проще заметить, что что-то меняется, пока это ещё не стало большой проблемой.',
  },
  {
    icon: Bot,
    title: 'ИИ-ассистент',
    description: 'Помогает разобрать ссору, подобрать слова и сформулировать «я-сообщение». Знает ваш контекст и не лезет с советами из ниоткуда.',
  },
  {
    icon: MapPin,
    title: 'Куда пойти',
    description: 'Рестораны, кафе и маршруты в вашем городе. Подбираем под бюджет и настроение, а не «как у всех».',
  },
  {
    icon: ShoppingBag,
    title: 'Подарки без угадывания',
    description: 'Партнёр сам пишет, что хочет: ссылки, мелочи, букеты. Никаких «ну я думал, тебе понравится».',
  },
]

const Features = () => {
  return (
    <section className="py-24 lg:py-32 border-y border-slate-200 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-950 dark:text-slate-50">
            Не надо держать всё в голове
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Никакой магии: проверенные методики и простые инструменты, которыми удобно пользоваться вдвоём.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 transition-shadow hover:shadow-lg hover:shadow-rose-100/50 dark:hover:shadow-rose-950/20"
            >
              <feature.icon className="h-8 w-8 text-rose-500 mb-4" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50 mb-2">{feature.title}</h3>
              <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export { Features }