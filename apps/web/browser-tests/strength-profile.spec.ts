import { expect, test, type Page } from '@playwright/test'
import { loginAsVerificationUser } from './helpers/auth'

type StrengthProfileState = {
  ageYears: number | null
  bodyweightLbs: number | null
  sex: 'male' | 'female' | null
}

function buildStrengthProfilePayload(state: StrengthProfileState) {
  const profile = {
    age_years: state.ageYears,
    bodyweight_lbs: state.bodyweightLbs,
    sex: state.sex,
  }

  if (state.ageYears === null || state.bodyweightLbs === null || state.sex === null) {
    return {
      profile,
      minimum_category_count: 3,
      minimum_lift_count: 3,
      lifts: [],
    }
  }

  return {
    profile,
    minimum_category_count: 3,
    minimum_lift_count: 3,
    lifts: [
      {
        lift_slug: 'back_squat',
        display_name: 'Back Squat',
        category_key: 'squat',
        category_label: 'Squat',
        source_exercise_id: 1,
        source_exercise_name: 'Squat',
        best_date: '2026-04-10',
        best_reps: 1,
        best_external_weight_lbs: 322.9,
        best_total_load_lbs: 322.9,
        best_one_rm_lbs: 322.9,
        benchmark_one_rm_lbs: 322.9,
        muscle_weights: { glutes: 0.4, quads: 0.6 },
        actual_rep_maxes: [{ reps: 1, weight_lbs: 322.9 }],
        benchmark_rep_maxes: [{ reps: 1, weight_lbs: 322.9 }],
      },
      {
        lift_slug: 'bench_press',
        display_name: 'Bench Press',
        category_key: 'bench',
        category_label: 'Bench',
        source_exercise_id: 2,
        source_exercise_name: 'Bench Press',
        best_date: '2026-04-09',
        best_reps: 1,
        best_external_weight_lbs: 219.1,
        best_total_load_lbs: 219.1,
        best_one_rm_lbs: 219.1,
        benchmark_one_rm_lbs: 219.1,
        muscle_weights: { chest: 0.6, triceps: 0.4 },
        actual_rep_maxes: [{ reps: 1, weight_lbs: 219.1 }],
        benchmark_rep_maxes: [{ reps: 1, weight_lbs: 219.1 }],
      },
      {
        lift_slug: 'chin_up',
        display_name: 'Chin-Up',
        category_key: 'pull',
        category_label: 'Pull',
        source_exercise_id: 3,
        source_exercise_name: 'Chin-Up',
        best_date: '2026-04-08',
        best_reps: 1,
        best_external_weight_lbs: 57.3,
        best_total_load_lbs: 222.3,
        best_one_rm_lbs: 222.3,
        benchmark_one_rm_lbs: 222.3,
        muscle_weights: { biceps: 0.3, lats: 0.7 },
        actual_rep_maxes: [{ reps: 1, weight_lbs: 222.3 }],
        benchmark_rep_maxes: [{ reps: 1, weight_lbs: 222.3 }],
      },
    ],
  }
}

function buildAnalyticsPayload(state: StrengthProfileState) {
  return {
    e1rm_trend: [],
    volume_trend: [],
    pr_history: [],
    consistency: {
      total_sessions: 0,
      weeks_active: 0,
      first_session: null,
      last_session: null,
    },
    muscle_balance: [],
    stall_detection: [],
    tm_progression: [],
    strength_profile: buildStrengthProfilePayload(state),
  }
}

async function installStrengthProfileRoutes(page: Page, state: StrengthProfileState) {
  await page.route('**/rest/v1/profiles*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-1',
        preferred_unit: 'lbs',
        strength_profile_age_years: state.ageYears,
        strength_profile_bodyweight_lbs: state.bodyweightLbs,
        strength_profile_sex: state.sex,
      }),
    })
  })

  await page.route('**/rest/v1/rpc/update_strength_profile', async (route) => {
    const body = route.request().postDataJSON() as {
      p_age_years?: number
      p_bodyweight_lbs?: number
      p_sex?: 'male' | 'female'
    }

    if (Object.prototype.hasOwnProperty.call(body, 'p_age_years')) {
      state.ageYears = body.p_age_years ?? null
    }

    if (Object.prototype.hasOwnProperty.call(body, 'p_bodyweight_lbs')) {
      state.bodyweightLbs = body.p_bodyweight_lbs ?? null
    }

    if (Object.prototype.hasOwnProperty.call(body, 'p_sex')) {
      state.sex = body.p_sex ?? null
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-1',
        strength_profile_age_years: state.ageYears,
        strength_profile_bodyweight_lbs: state.bodyweightLbs,
        strength_profile_sex: state.sex,
      }),
    })
  })

  await page.route('**/rest/v1/rpc/get_analytics_data', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildAnalyticsPayload(state)),
    })
  })
}

test.describe('strength profile browser flow', () => {
  test('saves the strength profile and renders the analytics summary from the saved snapshot', async ({ page }) => {
    const state: StrengthProfileState = {
      ageYears: 28,
      bodyweightLbs: 160,
      sex: 'female',
    }

    await installStrengthProfileRoutes(page, state)
    await loginAsVerificationUser(page)

    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

    await page.getByLabel('Age').fill('29')
    await page.getByLabel('Bodyweight (lbs)').fill('165')
    await expect(page.getByRole('button', { name: 'Save Strength Profile' })).toHaveCount(0)

    await expect.poll(() => state.ageYears).toBe(29)
    await expect.poll(() => state.bodyweightLbs).toBe(165)
    await expect.poll(() => state.sex).toBe('female')

    await page.goto('/analytics')
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()
    await page.waitForLoadState('networkidle')

    const strengthTab = page.locator('main [role="tablist"]').first().getByRole('tab', { name: 'Strength', exact: true })
    await expect(strengthTab).toBeVisible()
    await strengthTab.click({ force: true })

    await expect(page.getByRole('tabpanel', { name: 'Strength', exact: true })).toBeVisible()
    await expect(page.getByText('Strength Profile', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Back Squat', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Muscle-Group Profile', { exact: true })).toBeVisible()
    await expect(page.getByText('Total Score', { exact: true })).toBeVisible()
    await expect(page.getByText('100.0', { exact: true }).first()).toBeVisible()
  })
})