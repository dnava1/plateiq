import { test, expect, type Page } from '@playwright/test'
import { continueAsGuest, getPersistedQueryCacheKeys, loginAsVerificationUser } from './helpers/auth'

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''
const hasTurnstileGuestGate = Boolean(turnstileSiteKey)
const hasTurnstileTestKey = turnstileSiteKey === '1x00000000000000000000AA'

function waitForAnalyticsResponse(page: Page) {
  return page.waitForResponse(
    (response) => response.url().includes('/rest/v1/rpc/get_analytics_data') && response.request().method() === 'POST',
  )
}

async function openSelectPopup(page: Page, triggerId: string) {
  const trigger = page.locator(`#${triggerId}`)

  await expect(trigger).toBeVisible()
  await trigger.click()

  const popup = page.locator('[data-slot="select-content"][data-open]').last()
  await expect(popup).toBeVisible()

  return popup
}

async function selectAnalyticsExercise(page: Page) {
  const popup = await openSelectPopup(page, 'analytics-exercise')
  const options = popup.locator('[data-slot="select-item"]')

  await expect(options.first()).toBeVisible()

  if (await options.count() < 2) {
    await page.keyboard.press('Escape')
    return null
  }

  const firstExerciseOption = options.nth(1)
  await expect(firstExerciseOption).toBeVisible()

  const exerciseName = (await firstExerciseOption.textContent())?.trim()

  if (!exerciseName) {
    throw new Error('Analytics exercise select did not expose a named exercise option.')
  }

  await firstExerciseOption.click()

  return exerciseName
}

function getPrimaryNav(page: Page) {
  return page.getByRole('navigation', { name: 'Primary' })
}

