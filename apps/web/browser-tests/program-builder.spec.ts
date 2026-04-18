import { expect, test, type Locator, type Page } from '@playwright/test'
import { loginAsVerificationUser } from './helpers/auth'

async function installBuilderNetworkRoutes(page: Page) {
  await page.route('**/auth/v1/user*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'playwright-user-1',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'playwright@example.com',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: {},
        identities: [],
        created_at: '2026-04-01T00:00:00.000Z',
      }),
    })
  })

  await page.route('**/rest/v1/exercises*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Squat', category: 'main', movement_pattern: 'squat', is_main_lift: true, strength_lift_slug: 'back_squat' },
        { id: 2, name: 'Bench Press', category: 'main', movement_pattern: 'push', is_main_lift: true, strength_lift_slug: 'bench_press' },
        { id: 3, name: 'Deadlift', category: 'main', movement_pattern: 'hinge', is_main_lift: true, strength_lift_slug: 'deadlift' },
        { id: 4, name: 'Overhead Press', category: 'main', movement_pattern: 'push', is_main_lift: true, strength_lift_slug: 'overhead_press' },
      ]),
    })
  })
}

async function clickBuilderNext(main: Locator) {
  const nextButton = main.locator('button:visible').filter({ hasText: /^Next$/ })

  if (await nextButton.count()) {
    await nextButton.first().click()
    return
  }

  const reviewProgressionButton = main.locator('button:visible').filter({ hasText: /^Review Progression$/ })

  if (await reviewProgressionButton.count()) {
    await reviewProgressionButton.click()
    return
  }

  throw new Error('Unable to find the next builder action.')
}

async function reachProgressionStep(page: Page) {
  const main = page.getByRole('main')
  const visibleParagraphs = main.locator('p:visible')

  await clickBuilderNext(main)
  await expect(visibleParagraphs.filter({ hasText: 'Name each training day so the rest of the build stays easy to scan.' })).toBeVisible()

  await clickBuilderNext(main)
  const firstDaySummary = visibleParagraphs.filter({ hasText: /^Day 1 of \d+$/ })
  await expect(firstDaySummary).toBeVisible()

  const firstDaySummaryText = await firstDaySummary.textContent()
  const totalDays = Number(firstDaySummaryText?.match(/Day 1 of (\d+)/)?.[1] ?? Number.NaN)

  if (!Number.isFinite(totalDays) || totalDays < 1) {
    throw new Error('Unable to determine the number of configured training days in the builder.')
  }

  for (let dayNumber = 1; dayNumber < totalDays; dayNumber += 1) {
    await clickBuilderNext(main)
    await expect(visibleParagraphs.filter({ hasText: new RegExp(`^Day ${dayNumber + 1} of ${totalDays}$`) })).toBeVisible()
  }

  await clickBuilderNext(main)

  await expect(visibleParagraphs.filter({ hasText: 'How should weights increase over time?' })).toBeVisible()
}

test.describe('program builder browser flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsVerificationUser(page)
    await installBuilderNetworkRoutes(page)
  })

  test('keeps deload guidance manual in progression and review', async ({ page }) => {
    const main = page.getByRole('main')

    await page.goto('/programs/builder?template=smolov_jr&name=Smolov%20Jr.')

    await expect(page).toHaveURL(/\/programs\/builder\?template=smolov_jr/)
    await expect(main.getByRole('heading', { name: 'Customize a Program' })).toBeVisible()
    await expect(main.getByLabel('Program Name')).toHaveValue('Smolov Jr.')

    await reachProgressionStep(page)

    await expect(main.getByText('Deload decisions stay user-controlled and can be handled during cycle review instead of being saved as part of the progression rule.')).toBeVisible()
    await expect(main.getByText('Deload Trigger', { exact: true })).toHaveCount(0)
    await expect(main.getByText('Deload Strategy', { exact: true })).toHaveCount(0)

    await main.getByRole('button', { name: 'Review', exact: true }).click()

    const reviewManualDeloadText = main.getByText('Deload decisions stay manual and happen during cycle review.')

    await expect(reviewManualDeloadText).toBeVisible()
    await expect(main.getByText(/^Progression$/).last()).toBeVisible()
    await expect(main.getByText('Deload Trigger', { exact: true })).toHaveCount(0)
    await expect(main.getByText('Deload Strategy', { exact: true })).toHaveCount(0)
  })
})