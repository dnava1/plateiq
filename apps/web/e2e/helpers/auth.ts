import { expect, type Page } from '@playwright/test'

function getRequiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} must be set to run protected-route Playwright coverage.`)
  }

  return value
}

export async function loginAsVerificationUser(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(getRequiredEnv('PLAYWRIGHT_VERIFICATION_EMAIL'))
  await page.getByLabel('Password').fill(getRequiredEnv('PLAYWRIGHT_VERIFICATION_PASSWORD'))
  await page.getByRole('button', { name: 'Sign In' }).click()

  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
}

export async function getPersistedQueryCacheKeys(page: Page) {
  return await page.evaluate(async () => {
    const cachePrefix = 'plateiq-query-cache'

    if (typeof indexedDB.databases === 'function') {
      const databases = await indexedDB.databases()
      if (!databases.some((database) => database.name === 'keyval-store')) {
        return []
      }
    }

    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('keyval-store')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    }).catch(() => null)

    if (!database || !database.objectStoreNames.contains('keyval')) {
      database?.close()
      return []
    }

    const keys = await new Promise<string[]>((resolve, reject) => {
      const transaction = database.transaction('keyval', 'readonly')
      const store = transaction.objectStore('keyval')
      const request = store.getAllKeys()

      request.onsuccess = () => resolve(request.result.map((key) => String(key)))
      request.onerror = () => reject(request.error)
    }).catch(() => [])

    database.close()
    return keys.filter((key) => key.startsWith(cachePrefix))
  })
}