export default function Privacy() {
  return (
    <div style={{ padding: '40px 20px', fontFamily: 'inherit' }}>
      <h1 style={{ fontSize: 'clamp(26px, 6vw, 40px)', marginBottom: '16px' }}>Политика конфиденциальности</h1>

      <div style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--dim)' }}>
        <p style={{ marginBottom: '24px' }}>
          Приложение Together уважает вашу приватность. Мы не передаем ваши данные третьим лицам без вашего согласия.
        </p>
        <ul style={{ marginBottom: '24px', paddingLeft: '24px' }}>
          <li>Все психологические данные шифруются и хранятся в защищенной базе Neon PostgreSQL</li>
          <li>Мы не продаем ваши данные рекламодателям</li>
          <li>Вы можете запросить экспорт своих данных в любой момент через настройки</li>
          <li>Дата рождения и астрологические данные используются только для расчета совместимости</li>
        </ul>
        <p style={{ marginBottom: '24px' }}>
          Приложение предназначено для взрослых пользователей. Используя Together, вы подтверждаете, что вам не менее 18 лет.
        </p>
      </div>

      <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #ccc' }}>
        <p style={{ fontSize: 12, color: 'var(--mute)' }}>Обновлено: август 2026</p>
      </div>
    </div>
  )
}