import Link from 'next/link'

const STEPS = [
  {
    title: 'Ответьте на опросники',
    description: 'Пять методик, 10–15 минут. Ответы видит только партнёр.',
  },
  {
    title: 'Получите совместный отчёт',
    description: 'Радар, сильные стороны и шаги для роста.',
  },
  {
    title: 'Двигайтесь с подсказками',
    description: 'Пульс, челленджи, ассистент и подборка свиданий.',
  },
]

const Methodology = () => {
  return (
    <>
      <section className="lp-sec" id="how" style={{ paddingTop: 0 }}>
        <div className="lp-sec-in">
          <div className="k">Как это работает</div>
          <div className="l-steps">
            {STEPS.map((s, i) => (
              <div key={s.title} className="l-step">
                <div className="n" aria-hidden="true">{i + 1}</div>
                <div>
                  <b>{s.title}</b>
                  <p>{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-sec" id="science" style={{ paddingTop: 0 }}>
        <div className="lp-sec-in">
          <div className="k">Методики</div>
          <div className="l-cta">
            <div style={{ fontSize: 40 }} aria-hidden="true">❤️</div>
            <div className="h2" style={{ marginTop: 8 }}>Начните с первого шага</div>
            <p>Первый опросник — меньше 10 минут. Ответы видит только партнёр, и только когда вы оба готовы.</p>
            <Link href="/register" className="btn btn-p">
              Создать пару
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

export { Methodology }
