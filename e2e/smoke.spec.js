import { test, expect } from '@playwright/test'

test('self-check panel exists and runs', async ({ page }) => {
  await page.goto('/')
  const btn = page.getByRole('button', { name: /Spustit kontrolu/i })
  await expect(btn).toBeVisible()
  await btn.click()
  const rows = page.locator('#checkResults > div')
  await expect(rows.first()).toBeVisible({ timeout: 30_000 })
  const total = await rows.count()
  let passCount = 0
  for (let i = 0; i < total; i++) {
    const text = await rows.nth(i).textContent()
    if (text && text.startsWith('PASS')) passCount++
  }
  expect(passCount).toBeGreaterThanOrEqual(7)
})

