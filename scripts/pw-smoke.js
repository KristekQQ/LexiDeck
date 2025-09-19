// Playwright core smoke test without the @playwright/test runner
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://localhost:5173'

async function main() {
  let browser
  try {
    browser = await chromium.launch({ headless: true })
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto(BASE, { waitUntil: 'domcontentloaded' })

    await page.waitForSelector('#runCheckBtn', { state: 'visible', timeout: 30000 })
    await page.click('#runCheckBtn')
    await page.waitForSelector('#checkResults > div', { timeout: 30000 })

    const rows = await page.$$eval('#checkResults > div', (nodes) => nodes.map((n) => n.textContent || ''))
    const pass = rows.filter((t) => t.trim().startsWith('PASS')).length
    console.log('[Self-check rows]', rows)
    if (pass < 7) throw new Error(`Self-check PASS count ${pass} < 7`)
    console.log('Playwright (core) smoke: OK (PASS >= 7)')
    process.exit(0)
  } catch (e) {
    console.error('Playwright (core) smoke: FAIL', e?.message || e)
    process.exit(1)
  } finally {
    if (browser) await browser.close()
  }
}

main()
