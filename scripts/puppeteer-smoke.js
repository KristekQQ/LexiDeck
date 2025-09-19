/*
  Simple Puppeteer smoke test:
  - Navigates to http://localhost:6666
  - Clicks "Spustit kontrolu"
  - Waits for results and asserts at least 7 PASS
*/
import puppeteer from 'puppeteer'

const BASE = process.env.BASE_URL || 'http://localhost:6666'

async function main() {
  let browser
  try {
    browser = await puppeteer.launch({ headless: 'new' })
    const page = await browser.newPage()
    page.setDefaultTimeout(30000)
    await page.goto(BASE, { waitUntil: 'domcontentloaded' })

    // Ensure the button exists
    await page.waitForSelector('#runCheckBtn', { visible: true })
    await page.click('#runCheckBtn')

    // Wait for at least one result row
    await page.waitForFunction(() => {
      const rows = document.querySelectorAll('#checkResults > div')
      return rows.length > 0
    })

    // Count PASS
    const summary = await page.$$eval('#checkResults > div', (nodes) =>
      nodes.map((n) => n.textContent || '')
    )
    const passCount = summary.filter((t) => t.trim().startsWith('PASS')).length
    console.log('Self-check rows:', summary)
    if (passCount < 7) {
      throw new Error(`Self-check PASS count ${passCount} < 7`)
    }
    console.log('Puppeteer smoke: OK (PASS >= 7)')
    process.exit(0)
  } catch (e) {
    console.error('Puppeteer smoke: FAIL', e?.message || e)
    process.exit(1)
  } finally {
    if (browser) await browser.close()
  }
}

main()

