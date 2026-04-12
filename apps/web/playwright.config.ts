import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from '@playwright/test'

function loadLocalEnvFile(fileName: string) {
  const filePath = resolve(__dirname, fileName)

  if (!existsSync(filePath)) {
    return
  }

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    if (process.env[key] !== undefined) {
      continue
    }

    let value = trimmed.slice(separatorIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}

loadLocalEnvFile('.env.local')

const playwrightPort = process.env.PLAYWRIGHT_PORT ?? '3100'
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${playwrightPort}`
const shouldManageWebServer = process.env.PLAYWRIGHT_BASE_URL === undefined

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  ...(shouldManageWebServer
    ? {
        webServer: {
          command: `pnpm exec next dev --port ${playwrightPort}`,
          url: baseURL,
          timeout: 180_000,
          reuseExistingServer: !process.env.CI,
        },
      }
    : {}),
})