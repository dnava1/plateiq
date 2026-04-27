import { test, expect } from '@playwright/test'
import { loginAsVerificationUser } from './helpers/auth'

function formatPercentageValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

test('opens the workout-only percentage editor on the active workout', async ({ page }) => {
  await loginAsVerificationUser(page)
  await page.goto('/workouts')

  await expect(page.getByRole('heading', { name: 'Workouts' })).toBeVisible()

  const resumeDayButton = page.locator('button').filter({
    has: page.getByText('Bench Day', { exact: true }),
  }).filter({
    has: page.getByText('Resume', { exact: true }),
  }).first()

  await expect(resumeDayButton).toBeVisible()
  await resumeDayButton.click()
  await page.getByRole('button', { name: 'Resume', exact: true }).click()

  await expect(page.getByRole('button', { name: 'Back to workouts' })).toBeVisible()

  const editableBlock = page.locator('[data-slot="card"]').filter({
    has: page.getByRole('button', { name: 'Edit remaining %' }),
  }).first()

  await expect(editableBlock).toBeVisible()

  const percentageBadge = editableBlock.getByText(/% (TM|1RM|first work set)/).first()
  const initialLabel = (await percentageBadge.textContent())?.trim() ?? ''
  const initialMatch = initialLabel.match(/(\d+(?:\.\d+)?)%/)

  expect(initialMatch).not.toBeNull()

  const nextPercentage = Number(initialMatch?.[1] ?? '0') + 5
  const nextPercentageLabel = formatPercentageValue(nextPercentage)

  await editableBlock.getByRole('button', { name: 'Edit remaining %' }).click()

  const percentageInput = page.getByLabel(/% (TM|1RM|first work set)/).first()
  await expect(percentageInput).toBeVisible()
  await expect(page.getByText(/Logged work stays as recorded\./)).toBeVisible()
  await percentageInput.fill(nextPercentageLabel)

  await expect(percentageInput).toHaveValue(nextPercentageLabel)
  await expect(page.getByRole('button', { name: 'Back to workouts' })).toBeVisible()
})
