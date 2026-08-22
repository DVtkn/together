# iOS Web Push Runbook — опыт сбора

Полный чек-лист внедрения Web Push на iOS на основе боевого опыта проекта Loop.

## 1. Архитектура iOS Push

### 1.1 Требования к окружению
- **iOS 16.4+** — только на этих версиях Web Push работает стабильно
- Только **standalone PWA** режим (Home Screen иконка)
- **Safari с адресной строкой** не поддерживает.push — пользователь получит тихое отказ

### 1.2 manifest.webmanifest
```json
{
  "name": "Loop — станьте ближе",
  "short_name": "Loop",
  "icons": [
    {"src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png"}
  ],
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff"
}
```

### 1.3 layout.tsx — мета-теги
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
```

### 1.4 sw.js — обработка событий

#### Push-event:
```js
self.addEventListener('push', (event) => {
  console.log('[SW] push received', event.data?.text?.());
  const title = 'Loop';
  let body = '';
  let icon = '/icons/icon-192.png';
  let tag = 'loop-notification';
  let data = {};

  if (event.data) {
    try {
      const dataJson = event.data.json();
      title = dataJson.title || title;
      body = dataJson.body || dataJson.message || body;
      icon = dataJson.icon || icon;
      tag = dataJson.tag || tag;
      data = { ...dataJson };
    } catch (e) {
      console.warn('Push data parse error:', e);
      body = 'Новое уведомление from Loop';
    }
  }

  const options = {
    body,
    icon,
    tag,
    vibrate: [200, 100, 200],
    renotify: true,
    data: { url: dataJson.url || '/dashboard/ai?mode=together' },  // ← КРИТИЧЕСКИ
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      console.log('[SW] showNotification resolved OK');
    }).catch(err => {
      console.error('[SW] showNotification failed:', err)
    })
  );
});
```

#### Notification-click event:
```js
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard/ai?mode=together';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const client = list.find((c) => 'focus' in c);
      if (client) {
        if ('navigate' in client) client.navigate(url);
        return client.focus();
      }
      return clients.openWindow(url);  // ← новое окно сразу на чат
    })
  );
);
```

## 2. VAPID ключи

### 2.1 Генерация одной пары
```
VAPID Public Key:  BBI6xWBgSjJb4t4TKHs6h08AzhHNrMbu73GndXP6roVclsX69f8vH-O3rgcpXLFRgY0rrWYdrifsNSwqjvpG3uw
VAPID Private Key: OBI1oV7s6EQ83v9jpoXMgvYFnvE7HzjXfRCP6OIKqhA
VAPID Subject:     mailto:push@loop.app
```

### 2.2 Env vars (4 шт. на каждый deployment)

| Переменная | Тип | Sensitive |
|---|---|---|
| `VAPID_PUBLIC_KEY` | строка | Sensitive (Production only) |
| `VAPID_PRIVATE_KEY` | строка | Sensitive (Production only) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | строка | **Never** Sensitive — должна быть публичной! |
| `VAPID_SUBJECT` | `mailto:push@loop.app` | Не sensitive |

### 2.3 Критические нюансы
- **NEXT_PUBLIC_VAPID_PUBLIC_KEY не помечать как Sensitive** — иначе Vercel выдаст ошибку: *"No environment variables were created"* при batch-добавлении
- 4 переменные должны быть установлены в **production, preview и development**
- После изменений ключей: `vercel redeploy` + переподписка на устройстве (Unregister SW + reload)

## 3. Диагностика и отладка

### 3.1 /api/push/debug endpoint
Возвращает:
- count — количество подписок в БД
- lastResult — результат последнего тест-пуша
- keys: { ok, fp, error? } — здоровье VAPID ключей

Использовать: `GET https://<your-vercel>/api/push/debug`

### 3.2 Тест-пуш из интерфейса
Настройки → Push → «Тест». Нажимает кнопка вызывает `POST /api/push/test`.

### 3.3 Локальная верификация (до деплоя)
```bash
node -e "
const webpush = require('web-push');
const pub = process.env.VAPID_PUBLIC_KEY;
const priv = process.env.VAPID_PRIVATE_KEY;
const sub = process.env.VAPID_SUBJECT || 'mailto:push@loop.app';
webpush.setVapidDetails(sub, pub, priv);
// если ошибок нет — ключи валидны
console.log('VAPID keys OK');
"
```

### 3.3 Проблемы и лечения
| Проблема | Причина | Лечение |
|---|---|---|
| Нет баннера при push | SW не активен | Обновить SW: Unregister + Reload или Fully close iOS app и открыть с иконки |
| Баннер есть, но нет звука | vibrate pattern не поддерживается на iOS | Убрать vibrate или оставить [200, 100, 200] (iOS использует первую величину) |
| Баннер есть, клик не открывает чат | data.url не передан в payload | Добавить `data: { url: '/dashboard/ai?mode=together' }` в options.data |
| Push работает на Android, но не на iOS | Не standalone режим | Добавить `display: standalone` в manifest + apple теги в layout |

## 4._flow_ работы с нуля

1. Deploy приложения с верными VAPID env
2. Открыть Loop с Home Screen иконки (standalone режим)
3. Настройки → Push → «Включить» (запрос разрешения Notification)
4. Разрешить уведомления в системном попапе iPhone
5. Нажать «Тест» — придет баннер
6. Тап по баннеру → открывается чат в режиме «Вместе» (?mode=together)
7. Выключить toggle «Сообщения от партнёра» — баннеры исчезнут (проверка prefs.notifyMessages)

## 5. Смена ключей

1. Сгенерировать новую пару VAPID ключей
2. Добавить новые ключи во все 3 env (production/preview/development) через `vercel env add`
3. Удали старые ключи `vercel env rm --yes`
4. `vercel redeploy`
5. На iPhone: Swipe-up из App Switcher (полная закрытие) → Открыть с иконки → Пройти процесс подписки заново

## 6. Откат при сбое
- Если после смены ключей push перестал приходить: проверить `/api/push/debug`, убедиться что `keys.ok === true`
- Убедиться что `NEXT_PUBLIC_VAPID_PUBLIC_KEY` не sensitive
- Fully close и reopen приложение с иконки для обновления SW