import { test, expect, type Locator, type Page } from '@playwright/test'
import { loginAsVerificationUser } from './helpers/auth'

async function openProgramDialog(page: Page) {
  await loginAsVerificationUser(page)
  await page.goto('/programs')
  await expect(page.getByRole('heading', { name: 'Programs' })).toBeVisible()
  await page.getByRole('button', { name: 'New Program' }).evaluate((button: HTMLButtonElement) => button.click())
  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Start a Program' }) })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Find a starting point')).toBeVisible()
  return dialog
}

async function expectNotClipped(locator: Locator) {
  await expect(locator).toBeVisible()

  const isFullyVisible = await locator.evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      return false
    }

    if (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1) {
      return false
    }

    const rect = element.getBoundingClientRect()
    let current: HTMLElement | null = element.parentElement

    const clips = (value: string) => ['auto', 'clip', 'hidden', 'scroll'].includes(value)

    while (current) {
      const style = window.getComputedStyle(current)
      const currentRect = current.getBoundingClientRect()
      const clipsX = clips(style.overflowX) || clips(style.overflow)
      const clipsY = clips(style.overflowY) || clips(style.overflow)

      if (clipsX && (rect.left < currentRect.left - 1 || rect.right > currentRect.right + 1)) {
        return false
      }

      if (clipsY && (rect.top < currentRect.top - 1 || rect.bottom > currentRect.bottom + 1)) {
        return false
      }

      current = current.parentElement
    }

    return true
  })

  expect(isFullyVisible).toBe(true)
}

test.describe('template picker filter chips', () => {
  test('keeps Advanced and 6 days chips fully visible on a large viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1200 })
    const dialog = await openProgramDialog(page)

    await expectNotClipped(dialog.getByRole('button', { name: 'Advanced', exact: true }))
    await expectNotClipped(dialog.getByRole('button', { name: /6 day/i }))
  })

  test('keeps Advanced and 6 days chips fully visible on a small mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const dialog = await openProgramDialog(page)

    await expectNotClipped(dialog.getByRole('button', { name: 'Advanced', exact: true }))
    await expectNotClipped(dialog.getByRole('button', { name: /6 day/i }))
  })
})
