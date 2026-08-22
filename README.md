# Loop — станьте ближе

**Loop** — приложение для пар, которое помогает понимать друг друга, решать конфликты и поддерживать близость через ежедневные практики, инсайты и ИИ-психолога.

<center>
<img src="https://res.cloudinary.com/d Demo/image/upload/v1/loop-logo.png" alt="Loop logo" width="120"/>
</center>

Приложение для пар: вместе проходить опросники по совместимости, получать совместный отчёт, отслеживать «пульс» отношений, выполнять челленджи, вести базу знаний о партнёре, находить места для свиданий и общаться с ИИ-психологом, который помнит контекст пары.

## Возможности

### Дом (🏠)
Центр дня: стрик активности, настроение дня, вопрос для разговора, быстрые действия («Я почувствовал», «Я оценил», «Я хочу рассказать»).

### Пара (💞)
Паспорт пары: профиль, отчёт о关系e, тесты (привязанность, языки любви, Big Five), синастрия, история изменений.

### Свидание (📍)
Инвайты: отправка приглашений на свидание с выбором вайба, места, даты и времени. Народная база популярных мест. История свиданий.

### Психолог (🦉)
Сова: соло-режим и режим «Вместе» — диалоги с ИИ, который помнит контекст пары. Кризисные ситуации → направление к специалисту. Настройки тем: Аврора, Ночь.

### Настройки (⚙️)
Темы интерфейса: Aurora (светлая), Night (тёмная). Push-уведомления: включение/выключение, настройка типов событий. GDPR: экспорт данных, удаление аккаунта.

## Стек

Next.js 16 (App Router) · TypeScript · Tailwind 4 · shadcn/ui + Radix · Prisma 7 + Neon PostgreSQL · NextAuth v5 · Zod · bcryptjs · Groq (ИИ) · Upstash Redis · web-push · Vercel

## Quick start

```bash
pnpm install
cp .env.example .env.local   # заполните переменные (см. ниже)
pnpm db:seed                 # начальные данные: города, места
pnpm dev                     # http://localhost:3000
```

## Переменные окружения

### Обязательные (все среды: production/preview/development):

| Переменная | Значение | Описание |
|---|---|---|
| `VAPID_PUBLIC_KEY` | … | Публичный ключ VAPID для push-уведомлений (Non-sensitive на Preview/Development, Sensitive на Production) |
| `VAPID_PRIVATE_KEY` | … | Приватный ключ VAPID |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | … | Публичный ключ (доступен браузеру, префикс `NEXT_PUBLIC_`) |
| `VAPID_SUBJECT` | `mailto:push@loop.app` | Субъект VAPID (mailto: ссылка) |

### Дополнительные:

| Переменная | Значение | Описание |
|---|---|---|
| `DATABASE_URL` | … | Соединение с PostgreSQL (Neon) |
| `NEXTAUTH_URL` | `https://...` | URL NextAuth сессий |
| `AUTH_SECRET` | … | Секрет для подписи токенов |
| `AI_PROVIDER` | `groq` | Поставщик ИИ |
| `AI_MODEL` | … | Основная модель |
| `AI_FALLBACK_MODEL` | … | Фолбэчная модель |
| `GROQ_API_KEY` | … | Ключ доступа Groq |
| `UPSTASH_REDIS_REST_URL` | … | Redis кэш |
| `UPSTASH_REDIS_REST_TOKEN` | … | Токен Upstash |
| `NEXT_PUBLIC_APP_URL` | `https://...` | Корневой URL приложения |

## Скрипты

| Команда | Описание |
|---|---|
| `pnpm dev` | dev-сервер с hot-reload |
| `pnpm build` | продакшен-сборка Turbopack |
| `pnpm lint` | ESLint проверка |
| `pnpm test` | запуск тестов (45 тестов) |
| `pnpm db:push` | синхронизация схемы Prisma с БД |
| `pnpm db:seed` | заполнение начальных данных (города, места) |
| `pnpm db:studio` | запуск Prisma Studio |
| `pnpm build && tsc --noEmit` | полная типовая проверка |

## Структура папок

```
src/
  app/           # Next.js 16 App Router
  components/    # UI-компоненты (shadcn/ui, Radix)
  lib/           # Утилиты: prisma, push, notify, dates, cn
  app/api/       # API роуты (auth, push, couple, mood, signals)
  middleware.ts  # Middleware: CSRF, origin check, auth guards
  middleware.ts  # CSRF-origin check, redirect handlers, auth guards
public/          # Статические файлы: sw.js, manifest, icons
prisma/          # Схема базы данных
```

## Тесты

`pnpm test` — запуск всех тестовых суйтов (6 файлов, 45 тестов). Тесты покрывают: Prisma-запросы, утилиты, даты, coupling.

## Лицензия

MIT — © 2025 Loop App.

---

GitHub: `https://github.com/DVtkn/loop` (private).