import { expect, test } from '@playwright/test'
import { loginAsVerificationUser, seedVerificationUserSettings } from './helpers/auth'

function isHydrationWarning(message: string) {
  return /hydration|data-pressed|did not match|server rendered html/i.test(message)
}

test.describe('settings refresh persistence', () => {
  test('keeps strength profile values visible after refresh while unit and rounding persist without hydration warnings', async ({ page }) => {
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
    const roundingTrigger = page.getByRole('combobox', { name: /Rounding increment/ })
    const poundsToggle = page.getByRole('radio', { name: 'Pounds (lbs)' })
    const kilogramsToggle = page.getByRole('radio', { name: 'Kilograms (kg)' })

    await expect(kilogramsToggle).toHaveAttribute('aria-checked', 'true')
    await expect.poll(() => ageInput.inputValue()).toBe('34')
    await expect.poll(() => bodyweightInput.inputValue()).not.toBe('')
    await expect(sexTrigger).toContainText(/male/i)

    const expectedAgeValue = await ageInput.inputValue()
    const expectedBodyweightValue = await bodyweightInput.inputValue()
    const expectedSexLabel = (await sexTrigger.textContent())?.trim().toLowerCase() ?? ''
    const expectedRoundingText = (await roundingTrigger.textContent())?.trim() ?? ''
    const selectedUnit = await poundsToggle.getAttribute('aria-checked') === 'true' ? 'lbs' : 'kg'

    expect(expectedAgeValue).not.toBe('')
    expect(expectedBodyweightValue).not.toBe('')
    expect(expectedSexLabel).toMatch(/male|female/i)

    await expect(ageInput).toHaveValue(expectedAgeValue)
    await expect(bodyweightInput).toHaveValue(expectedBodyweightValue)
    await expect(sexTrigger).toContainText(new RegExp(expectedSexLabel, 'i'))
    await expect(roundingTrigger).toContainText(expectedRoundingText)

    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await expect(ageInput).toHaveValue(expectedAgeValue)
    await expect(bodyweightInput).toHaveValue(expectedBodyweightValue)
    await expect(sexTrigger).toContainText(new RegExp(expectedSexLabel, 'i'))
    await expect(roundingTrigger).toContainText(expectedRoundingText)

    if (selectedUnit === 'lbs') {
      await expect(poundsToggle).toHaveAttribute('aria-checked', 'true')
      await expect(kilogramsToggle).toHaveAttribute('aria-checked', 'false')
    } else {
      await expect(kilogramsToggle).toHaveAttribute('aria-checked', 'true')
      await expect(poundsToggle).toHaveAttribute('aria-checked', 'false')
    }

    expect(consoleMessages.filter(isHydrationWarning)).toEqual([])
  })
})