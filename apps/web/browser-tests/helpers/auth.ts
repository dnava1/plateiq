import { open, stat, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, type Page } from '@playwright/test'
import type { Database } from '@/types/database'
import { getPlaywrightBaseUrl } from './runtime'

let adminClient: SupabaseClient<Database> | null = null

const VERIFICATION_LOGIN_LOCK_PATH = resolve(tmpdir(), 'plateiq-playwright-verification-login.lock')
const VERIFICATION_LOGIN_LOCK_RETRY_MS = 100
const VERIFICATION_LOGIN_LOCK_STALE_MS = 60_000
const VERIFICATION_LOGIN_LOCK_TIMEOUT_MS = 60_000

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

  adminClient = createClient<Database>(
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

function isLockExistsError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'EEXIST'
}

function waitForDuration(durationMs: number) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, durationMs))
}

async function clearStaleVerificationLoginLock() {
  const lockStats = await stat(VERIFICATION_LOGIN_LOCK_PATH).catch(() => null)

  if (!lockStats) {
    return
  }

  if (Date.now() - lockStats.mtimeMs <= VERIFICATION_LOGIN_LOCK_STALE_MS) {
    return
  }

  await unlink(VERIFICATION_LOGIN_LOCK_PATH).catch(() => {})
}

async function withVerificationLoginLock<T>(callback: () => Promise<T>) {
  const startedAt = Date.now()

  while (true) {
    try {
      const lockHandle = await open(VERIFICATION_LOGIN_LOCK_PATH, 'wx')

      try {
        return await callback()
      } finally {
        await lockHandle.close().catch(() => {})
        await unlink(VERIFICATION_LOGIN_LOCK_PATH).catch(() => {})
      }
    } catch (error) {
      if (!isLockExistsError(error)) {
        throw error
      }

      await clearStaleVerificationLoginLock()

      if (Date.now() - startedAt > VERIFICATION_LOGIN_LOCK_TIMEOUT_MS) {
        throw new Error('Timed out waiting for the Playwright verification login lock.')
      }

      await waitForDuration(VERIFICATION_LOGIN_LOCK_RETRY_MS)
    }
  }
}

async function getVerificationUserId() {
  const supabase = getAdminClient()
  const targetEmail = getRequiredEnv('PLAYWRIGHT_VERIFICATION_EMAIL').toLowerCase()
  let page = 1

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })

    if (error) {
      throw new Error(error.message)
    }

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === targetEmail)

    if (user) {
      return user.id
    }

    if (data.users.length < 200) {
      break
    }

    page += 1
  }

  throw new Error(`Unable to find the Playwright verification user for ${targetEmail}.`)
}

export async function seedVerificationUserSettings({
  preferredUnit,
  strengthProfileAgeYears,
  strengthProfileBodyweightLbs,
  strengthProfileSex,
  weightRoundingLbs,
}: {
  preferredUnit: 'lbs' | 'kg'
  strengthProfileAgeYears: number
  strengthProfileBodyweightLbs: number
  strengthProfileSex: 'male' | 'female'
  weightRoundingLbs: number
}) {
  const supabase = getAdminClient()
  const userId = await getVerificationUserId()
  const { error } = await supabase
    .from('profiles')
    .update({
      preferred_unit: preferredUnit,
      strength_profile_age_years: strengthProfileAgeYears,
      strength_profile_bodyweight_lbs: strengthProfileBodyweightLbs,
      strength_profile_sex: strengthProfileSex,
      weight_rounding_lbs: weightRoundingLbs,
    })
    .eq('id', userId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function loginAsVerificationUser(page: Page) {
  await withVerificationLoginLock(async () => {
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
  })
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