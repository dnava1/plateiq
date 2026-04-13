import { createClient } from '@supabase/supabase-js'
import { expect, type Page } from '@playwright/test'

let adminClient: ReturnType<typeof createClient> | null = null

function getRequiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} must be set to run protected-route Playwright coverage.`)
  }

  return value
}

function getAdminClient() {
  if (adminClient) {
    return adminClient
  }

  adminClient = createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SECRET_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  )

  return adminClient
}

function getPlaywrightBaseUrl() {
  return process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
}

export async function loginAsVerificationUser(page: Page) {
  const supabase = getAdminClient()
  const baseUrl = getPlaywrightBaseUrl()
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: getRequiredEnv('PLAYWRIGHT_VERIFICATION_EMAIL'),
    options: {
      redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent('/dashboard')}`,
    },
  })

  const tokenHash = data.properties?.hashed_token
  const verificationType = data.properties?.verification_type

  if (error || !tokenHash || !verificationType) {
    throw new Error(error?.message ?? 'Unable to create a verification login link for Playwright.')
  }

  const callbackUrl = new URL('/auth/callback', baseUrl)
  callbackUrl.searchParams.set('token_hash', tokenHash)
  callbackUrl.searchParams.set('type', verificationType)
  callbackUrl.searchParams.set('next', '/dashboard')

  await page.goto(callbackUrl.toString())

  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
}

export async function continueAsGuest(page: Page) {
  await page.goto('/continue')
  await expect(page.getByRole('button', { name: 'Continue as Guest' })).toBeEnabled()
  await page.getByRole('button', { name: 'Continue as Guest' }).click()

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