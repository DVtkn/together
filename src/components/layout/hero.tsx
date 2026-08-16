import Link from 'next/link'

const Hero = () => {
  return (
    <section className="l-hero">
      <span className="eyebrow">Для пар, которые хотят быть ближе</span>
      <h1>
        Не надо держать<br />всё <span className="grad">в голове</span>
      </h1>
      <p>Короткие опросники, общий отчёт и ассистент — чтобы быть ближе, а не на расстоянии вытянутой руки.</p>
      <div className="l-row">
        <Link href="/register" className="btn btn-p">
          Создать пару
        </Link>
        <Link href="/signin" className="btn btn-s">
          Войти
        </Link>
      </div>
    </section>
  )
}

export { Hero }
