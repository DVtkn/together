import Link from 'next/link'

const Footer = () => {
  return (
    <footer className="lp-foot">
      <div className="lp-foot-in">
        <div>
          <Link href="/" className="logo">
            <i></i>Together
          </Link>
          <p style={{ color: 'var(--dim)', fontSize: 14, marginTop: 12, maxWidth: 320 }}>
            Короткие опросники, общий отчёт и ассистент — чтобы быть ближе, а не на расстоянии вытянутой руки.
          </p>
        </div>

        <div>
          <h4>Продукт</h4>
          <Link href="/dashboard">Дашборд</Link>
          <Link href="/dashboard/daily#partner">База знаний о партнёре</Link>
          <Link href="/dashboard/couple#report">Отчёт</Link>
          <Link href="/dashboard/date">Куда пойти</Link>
        </div>

        <div>
          <h4>Аккаунт</h4>
          <Link href="/register">Регистрация</Link>
          <Link href="/signin">Войти</Link>
        </div>

        <div>
          <h4>Контакты</h4>
          <a href="https://t.me/together_app" target="_blank" rel="noopener noreferrer">
            Telegram
          </a>
        </div>
      </div>

      <div className="lp-foot-bottom">
        <p>© {new Date().getFullYear()} Together. Все права защищены.</p>
        <p>Together не является медицинским или психотерапевтическим сервисом. Астрологические данные и рекомендации не заменяют помощь специалиста.</p>
      </div>
    </footer>
  )
}

export { Footer }
