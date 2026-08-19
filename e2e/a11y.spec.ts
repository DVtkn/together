import { test, expect } from '@playwright/test'

test.describe('A11y: навигация и тап-зоны', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('таб-бар и плавающие кнопки имеют тап-зоны ≥ 44px и aria-label', async ({ page }) => {
    await page.goto('/dashboard/daily')
    await expect(page.locator('.tb')).toBeVisible()

    const tabs = page.locator('.tbi')
    expect(await tabs.count()).toBeGreaterThanOrEqual(4)
    for (const tab of await tabs.all()) {
      const box = await tab.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.height).toBeGreaterThanOrEqual(44)
      expect(box!.width).toBeGreaterThanOrEqual(44)
    }

    for (const sel of ['.bell', '.mood-fab', '.sig-fab']) {
      const el = page.locator(sel)
      await expect(el).toBeVisible()
      const box = await el.boundingBox()
      expect(box!.width).toBeGreaterThanOrEqual(44)
      expect(box!.height).toBeGreaterThanOrEqual(44)
      expect(await el.getAttribute('aria-label')).toBeTruthy()
    }

    const fab = page.locator('.fab')
    await expect(fab).toBeVisible()
    const fabBox = await fab.boundingBox()
    expect(fabBox!.width).toBeGreaterThanOrEqual(44)
    expect(fabBox!.height).toBeGreaterThanOrEqual(44)
    expect(await fab.getAttribute('aria-label')).toBeTruthy()
  })

  test('навигация на десктопе доступна и подсвечивает активный раздел', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/dashboard/daily')
    const nav = page.locator('.nav')
    await expect(nav).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Дом' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'День' })).toHaveCount(0)
  })
})