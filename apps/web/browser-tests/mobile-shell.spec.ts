import { expect, test } from '@playwright/test'
import { loginAsVerificationUser } from './helpers/auth'

test.describe('mobile app shell scrolling', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
  })

  test('keeps chrome anchored while the authenticated main region owns scrolling', async ({ page }) => {
    await loginAsVerificationUser(page)

    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    const scrollRegion = page.locator('[data-app-scroll-region="true"]')
    const appTabs = page.getByRole('navigation', { name: 'App tabs' })

    await expect(page.locator('[data-authenticated-shell="true"]')).toBeVisible()
    await expect(scrollRegion).toBeVisible()
    await expect(appTabs).toBeVisible()

    const initialMetrics = await page.evaluate(() => {
      const scrollRegionElement = document.querySelector<HTMLElement>('[data-app-scroll-region="true"]')
      const shell = document.querySelector<HTMLElement>('[data-authenticated-shell="true"]')
      const header = document.querySelector<HTMLElement>('header .app-shell > div')
      const tabs = document.querySelector<HTMLElement>('nav[aria-label="App tabs"] .app-shell > div')

      if (!scrollRegionElement || !shell || !header || !tabs) {
        throw new Error('Missing mobile app shell elements.')
      }

      const headerRect = header.getBoundingClientRect()
      const tabsRect = tabs.getBoundingClientRect()
      const scrollStyles = getComputedStyle(scrollRegionElement)
      const shellStyles = getComputedStyle(shell)

      return {
        headerTop: headerRect.top,
        headerBottom: headerRect.bottom,
        rootScrollTop: document.scrollingElement?.scrollTop ?? 0,
        scrollHeight: scrollRegionElement.scrollHeight,
        scrollRegionClientHeight: scrollRegionElement.clientHeight,
        scrollRegionOverflowY: scrollStyles.overflowY,
        shellOverflowY: shellStyles.overflowY,
        tabsBottomGap: window.innerHeight - tabsRect.bottom,
        tabsTop: tabsRect.top,
      }
    })

    expect(initialMetrics.rootScrollTop).toBe(0)
    expect(initialMetrics.scrollRegionOverflowY).toBe('auto')
    expect(initialMetrics.shellOverflowY).toBe('hidden')
    expect(initialMetrics.scrollHeight).toBeGreaterThan(initialMetrics.scrollRegionClientHeight)
    expect(initialMetrics.headerBottom).toBeGreaterThan(0)
    expect(initialMetrics.tabsBottomGap).toBeLessThanOrEqual(8)

    await page.evaluate(() => window.scrollTo(0, 600))
    await expect.poll(async () => (
      page.evaluate(() => document.scrollingElement?.scrollTop ?? 0)
    )).toBe(0)

    await scrollRegion.evaluate((element) => element.scrollTo(0, Math.min(600, element.scrollHeight - element.clientHeight)))
    await expect.poll(async () => (
      scrollRegion.evaluate((element) => element.scrollTop)
    )).toBeGreaterThan(0)

    const scrolledMetrics = await page.evaluate(() => {
      const scrollRegionElement = document.querySelector<HTMLElement>('[data-app-scroll-region="true"]')
      const header = document.querySelector<HTMLElement>('header .app-shell > div')
      const tabs = document.querySelector<HTMLElement>('nav[aria-label="App tabs"] .app-shell > div')

      if (!scrollRegionElement || !header || !tabs) {
        throw new Error('Missing mobile app shell elements.')
      }

      const headerRect = header.getBoundingClientRect()
      const tabsRect = tabs.getBoundingClientRect()

      return {
        headerTop: headerRect.top,
        rootScrollTop: document.scrollingElement?.scrollTop ?? 0,
        scrollRegionTop: scrollRegionElement.scrollTop,
        tabsBottomGap: window.innerHeight - tabsRect.bottom,
      }
    })

    expect(scrolledMetrics.rootScrollTop).toBe(0)
    expect(scrolledMetrics.scrollRegionTop).toBeGreaterThan(0)
    expect(Math.abs(scrolledMetrics.headerTop - initialMetrics.headerTop)).toBeLessThanOrEqual(1)
    expect(scrolledMetrics.tabsBottomGap).toBeLessThanOrEqual(8)

    await scrollRegion.evaluate((element) => element.scrollTo(0, element.scrollHeight))
    await expect.poll(async () => (
      scrollRegion.evaluate((element) => element.scrollTop + element.clientHeight >= element.scrollHeight - 1)
    )).toBeTruthy()

    const bottomMetrics = await page.evaluate(() => {
      const scrollRegionElement = document.querySelector<HTMLElement>('[data-app-scroll-region="true"]')
      const tabs = document.querySelector<HTMLElement>('nav[aria-label="App tabs"] .app-shell > div')
      const cards = scrollRegionElement
        ? Array.from(scrollRegionElement.querySelectorAll<HTMLElement>('[data-slot="card"]'))
        : []
      const lastCard = cards.at(-1)

      if (!scrollRegionElement || !tabs || !lastCard) {
        throw new Error('Missing scroll region, mobile tabs, or dashboard card.')
      }

      return {
        lastCardBottom: lastCard.getBoundingClientRect().bottom,
        rootScrollTop: document.scrollingElement?.scrollTop ?? 0,
        tabsTop: tabs.getBoundingClientRect().top,
      }
    })

    expect(bottomMetrics.rootScrollTop).toBe(0)
    expect(bottomMetrics.lastCardBottom).toBeLessThan(bottomMetrics.tabsTop)
  })

  test('preserves the shell contract when the standalone PWA height path is forced', async ({ page }) => {
    await loginAsVerificationUser(page)

    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/)
    await page.evaluate(() => {
      document.documentElement.dataset.pwaDisplayMode = 'standalone'
    })
    await expect.poll(async () => (
      page.evaluate(() => {
        const shell = document.querySelector<HTMLElement>('[data-authenticated-shell="true"]')

        return shell
          ? getComputedStyle(shell).getPropertyValue('--authenticated-shell-height-mode').trim()
          : ''
      })
    )).toBe('standalone')

    const standaloneMetrics = await page.evaluate(() => {
      const shell = document.querySelector<HTMLElement>('[data-authenticated-shell="true"]')
      const scrollRegionElement = document.querySelector<HTMLElement>('[data-app-scroll-region="true"]')

      if (!shell || !scrollRegionElement) {
        throw new Error('Missing standalone mobile shell elements.')
      }

      const shellStyles = getComputedStyle(shell)

      return {
        heightMode: shellStyles.getPropertyValue('--authenticated-shell-height-mode').trim(),
        rootScrollTop: document.scrollingElement?.scrollTop ?? 0,
        shellClientHeight: shell.clientHeight,
        viewportHeight: window.innerHeight,
      }
    })

    expect(standaloneMetrics.heightMode).toBe('standalone')
    expect(standaloneMetrics.rootScrollTop).toBe(0)
    expect(Math.abs(standaloneMetrics.shellClientHeight - standaloneMetrics.viewportHeight)).toBeLessThanOrEqual(1)

    const scrollRegion = page.locator('[data-app-scroll-region="true"]')
    await scrollRegion.evaluate((element) => element.scrollTo(0, Math.min(600, element.scrollHeight - element.clientHeight)))
    await expect.poll(async () => (
      scrollRegion.evaluate((element) => element.scrollTop)
    )).toBeGreaterThan(0)
    await expect.poll(async () => (
      page.evaluate(() => document.scrollingElement?.scrollTop ?? 0)
    )).toBe(0)
  })
})
