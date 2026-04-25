import { expect, test, type Locator, type Page } from '@playwright/test'
import { loginAsVerificationUser } from './helpers/auth'

type MockExercise = {
  id: number
  name: string
  category: string
  movement_pattern: string
  is_main_lift: boolean
  strength_lift_slug: string | null
  created_at?: string
  created_by_user_id?: string
}

async function installBuilderNetworkRoutes(page: Page) {
  let exercises: MockExercise[] = [
    { id: 1, name: 'Squat', category: 'main', movement_pattern: 'squat', is_main_lift: true, strength_lift_slug: 'back_squat' },
    { id: 2, name: 'Bench Press', category: 'main', movement_pattern: 'push', is_main_lift: true, strength_lift_slug: 'bench_press' },
    { id: 3, name: 'Deadlift', category: 'main', movement_pattern: 'hinge', is_main_lift: true, strength_lift_slug: 'deadlift' },
    { id: 4, name: 'Overhead Press', category: 'main', movement_pattern: 'push', is_main_lift: true, strength_lift_slug: 'overhead_press' },
  ]
  let trainingMaxes: Array<{
    id: number
    exercise_id: number
    weight_lbs: number
    tm_percentage: number
    effective_date: string
    created_at: string | null
    user_id: string
  }> = []

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
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(exercises),
      })
      return
    }

    if (route.request().method() === 'POST') {
      const requestBody = route.request().postDataJSON() as {
        name: string
        category: 'main' | 'accessory'
        movement_pattern: string
      }
      const createdExercise = {
        id: 900 + exercises.length,
        name: requestBody.name,
        category: requestBody.category,
        movement_pattern: requestBody.movement_pattern,
        is_main_lift: requestBody.category === 'main',
        strength_lift_slug: null,
        created_at: '2026-04-01T00:00:00.000Z',
        created_by_user_id: 'playwright-user-1',
      }

      exercises = [...exercises, createdExercise]

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(createdExercise),
      })
      return
    }

    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
  })

  await page.route('**/rest/v1/training_maxes*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(trainingMaxes.map((trainingMax) => ({
          ...trainingMax,
          exercises: exercises.find((exercise) => exercise.id === trainingMax.exercise_id)
            ? {
                name: exercises.find((exercise) => exercise.id === trainingMax.exercise_id)?.name,
                category: exercises.find((exercise) => exercise.id === trainingMax.exercise_id)?.category,
                is_main_lift: exercises.find((exercise) => exercise.id === trainingMax.exercise_id)?.is_main_lift,
              }
            : null,
        }))),
      })
      return
    }

    if (route.request().method() === 'POST') {
      const requestBody = route.request().postDataJSON() as {
        exercise_id: number
        weight_lbs: number
        tm_percentage: number
        effective_date: string
        user_id: string
      }
      const createdTrainingMax = {
        id: 700 + trainingMaxes.length,
        exercise_id: requestBody.exercise_id,
        weight_lbs: requestBody.weight_lbs,
        tm_percentage: requestBody.tm_percentage,
        effective_date: requestBody.effective_date,
        created_at: '2026-04-01T00:00:00.000Z',
        user_id: requestBody.user_id,
      }

      trainingMaxes = [...trainingMaxes, createdTrainingMax]

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(createdTrainingMax),
      })
      return
    }

    await route.continue()
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

async function configureSingleDayScratchProgram(page: Page, name: string) {
  const main = page.getByRole('main')

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.locator('#name').fill(name)
    await expect(page.locator('#name')).toHaveValue(name)

    await page.locator('#dpw').click()
    await page.getByRole('option', { name: '1', exact: true }).click()
    await expect(page.locator('#dpw')).toContainText('1')

    await clickBuilderNext(main)

    if (await main.getByText('Name each training day so the rest of the build stays easy to scan.').isVisible({ timeout: 2000 }).catch(() => false)) {
      return
    }
  }

  throw new Error('Unable to advance the scratch builder into the days step.')
}

