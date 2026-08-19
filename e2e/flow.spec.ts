import { test, expect, type Browser, type Page } from '@playwright/test'
import { execSync } from 'node:child_process'
import { E2E_PARTNER, E2E_PASSWORD } from './seed-constants'

test.beforeAll(() => {
  execSync('pnpm exec tsx e2e/seed.ts', { stdio: 'ignore' })
})

async function clearActiveInvite(page: Page) {
  const own = page.getByRole('button', { name: 'Отменить инвайт' })
  if (await own.isVisible().catch(() => false)) {
    await own.click()
    await expect(own).toBeHidden()
  }
  const incoming = page.getByRole('button', { name: 'Отклонить' })
  if (await incoming.isVisible().catch(() => false)) {
    await incoming.click()
    await expect(incoming).toBeHidden()
  }
}

async function createIncomingInvite(browser: Browser) {
  const ctx = await browser.newContext({ storageState: undefined })
  const csrf = (await (await ctx.request.get('/api/auth/csrf')).json()).csrfToken
  await ctx.request.post('/api/auth/callback/credentials', {
    form: { csrfToken: csrf, username: E2E_PARTNER, password: E2E_PASSWORD },
  })
  const session = await (await ctx.request.get('/api/auth/session')).json()
  if (!session?.user) throw new Error('Partner login failed')
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await ctx.request.post('/api/date-invite', { data: {} })
    if (res.ok()) {
      await ctx.close()
      return
    }
    if (res.status() !== 429) throw new Error(`Invite creation failed: ${res.status()}`)
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
  }
  await ctx.close()
  throw new Error('Invite creation failed: 429 (rate limited)')
}

test.describe('Свидание: wizard выбора', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/date')
    await expect(page.locator('.h1', { hasText: 'Свидание' })).toBeVisible()
  })

  test('инициатор видит инвайт и может отправить его', async ({ page }) => {
    await clearActiveInvite(page)
    await expect(page.getByText(/Позови/)).toBeVisible()
    await page.getByRole('button', { name: /Отправить инвайт/ }).click()
    await expect(page.getByText(/Ждём/)).toBeVisible()
  })

  test('получатель проходит wizard: вайб → место → время → подтверждение', async ({ page, browser }) => {
    await clearActiveInvite(page)
    await createIncomingInvite(browser)
    await page.reload()

    await page.getByRole('button', { name: 'Выбрать' }).click()

    await expect(page.getByText('Чего хочется?')).toBeVisible()
    await page.getByRole('button', { name: /Романтик/ }).click()

    await expect(page.getByText('Куда пойдём?')).toBeVisible()
    await page.locator('.ven').first().click()

    await expect(page.getByText('Когда?')).toBeVisible()
    await page.locator('.day-card').first().click()
    await page.locator('.slot:not(:disabled)').first().click()
    await page.getByRole('button', { name: /Далее →/ }).click()

    await expect(page.getByText('Точно?')).toBeVisible()
    await expect(page.locator('.sum')).toContainText('Когда')
    await page.getByRole('button', { name: /Отправить/ }).click()

    await expect(page.getByText('Твой выбор отправлен')).toBeVisible()
  })

  test('кнопка «Удиви меня» выбирает случайный вайб и ведёт на шаг выбора места', async ({ page, browser }) => {
    await clearActiveInvite(page)
    await createIncomingInvite(browser)
    await page.reload()

    await page.getByRole('button', { name: 'Выбрать' }).click()
    await expect(page.getByText('Чего хочется?')).toBeVisible()
    await page.getByRole('button', { name: /✨ Удиви меня/ }).click()
    await expect(page.getByText('Куда пойдём?')).toBeVisible()
  })
})

test.describe('Пульс', () => {
  test('отправка пульса проходит', async ({ page }) => {
    await page.goto('/dashboard/daily#pulse')
    await expect(page.locator('.h1', { hasText: 'Синхронизация сердец' })).toBeVisible()

    await page.getByRole('button', { name: 'Заполнить пульс' }).click()
    await page.locator('#pulse input[type="range"]').nth(0).fill('7')
    await page.locator('#pulse input[type="range"]').nth(1).fill('6')
    await page.locator('#pulse .input').fill('Хочу больше времени вдвоём')

    await page.getByRole('button', { name: /Сохранить пульс/ }).click()
    await expect(page.getByText(/Уже заполнено/)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Настроение', () => {
  test('выбор настроения сохраняется', async ({ page }) => {
    await page.goto('/dashboard/daily')
    await expect(page.locator('.h1', { hasText: 'Синхронизация сердец' })).toBeVisible()

    await page.getByRole('button', { name: 'изменить' }).click()
    await page.getByRole('button', { name: 'Всё супер' }).click()
    await expect(page.getByText('✓ Записано. Партнёр увидит.')).toBeVisible()
  })
})

test.describe('Настройки', () => {
  test('кнопка «Покинуть пару» активируется после ввода слова leave', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await expect(page.locator('.h1', { hasText: 'Настройки' })).toBeVisible()

    const leaveBtn = page.getByRole('button', { name: 'Покинуть пару' })
    await expect(leaveBtn).toBeDisabled()
    await expect(page.getByText(/Введите слово/).first()).toBeVisible()

    const field = page.getByPlaceholder('leave')
    await field.fill('LEAVE')
    await expect(leaveBtn).toBeEnabled()
  })

  test('кнопка «Удалить навсегда» активируется после ввода слова delete', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await expect(page.locator('.h1', { hasText: 'Настройки' })).toBeVisible()

    const delBtn = page.getByRole('button', { name: 'Удалить навсегда' })
    await expect(delBtn).toBeDisabled()

    const field = page.getByPlaceholder('delete')
    await field.fill('delete')
    await expect(delBtn).toBeEnabled()
  })

  test('выход из аккаунта разлогинивает и ведёт на лендинг', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await expect(page.locator('.h1', { hasText: 'Настройки' })).toBeVisible()

    await page.getByRole('button', { name: 'Выйти из аккаунта' }).click()
    await expect(page.getByRole('link', { name: 'Войти' }).first()).toBeVisible({ timeout: 10000 })
  })
})