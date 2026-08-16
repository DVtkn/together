export default function Terms() {
  return (
    <div style={{ padding: '40px 20px', fontFamily: 'inherit' }}>
      <h1 style={{ fontSize: 'clamp(26px, 6vw, 40px)', marginBottom: '16px' }}>Условия использования</h1>

      <div style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--dim)' }}>
        <p style={{ marginBottom: '24px' }}>
          Приложение Together («Сервис») предоставляет услуги по укреплению отношений между партнерами.
        </p>
        <ul style={{ marginBottom: '24px', paddingLeft: '24px' }}>
          <li>Регистрируясь в Сервисе, вы подтверждаете, что вам не менее 18 лет</li>
          <li>Вы обязаны достоверно заполнять профили и предоставлять собственные данные</li>
          <li>Запрещается использование Сервиса для коммерческих целей без предварительного согласования</li>
          <li>Данные пользователей обрабатываются в соответствии с действующим законодательством РФ</li>
        </ul>
        <p style={{ marginBottom: '24px' }}>
            Сервис предоставляется «как есть» без каких-либо гарантий. Мы не несем ответственности за решения, основанные на рекомендациях Сервиса.
        </p>
        <p style={{ marginBottom: '24px' }}>
          Подписка автоматически продлевается, если не отменить за 24 часа до окончания периода.
        </p>
      </div>

      <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #ccc' }}>
        <p style={{ fontSize: 12, color: 'var(--mute)' }}>Обновлено: август 2026</p>
      </div>
    </div>
  )
}