test.describe('program builder browser flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsVerificationUser(page)
    await installBuilderNetworkRoutes(page)
  })

  test('starts scratch builder from method context before TM-specific setup', async ({ page }) => {
    const main = page.getByRole('main')

    await page.goto('/programs/builder?method=general')

    await expect(page).toHaveURL(/\/programs\/builder\?method=general/)
    await expect(main.getByRole('heading', { name: 'Build a Program' })).toBeVisible()
    await expect(main.getByText('Programming Method', { exact: true })).toBeVisible()
    await expect(main.getByText('General Program', { exact: true })).toBeVisible()
    await expect(main.getByText('Training-Max Driven', { exact: true })).toBeVisible()
    await expect(main.getByText('Training Max Working Percentage', { exact: true })).toHaveCount(0)

    await page.goto('/programs/builder?method=tm_driven')

    await expect(page).toHaveURL(/\/programs\/builder\?method=tm_driven/)
    await expect(main.getByText('Training Max Working Percentage', { exact: true })).toBeVisible()
  })

  test('lets users click later builder steps without bypassing validation', async ({ page }) => {
    const main = page.getByRole('main')

    await page.goto('/programs/builder')

    await expect(page).toHaveURL(/\/programs\/builder$/)
    await main.getByRole('button', { name: /Review/i }).first().click()
    await expect(main.getByText('Give your program a name with at least 2 characters.')).toBeVisible()

    await page.locator('#name').fill('Bridge Block')
    await expect(page.locator('#name')).toHaveValue('Bridge Block')
    await main.getByRole('button', { name: /Review/i }).first().click()

    await expect(main.getByRole('button', { name: 'Add Exercise Block' })).toBeVisible()
    await expect(main.getByText('Add at least one exercise to Day 1 before continuing.')).toBeVisible()
  })

  test('keeps deload guidance manual in progression and review', async ({ page }) => {
    const main = page.getByRole('main')

    await page.goto('/programs/builder?template=smolov_jr&name=Smolov%20Jr.')

    await expect(page).toHaveURL(/\/programs\/builder\?template=smolov_jr/)
    await expect(main.getByRole('heading', { name: 'Customize a Program' })).toBeVisible()
    await expect(main.getByLabel('Program Name')).toHaveValue('Smolov Jr.')

    await reachProgressionStep(page)

    await expect(main.getByText('Deload decisions stay user-controlled and can be handled during the current cycle checkpoint instead of being saved as part of the progression rule.')).toBeVisible()
    await expect(main.getByText('Deload Trigger', { exact: true })).toHaveCount(0)
    await expect(main.getByText('Deload Strategy', { exact: true })).toHaveCount(0)

    await main.getByRole('button', { name: 'Review', exact: true }).click()

    const reviewManualDeloadText = main.getByText('Deload decisions stay manual and happen during the current cycle checkpoint.')

    await expect(reviewManualDeloadText).toBeVisible()
    await expect(main.getByText(/^Progression$/).last()).toBeVisible()
    await expect(main.getByText('Deload Trigger', { exact: true })).toHaveCount(0)
    await expect(main.getByText('Deload Strategy', { exact: true })).toHaveCount(0)
  })

  test('uses the builder exercise flow for existing-library selection and inline creation', async ({ page }) => {
    const main = page.getByRole('main')

    await page.goto('/programs/builder?method=general')

    await expect(page).toHaveURL(/\/programs\/builder\?method=general/)
    await configureSingleDayScratchProgram(page, 'Bridge Block')

    await clickBuilderNext(main)
    await expect(main.getByText(/^Day 1 of 1$/)).toBeVisible()

    await main.getByRole('button', { name: 'Add Exercise Block' }).click()
    const exerciseInputs = main.getByPlaceholder('Search your exercise library')
    const createExerciseButtons = main.getByRole('button', { name: 'Create Exercise' })

    await exerciseInputs.nth(0).fill('Squat')
    await main.getByRole('option', { name: /Squat/i }).first().click()
    await expect(exerciseInputs.nth(0)).toHaveValue('Squat')

    await main.getByRole('button', { name: 'Add Exercise Block' }).click()

    await exerciseInputs.nth(1).fill('Cable Row')
    await createExerciseButtons.nth(1).click()

    await expect(page.getByRole('heading', { name: 'Create and Add Exercise' })).toBeVisible()
    await page.getByRole('button', { name: 'Create and Select Exercise' }).click()

    await expect(exerciseInputs.nth(1)).toHaveValue('Cable Row')
    await expect(main.getByText('Selected', { exact: true })).toHaveCount(2)

    await main.getByRole('button', { name: 'Continue to Progression' }).click()
    await expect(main.getByText('How should weights increase over time?')).toBeVisible()
  })

  test('requires current training maxes before a TM-backed program can be saved', async ({ page }) => {
    const main = page.getByRole('main')

    await page.goto('/programs/builder?method=tm_driven')

    await expect(page).toHaveURL(/\/programs\/builder\?method=tm_driven/)
    await configureSingleDayScratchProgram(page, 'TM Bridge')

    await clickBuilderNext(main)
    await expect(main.getByText(/^Day 1 of 1$/)).toBeVisible()

    await main.getByRole('button', { name: 'Add Exercise Block' }).click()
    const exerciseInput = main.getByPlaceholder('Search your exercise library').first()

    await exerciseInput.fill('Squat')
    await main.getByRole('option', { name: /Squat/i }).first().click()
    await expect(exerciseInput).toHaveValue('Squat')

    await main.getByRole('button', { name: 'Continue to Progression' }).click()
    await expect(main.getByText('How should weights increase over time?')).toBeVisible()

    await main.getByRole('button', { name: 'Review', exact: true }).click()

    await expect(main.getByText('Required Training Maxes', { exact: true })).toBeVisible()
    await expect(main.getByText('Set current training maxes for Squat before you save this program.')).toBeVisible()

    const createButton = main.getByRole('button', { name: 'Create Program' })
    await expect(createButton).toBeDisabled()

    await expect(main.getByRole('button', { name: 'Set TM', exact: true })).toBeVisible()
    await main.getByRole('button', { name: 'Set TM', exact: true }).click()

    await expect(page.getByRole('heading', { name: 'Set Training Max — Squat' })).toBeVisible()
    await page.getByLabel('Training Max (lbs)').fill('315')
    await page.getByRole('button', { name: 'Save Training Max' }).click()

    await expect(main.getByText('All required training maxes are set for this program.')).toBeVisible()
    await expect(createButton).toBeEnabled()
  })

  test('requires current training maxes for non-primary lifts that still use percentage loading', async ({ page }) => {
    const main = page.getByRole('main')

    await page.goto('/programs/builder?method=general')

    await expect(page).toHaveURL(/\/programs\/builder\?method=general/)
    await configureSingleDayScratchProgram(page, 'Bench Volume Block')

    await clickBuilderNext(main)
    await expect(main.getByText(/^Day 1 of 1$/)).toBeVisible()

    await main.getByRole('button', { name: 'Add Exercise Block' }).click()
    const exerciseInputs = main.getByPlaceholder('Search your exercise library')

    await exerciseInputs.nth(0).fill('Squat')
    await main.getByRole('option', { name: /Squat/i }).first().click()

    await main.getByRole('button', { name: 'Add Exercise Block' }).click()
    await exerciseInputs.nth(1).fill('Bench Press')
    await main.getByText('Bench Press', { exact: true }).last().click()

    await main.locator('button[role="combobox"]').nth(3).click()
    await page.getByRole('option', { name: '1RM %', exact: true }).click()

    await main.getByRole('button', { name: 'Continue to Progression' }).click()
    await expect(main.getByText('How should weights increase over time?')).toBeVisible()

    await main.getByRole('button', { name: 'Review', exact: true }).click()

    await expect(main.getByText('Required Training Maxes', { exact: true })).toBeVisible()
    await expect(main.getByText('Set current training maxes for Bench Press before you save this program.')).toBeVisible()
    await expect(main.getByRole('button', { name: 'Create Program' })).toBeDisabled()
  })
})
