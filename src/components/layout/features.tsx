const FEATURES = [
  {
    icon: '📖',
    title: 'База знаний о партнёре',
    description: 'Цветы, виш-лист, хотелки и настроение. Партнёр видит, что вам нравится, и перестаёт гадать.',
  },
  {
    icon: '📊',
    title: 'Совместный отчёт',
    description: 'Пять опросников — и общий радар по шести темам. Видно, где вы близки, а где стоит поговорить.',
  },
  {
    icon: '🫀',
    title: 'Пульс отношений',
    description: 'Раз в неделю — три коротких вопроса. Проще заметить перемены, пока это не проблема.',
  },
  {
    icon: '🦉',
    title: 'ИИ-ассистент',
    description: 'Помогает разобрать ссору и сформулировать «я-сообщение». Знает ваш контекст.',
  },
  {
    icon: '📍',
    title: 'Куда пойти',
    description: 'Места и маршруты в вашем городе — под бюджет и настроение.',
  },
  {
    icon: '🎁',
    title: 'Подарки без угадывания',
    description: 'Партнёр сам пишет, что хочет. Никаких «ну я думал, тебе понравится».',
  },
]

const Features = () => {
  return (
    <section className="lp-sec" id="features">
      <div className="lp-sec-in">
        <div className="k">Что внутри</div>
        <div className="l-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="l-card">
              <i aria-hidden="true">{f.icon}</i>
              <b>{f.title}</b>
              <p>{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export { Features }
