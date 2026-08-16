import { chromium, type FullConfig } from '@playwright/test'
import { execSync } from 'node:child_process'
import { E2E_USERNAME, E2E_PASSWORD } from './seed-constants'

async function globalSetup(_config: FullConfig) {
  void _config
  execSync('pnpm exec tsx e2e/seed.ts', { stdio: 'inherit' })

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('http://localhost:3000/signin')
  await page.fill('#username', E2E_USERNAME)
  await page.fill('#password', E2E_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard')

  await context.storageState({ path: 'e2e/.auth/user.json' })
  await browser.close()
}

export default globalSetup