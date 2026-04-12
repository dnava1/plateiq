import { test, expect } from '@playwright/test'
import { getPersistedQueryCacheKeys, loginAsVerificationUser } from './helpers/auth'

test('redirects unauthenticated dashboard requests to login', async ({ page }) => {
  await page.goto('/dashboard')

  await expect(page).toHaveURL(/\/login(?:\?.*)?$/)
  await expect(page.getByRole('heading', { name: 'Sign in to PlateIQ' })).toBeVisible()
})

test.describe('authenticated dashboard and analytics flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsVerificationUser(page)
  })

  test('renders dashboard overview widgets', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByText('Next Workout')).toBeVisible()
    await expect(page.getByText('Cycle Progress')).toBeVisible()
    await expect(page.getByText('Current Training Maxes')).toBeVisible()
    await expect(page.getByText('Recent PRs', { exact: true })).toBeVisible()
  })

  test('supports analytics filter changes and AI insight generation', async ({ page }) => {
    let insightRequestBody: Record<string, unknown> | null = null

    await page.route('**/api/insights/generate', async (route) => {
      insightRequestBody = route.request().postDataJSON() as Record<string, unknown>

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          summary: 'Bench press momentum is positive, but squat progress needs closer monitoring.',
          strengths: ['Bench press estimated 1RM is moving in the right direction.'],
          concerns: ['Squat has gone multiple weeks without a fresh PR.'],
          recommendations: ['Keep bench volume stable and add one focused squat exposure this week.'],
        }),
      })
    })

    await page.goto('/analytics')

    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()
    await expect(page.locator('#analytics-range')).toContainText(/6m|Last 6 months/)

    await page.locator('#analytics-exercise').click({ force: true })
    await page.waitForTimeout(300)
    await page.locator('#analytics-exercise').focus()
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(300)

    const benchPressOption = page.getByRole('option', { name: 'Bench Press', exact: true })
    await expect(benchPressOption).toBeVisible()
    await benchPressOption.click({ force: true })
    await expect(page.locator('#analytics-exercise')).toContainText('Bench Press')

    await page.locator('#analytics-range').click()
    await expect(page.getByRole('option', { name: 'Last 8 weeks', exact: true })).toBeVisible()
    await page.getByRole('option', { name: 'Last 8 weeks', exact: true }).click({ force: true })
    await expect(page.locator('#analytics-range')).toContainText(/8w|Last 8 weeks/)

    await page.getByRole('tab', { name: 'Strength' }).click()
    await expect(page.getByText('TM Progression')).toBeVisible()

    await page.getByRole('tab', { name: 'AI Insights' }).click()
    await expect(page.getByRole('button', { name: 'Generate insight for Bench Press' })).toBeVisible()
    await page.getByRole('button', { name: 'Generate insight for Bench Press' }).click()

    expect(insightRequestBody?.['exerciseId']).toEqual(expect.any(Number))
    expect(insightRequestBody?.['dateFrom']).toEqual(expect.any(String))
    expect(insightRequestBody?.['dateTo']).toEqual(expect.any(String))
    expect(insightRequestBody).not.toHaveProperty('exerciseName')

    await expect(page.getByRole('heading', { name: 'Summary' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Strengths' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Concerns' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Recommendations' })).toBeVisible()
    await expect(page.getByText('Bench press momentum is positive, but squat progress needs closer monitoring.')).toBeVisible()
  })

  test('clears persisted query cache state when signing out', async ({ page }) => {
    await page.goto('/analytics')

    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()
    await expect.poll(async () => {
      const keys = await getPersistedQueryCacheKeys(page)
      return keys.length
    }).toBeGreaterThan(0)

    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await page.getByRole('button', { name: 'Sign Out' }).click()

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/)
    await expect(page.getByRole('heading', { name: 'Sign in to PlateIQ' })).toBeVisible()

    await expect.poll(async () => {
      return await getPersistedQueryCacheKeys(page)
    }).toEqual([])

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/)
  })
})