// @ts-check
import { defineConfig } from '@playwright/test'

export default defineConfig({
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true
  },
  reporter: [['list']],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    timeout: 30_000,
    reuseExistingServer: true
  }
})
