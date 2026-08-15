import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function DateInvitePage() {
  return (
    <DashboardLayout user={{ name: null, email: '', image: null }} couple={null}>
      <div className="wrap">
        <div className="h1">Свидание</div>
        <div className="dim">Ты зовёшь. Она выбирает. Ты бронируешь.</div>

        <div style={{ marginTop: '24px' }}>
          <div className="cd" style={{ padding: '20px', borderRadius: '16px', background: 'var(--card)' }}>
            <span className="badge ok">Фича в разработке</span>
            <div className="h2" style={{ margin: '12px 0 4px' }}>Планирование свиданий</div>
            <div className="dim">Ожидается в следующей версии.</div>
            <p>Будем иметь возможность:</p>
            <ul style={{ margin: '10px 0 16px', paddingLeft: '20px' }}>
              <li>Выбирать вайб (٨ вариантов)</li>
              <li>Фильтровать места по настроению</li>
              <li>Выбирать дату и время (калаendar)</li>
              <li>Получать готовый план с адресом</li>
              <li>Кнопки «Позвонить» и «Забронировать»</li>
            </ul>
            <div className="cd" style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', marginTop: '16px' }}>
              <div className="h2" style={{ marginBottom: '4px' }}>Как помочь:</div>
              <button className="btn btn-p" style={{ width: '100%' }}>Связаться с командой</button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}