import { expect, test, type Page } from '@playwright/test'
import { loginAsVerificationUser, seedVerificationUserSettings } from './helpers/auth'

function isHydrationWarning(message: string) {
  return /hydration|data-pressed|did not match|server rendered html/i.test(message)
}

function getPrimaryNav(page: Page) {
  return page.getByRole('navigation', { name: 'Primary' })
}

test.describe('settings refresh persistence', () => {
  test('keeps strength profile values visible after refresh while the unit persists without hydration warnings @smoke', async ({ page }) => {
    const consoleMessages: string[] = []

    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        consoleMessages.push(message.text())
      }
    })

    await seedVerificationUserSettings({
      preferredUnit: 'kg',
      strengthProfileAgeYears: 34,
      strengthProfileBodyweightLbs: 185,
      strengthProfileSex: 'male',
      weightRoundingLbs: 5.51156,
    })

    await loginAsVerificationUser(page)
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

    const ageInput = page.getByLabel('Age')
    const bodyweightInput = page.getByLabel(/Bodyweight \((lbs|kg)\)/)
    const sexTrigger = page.getByRole('combobox', { name: 'Sex' })
    const poundsToggle = page.getByRole('radio', { name: 'Pounds (lbs)' })
    const kilogramsToggle = page.getByRole('radio', { name: 'Kilograms (kg)' })

    await expect(kilogramsToggle).toHaveAttribute('aria-checked', 'true')
    await expect.poll(() => ageInput.inputValue()).toBe('34')
    await expect.poll(() => bodyweightInput.inputValue()).not.toBe('')
    await expect(sexTrigger).toContainText(/male/i)

    const expectedAgeValue = await ageInput.inputValue()
    const expectedBodyweightValue = await bodyweightInput.inputValue()
    const expectedSexLabel = (await sexTrigger.textContent())?.trim().toLowerCase() ?? ''
    const selectedUnit = await poundsToggle.getAttribute('aria-checked') === 'true' ? 'lbs' : 'kg'

    expect(expectedAgeValue).not.toBe('')
    expect(expectedBodyweightValue).not.toBe('')
    expect(expectedSexLabel).toMatch(/male|female/i)
    await expect(page.getByText(/Loads round down to 5 lbs or 2.5 kg automatically./i)).toBeVisible()

    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await expect(ageInput).toHaveValue(expectedAgeValue)
    await expect(bodyweightInput).toHaveValue(expectedBodyweightValue)
    await expect(sexTrigger).toContainText(new RegExp(expectedSexLabel, 'i'))
    await expect(page.getByText(/Loads round down to 5 lbs or 2.5 kg automatically./i)).toBeVisible()

    if (selectedUnit === 'lbs') {
      await expect(poundsToggle).toHaveAttribute('aria-checked', 'true')
      await expect(kilogramsToggle).toHaveAttribute('aria-checked', 'false')
    } else {
      await expect(kilogramsToggle).toHaveAttribute('aria-checked', 'true')
      await expect(poundsToggle).toHaveAttribute('aria-checked', 'false')
    }

    await getPrimaryNav(page).getByRole('link', { name: 'Analytics', exact: true }).click()
    await expect(page).toHaveURL(/\/analytics(?:\?.*)?$/)
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()
    await page.getByRole('tab', { name: 'Strength' }).click()
    await expect(page.getByText('Strength Profile', { exact: true })).toBeVisible()
    await expect(page.getByText('Total Score', { exact: true })).toBeVisible()
    await expect(page.getByText('Muscle-Group Profile', { exact: true })).toBeVisible()

    expect(consoleMessages.filter(isHydrationWarning)).toEqual([])
  })
})