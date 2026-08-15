# Together — AI Chat Assistant

Чат с ИИ-консультантом на базе NVIDIA Nemotron (Next.js).

## Проблема

Чат на странице `/dashboard/ai` возвращает ошибку `Unexpected end of JSON input`.
Клиент отправляет POST на `/api/ai` с телом `{message, conversationId}`.
Серверный маршрут проксирует запросы к NVIDIA NIM API.

## Стек

- Next.js (App Router)
- TypeScript
- Prisma + PostgreSQL (Neon)
- NextAuth (Auth.js v5)
- NVIDIA NIM API (модель: `nvidia/nemotron-3.5-lightning-30b-a3b`)

## Структура

- `src/app/dashboard/ai/` — страница чата
- `src/app/api/ai/route.ts` — серверный маршрут (прокси к NVIDIA)
- `src/app/api/ai/conversations/route.ts` — управление диалогами
- `src/lib/ai/` — промпты и провайдер ИИ
- `.env.local` — ключ NVIDIA API (не коммитится)

## Запуск

```bash
pnpm install
cp .env.example .env.local  # заполните NVIDIA_API_KEY
pnpm dev
```
