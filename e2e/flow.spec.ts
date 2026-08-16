import { test, expect } from '@playwright/test'

test.describe('Свидание: wizard выбора', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/date')
  })

  test('инициатор видит инвайт и может отправить его', async ({ page }) => {
    await expect(page.locator('.h1', { hasText: 'Свидание' })).toBeVisible()
    await expect(page.getByText(/Позови/)).toBeVisible()
    await page.getByRole('button', { name: /Отправить инвайт/ }).click()
    await expect(page.getByText(/Ждём/)).toBeVisible()
  })

  test('получатель проходит wizard: вайб → место → время → подтверждение', async ({ page }) => {
    await page.locator('.seg button').nth(1).click()

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
    await page.getByRole('button', { name: /Отправить Диме/ }).click()

    await expect(page.getByText(/выбрала/)).toBeVisible()
  })

  test('кнопка «Удиви меня» выбирает случайный вайб и ведёт на шаг выбора места', async ({ page }) => {
    await page.locator('.seg button').nth(1).click()
    await page.getByRole('button', { name: /✨ Удиви меня/ }).click()
    await expect(page.getByText('Куда пойдём?')).toBeVisible()
  })
})

test.describe('Пульс', () => {
  test('отправка пульса проходит', async ({ page }) => {
    await page.goto('/dashboard/pulse')
    await expect(page.locator('.h1', { hasText: 'Пульс' })).toBeVisible()

    await page.locator('input[type="range"]').nth(0).fill('7')
    await page.locator('input[type="range"]').nth(1).fill('6')
    await page.locator('.input').fill('Хочу больше времени вдвоём')

    await page.getByRole('button', { name: /Сохранить|Обновить/ }).click()
    await expect(page.getByText(/✓ Уже заполнено/)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Настроение', () => {
  test('выбор настроения сохраняется', async ({ page }) => {
    await page.goto('/dashboard/daily')
    await expect(page.locator('.h1', { hasText: 'Будни' })).toBeVisible()

    await page.getByRole('button', { name: 'Всё супер' }).click()
    await expect(page.getByRole('button', { name: 'Всё супер' })).toHaveAttribute('aria-pressed', 'true')
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