test('redirects unauthenticated dashboard requests to continue @smoke', async ({ page }) => {
  await page.goto('/dashboard')

  await expect(page).toHaveURL(/\/continue(?:\?.*)?$/)
  await expect(page.getByRole('button', { name: 'Continue as Guest' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
  await expect(page.locator('a[href="/login"], a[href="/create-account"]')).toHaveCount(0)
})

test('supports guest access and returns guests to continue after sign-out', async ({ page }) => {
  test.skip(hasTurnstileGuestGate && !hasTurnstileTestKey, 'Guest end-to-end coverage requires the Turnstile test key or no guest gate.')

  await continueAsGuest(page)

  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Guest account' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign In with Google' }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible()

  await page.getByRole('button', { name: 'Sign Out' }).click()

  await expect(page).toHaveURL(/\/continue(?:\?.*)?$/)
  await expect(page.getByRole('button', { name: 'Continue as Guest' })).toBeVisible()

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/continue(?:\?.*)?$/)
})

test('keeps the removed exercises route missing after guest entry', async ({ page }) => {
  test.skip(hasTurnstileGuestGate && !hasTurnstileTestKey, 'Guest end-to-end coverage requires the Turnstile test key or no guest gate.')

  await page.goto('/exercises')

  await expect(page).toHaveURL(/\/continue(?:\?.*next=%2Fexercises.*)?$/)
  await expect(page.getByRole('button', { name: 'Continue as Guest' })).toBeVisible()

  await page.getByRole('button', { name: 'Continue as Guest' }).click()

  await expect(page).toHaveURL(/\/exercises(?:\?.*)?$/)
  await expect(getPrimaryNav(page)).toBeVisible()
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
  await expect(page.getByText('That route is no longer part of PlateIQ', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Go to Programs', exact: true })).toBeVisible()
})

test.describe('authenticated dashboard and analytics flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsVerificationUser(page)
  })

  test('shows dashboard overview and linked analytics surfaces @smoke', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByText('Next Workout')).toBeVisible()
    await expect(page.getByText('Cycle Progress')).toBeVisible()
    await expect(page.getByText('Current Training Maxes')).toBeVisible()
    await expect(page.getByText('Recent PRs', { exact: true })).toBeVisible()
    await expect(page.getByText('Bodyweight Exercise Review', { exact: true })).toBeVisible()
    await expect(getPrimaryNav(page).getByRole('link', { name: 'Exercises', exact: true })).toHaveCount(0)

    const analyticsResponsePromise = waitForAnalyticsResponse(page)
    await getPrimaryNav(page).getByRole('link', { name: 'Analytics', exact: true }).click()

    await expect(page).toHaveURL(/\/analytics(?:\?.*)?$/)
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()

    const analyticsPayload = await (await analyticsResponsePromise).json() as Record<string, unknown>

    if (!analyticsPayload || typeof analyticsPayload !== 'object') {
      throw new Error('Analytics RPC returned a non-object payload.')
    }

    expect(analyticsPayload).toEqual(expect.objectContaining({
      coverage: expect.any(Object),
      bodyweight_lane: expect.any(Object),
      strength_profile: expect.any(Object),
    }))

    await expect(page.getByText('Method Coverage', { exact: true })).toHaveCount(0)
    await expect(page.getByText('First Session', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Bodyweight Exercise Review', { exact: true })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Strength' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'AI Insights' })).toBeVisible()

    await page.getByRole('tab', { name: 'Strength' }).click()
    await expect(page.getByText('Strength Profile', { exact: true })).toBeVisible()
    await expect(page.getByText('Recent PRs', { exact: true })).toBeVisible()

    await page.getByRole('tab', { name: 'AI Insights' }).click()
    await expect(page.getByRole('button', { name: /Generate insight/i })).toBeVisible()
  })

  test('shows the real programs surface and resumes the seeded workout @smoke', async ({ page }) => {
    const response = await page.goto('/exercises')

    expect(response?.status()).toBe(404)
    await expect(page).toHaveURL(/\/exercises(?:\?.*)?$/)
    await expect(getPrimaryNav(page)).toBeVisible()
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
    await expect(page.getByText('This page could not be found.', { exact: true })).toBeVisible()
    await expect(page.getByText('That route is no longer part of PlateIQ', { exact: true })).toBeVisible()

    await page.getByRole('link', { name: 'Go to Programs', exact: true }).click()

    await expect(page).toHaveURL(/\/programs(?:\?.*)?$/)
    await expect(page.getByRole('heading', { name: 'Programs' })).toBeVisible()
    await expect(page.getByText(/\d+ total/).first()).toBeVisible()
    await expect(page.getByText('Program Training Maxes', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Exercise Library', { exact: true })).toHaveCount(0)
    const activeProgramCard = page.locator('[data-slot="card"]').filter({
      has: page.getByText('Wendler 5/3/1 BBB', { exact: true }),
    }).filter({
      has: page.getByText('Active', { exact: true }),
    }).first()

    await expect(activeProgramCard).toBeVisible()
    await expect(activeProgramCard.getByRole('button', { name: 'Training Maxes', exact: true })).toBeVisible()
    await activeProgramCard.getByRole('button', { name: 'Training Maxes', exact: true }).click()
    await expect(activeProgramCard.getByText('Program Training Maxes', { exact: true })).toBeVisible()
    const squatTmCard = activeProgramCard.locator('[data-slot="card"][data-size="sm"]').filter({
      has: page.getByText('Squat', { exact: true }),
    }).first()
    await expect(squatTmCard).toBeVisible()
    await squatTmCard.getByRole('button', { name: 'History', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Training Max History — Squat' })).toBeVisible()
    await expect(page.getByText('TM 90%', { exact: true }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(activeProgramCard.getByRole('link', { name: 'Edit', exact: true })).toBeVisible()
    await expect(activeProgramCard.getByRole('button', { name: 'Cycle Checkpoint', exact: true })).toBeVisible()

    await getPrimaryNav(page).getByRole('link', { name: 'Workouts', exact: true }).click()

    await expect(page).toHaveURL(/\/workouts(?:\?.*)?$/)
    await expect(page.getByRole('heading', { name: 'Workouts' })).toBeVisible()
    await expect(page.getByText('Workout TM Quick Access', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Wendler 5/3/1 BBB', { exact: true })).toBeVisible()

    const resumeDayButton = page.locator('button').filter({
      has: page.getByText('Bench Day', { exact: true }),
    }).filter({
      has: page.getByText('Resume', { exact: true }),
    }).first()

    await expect(resumeDayButton).toBeVisible()
    await expect(resumeDayButton).toContainText('4/8 sets logged')
    await resumeDayButton.click()
    await expect(page.getByText('Resume the in-progress workout from where you left off.')).toBeVisible()

    await page.getByRole('button', { name: 'Resume', exact: true }).click()

    await expect(page.getByText('Bench Day', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Back to workouts' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Complete Workout' })).toBeVisible()
    await expect(page.getByText('4 of 8 planned sets logged.', { exact: true })).toBeVisible()
  })

  test('supports analytics filter changes and AI insight generation', async ({ page }) => {
    let insightRequestBody: Record<string, unknown> | null = null
    let selectedExerciseName: string | null = null

    await page.route('**/api/insights/generate', async (route) => {
      insightRequestBody = route.request().postDataJSON() as Record<string, unknown>
      const scopedResponse = selectedExerciseName
        ? {
            summary: `${selectedExerciseName} momentum is positive, but the rest of the block needs closer monitoring.`,
            strengths: [`${selectedExerciseName} estimated 1RM is moving in the right direction.`],
            concerns: ['Another lift has gone multiple weeks without a fresh PR.'],
            recommendations: [`Keep ${selectedExerciseName} volume stable and add one focused exposure for the lagging lift this week.`],
            progressionGuidance: {
              disposition: 'actionable',
              action: 'increase',
              exerciseName: selectedExerciseName,
              methodContext: 'loaded_strength',
              rationale: `You have enough comparable signal to move ${selectedExerciseName} forward conservatively.`,
            },
          }
        : {
            summary: 'The current analytics filter shows positive momentum, but some lifts still need closer monitoring.',
            strengths: ['Estimated 1RM work is moving in the right direction within the current filter.'],
            concerns: ['Some lifts have gone multiple weeks without a fresh PR.'],
            recommendations: ['Keep the current block stable and narrow the scope to one lift before making a prescriptive change.'],
            progressionGuidance: {
              disposition: 'bounded',
              reason: 'broader_scope',
              note: 'Progression guidance stays bounded until you narrow the filter to a single lift with comparable signal.',
            },
          }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(scopedResponse),
      })
    })

    await page.goto('/analytics')

    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()
    await expect(page.locator('#analytics-range')).toContainText(/6m|Last 6 months/)

    selectedExerciseName = await selectAnalyticsExercise(page)

    if (selectedExerciseName) {
      await expect(page.locator('#analytics-exercise')).toContainText(selectedExerciseName)
    } else {
      await expect(page.locator('#analytics-exercise')).toContainText('All exercises')
    }

    await page.getByRole('tab', { name: 'Strength' }).click()
    await expect(page.getByRole('tab', { name: 'Strength', selected: true })).toBeVisible()

    await page.getByRole('tab', { name: 'AI Insights' }).click()
    let generateLabel = selectedExerciseName
      ? `Generate insight for ${selectedExerciseName}`
      : 'Generate insight for current analytics filter'

    if (!selectedExerciseName) {
      const currentScopeButton = page.getByRole('button', { name: generateLabel })

      await expect(currentScopeButton).toBeVisible()

      if (!await currentScopeButton.isEnabled()) {
        selectedExerciseName = await selectAnalyticsExercise(page)

        if (selectedExerciseName) {
          await expect(page.locator('#analytics-exercise')).toContainText(selectedExerciseName)
          generateLabel = `Generate insight for ${selectedExerciseName}`
        }
      }
    }

    await expect(page.getByRole('button', { name: generateLabel })).toBeVisible()
    await expect(page.getByRole('button', { name: generateLabel })).toBeEnabled()
    await page.getByRole('button', { name: generateLabel }).click()

    if (selectedExerciseName) {
      expect(insightRequestBody?.['exerciseId']).toEqual(expect.any(Number))
    } else {
      expect(insightRequestBody?.['exerciseId']).toBeNull()
    }

    expect(insightRequestBody?.['dateFrom']).toEqual(expect.any(String))
    expect(insightRequestBody?.['dateTo']).toEqual(expect.any(String))
    expect(insightRequestBody).not.toHaveProperty('exerciseName')

    await expect(page.getByRole('heading', { name: 'Summary' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Strengths' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Concerns' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Recommendations' })).toBeVisible()

    if (selectedExerciseName) {
      await expect(page.getByRole('heading', { name: 'Progression Guidance' })).toBeVisible()
      await expect(page.getByText(`${selectedExerciseName} momentum is positive, but the rest of the block needs closer monitoring.`)).toBeVisible()
    } else {
      await expect(page.getByRole('heading', { name: 'Progression Guidance' })).toHaveCount(0)
      await expect(page.getByText('The current analytics filter shows positive momentum, but some lifts still need closer monitoring.')).toBeVisible()
    }
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

    await expect(page).toHaveURL(/\/continue(?:\?.*)?$/)
    await expect(page.getByRole('button', { name: 'Continue as Guest' })).toBeVisible()

    await expect.poll(async () => {
      return await getPersistedQueryCacheKeys(page)
    }).toEqual([])

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/continue(?:\?.*)?$/)
  })
})
