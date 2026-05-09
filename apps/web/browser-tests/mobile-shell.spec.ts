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
      const headerSlot = document.querySelector<HTMLElement>('[data-app-header-slot="true"]')
      const header = document.querySelector<HTMLElement>('[data-app-chrome="header"] .app-shell > div')
      const tabsChrome = document.querySelector<HTMLElement>('[data-app-chrome="tabs"]')
      const tabs = document.querySelector<HTMLElement>('[data-app-chrome="tabs"] .app-shell > div')

      if (!scrollRegionElement || !shell || !headerSlot || !header || !tabsChrome || !tabs) {
        throw new Error('Missing mobile app shell elements.')
      }

      const headerSlotRect = headerSlot.getBoundingClientRect()
      const headerRect = header.getBoundingClientRect()
      const scrollRegionRect = scrollRegionElement.getBoundingClientRect()
      const tabsChromeRect = tabsChrome.getBoundingClientRect()
      const tabsRect = tabs.getBoundingClientRect()
      const tabLinks = Array.from(tabs.querySelectorAll<HTMLElement>('a'))
      const tabLinkHeights = tabLinks.map((link) => (
        link.getBoundingClientRect().height
      ))
      const firstTabLinkStyles = getComputedStyle(tabLinks[0])
      const headerBackdrop = getComputedStyle(headerSlot, '::before')
      const tabsBackdrop = getComputedStyle(tabsChrome, '::before')
      const scrollbarThumb = getComputedStyle(scrollRegionElement, '::-webkit-scrollbar-thumb')
      const scrollbarTrack = getComputedStyle(scrollRegionElement, '::-webkit-scrollbar-track')
      const getBackdropFilter = (style: CSSStyleDeclaration) => (
        style.getPropertyValue('backdrop-filter')
        || style.getPropertyValue('-webkit-backdrop-filter')
        || (style as CSSStyleDeclaration & { webkitBackdropFilter?: string }).webkitBackdropFilter
        || ''
      )
      const getMaskImage = (style: CSSStyleDeclaration) => (
        style.getPropertyValue('mask-image')
        || style.getPropertyValue('-webkit-mask-image')
        || (style as CSSStyleDeclaration & { webkitMaskImage?: string }).webkitMaskImage
        || ''
      )
      const scrollStyles = getComputedStyle(scrollRegionElement)
      const shellStyles = getComputedStyle(shell)

      return {
        headerTop: headerRect.top,
        headerBottom: headerRect.bottom,
        headerHeight: headerRect.height,
        headerSlotLeft: headerSlotRect.left,
        headerSlotRight: headerSlotRect.right,
        headerPanelLeft: headerRect.left,
        headerPanelRight: headerRect.right,
        headerPanelRadius: getComputedStyle(header).borderRadius,
        headerBackdropDisplay: headerBackdrop.display,
        headerBackdropImage: headerBackdrop.backgroundImage,
        headerBackdropBottom: headerBackdrop.bottom,
        headerBackdropFilter: getBackdropFilter(headerBackdrop),
        headerBackdropMaskImage: getMaskImage(headerBackdrop),
        rootScrollTop: document.scrollingElement?.scrollTop ?? 0,
        scrollRegionBottom: scrollRegionRect.bottom,
        scrollHeight: scrollRegionElement.scrollHeight,
        scrollRegionClientHeight: scrollRegionElement.clientHeight,
        scrollRegionTopEdge: scrollRegionRect.top,
        scrollbarColor: scrollStyles.scrollbarColor,
        scrollbarThumbRadius: scrollbarThumb.borderRadius,
        scrollbarTrackRadius: scrollbarTrack.borderRadius,
        scrollbarWidth: scrollStyles.scrollbarWidth,
        scrollRegionOverflowY: scrollStyles.overflowY,
        shellOverflowY: shellStyles.overflowY,
        tabsChromeLeft: tabsChromeRect.left,
        tabsChromeRight: tabsChromeRect.right,
        tabsHeight: tabsRect.height,
        tabsPanelLeft: tabsRect.left,
        tabsPanelRight: tabsRect.right,
        tabsPanelRadius: getComputedStyle(tabs).borderRadius,
        tabLinkJustifyContent: firstTabLinkStyles.justifyContent,
        tabLinkMinHeight: Math.min(...tabLinkHeights),
        tabLinkMaxHeight: Math.max(...tabLinkHeights),
        tabsBackdropDisplay: tabsBackdrop.display,
        tabsBackdropImage: tabsBackdrop.backgroundImage,
        tabsBackdropTop: tabsBackdrop.top,
        tabsBackdropFilter: getBackdropFilter(tabsBackdrop),
        tabsBackdropMaskImage: getMaskImage(tabsBackdrop),
        tabsBottomGap: window.innerHeight - tabsRect.bottom,
        tabsTop: tabsRect.top,
        viewportWidth: window.innerWidth,
      }
    })

    expect(initialMetrics.rootScrollTop).toBe(0)
    expect(initialMetrics.scrollRegionOverflowY).toBe('auto')
    expect(initialMetrics.shellOverflowY).toBe('hidden')
    expect(initialMetrics.scrollbarColor).toContain('rgba')
    expect(initialMetrics.scrollbarThumbRadius).toBe('999px')
    expect(initialMetrics.scrollbarTrackRadius).toBe('999px')
    expect(initialMetrics.scrollbarWidth).toBe('thin')
    expect(initialMetrics.scrollHeight).toBeGreaterThan(initialMetrics.scrollRegionClientHeight)
    expect(initialMetrics.headerTop).toBeGreaterThanOrEqual(0)
    expect(initialMetrics.headerBottom).toBeGreaterThan(0)
    expect(initialMetrics.scrollRegionTopEdge).toBeGreaterThanOrEqual(initialMetrics.headerBottom - 1)
    expect(Math.abs(initialMetrics.headerSlotLeft)).toBeLessThanOrEqual(1)
    expect(Math.abs(initialMetrics.headerSlotRight - initialMetrics.viewportWidth)).toBeLessThanOrEqual(1)
    expect(initialMetrics.headerPanelLeft).toBeGreaterThan(initialMetrics.headerSlotLeft)
    expect(initialMetrics.headerPanelRight).toBeLessThan(initialMetrics.headerSlotRight)
    expect(initialMetrics.headerBackdropDisplay).toBe('block')
    expect(initialMetrics.headerBackdropBottom).toBe('0px')
    expect(initialMetrics.headerBackdropImage).toContain('gradient')
    expect(initialMetrics.headerBackdropFilter).toContain('blur')
    expect(initialMetrics.headerBackdropFilter).not.toContain('brightness')
    expect(initialMetrics.headerBackdropMaskImage).toContain('gradient')
    expect(Math.abs(initialMetrics.tabsChromeLeft)).toBeLessThanOrEqual(1)
    expect(Math.abs(initialMetrics.tabsChromeRight - initialMetrics.viewportWidth)).toBeLessThanOrEqual(1)
    expect(initialMetrics.tabsPanelLeft).toBeGreaterThan(initialMetrics.tabsChromeLeft)
    expect(initialMetrics.tabsPanelRight).toBeLessThan(initialMetrics.tabsChromeRight)
    expect(initialMetrics.tabsPanelRadius).toBe(initialMetrics.headerPanelRadius)
    expect(initialMetrics.tabsHeight).toBeLessThanOrEqual(64)
    expect(initialMetrics.tabLinkJustifyContent).toBe('center')
    expect(initialMetrics.tabLinkMinHeight).toBe(48)
    expect(initialMetrics.tabLinkMaxHeight).toBe(48)
    expect(initialMetrics.tabsBackdropDisplay).toBe('block')
    expect(initialMetrics.tabsBackdropTop).toBe('0px')
    expect(initialMetrics.tabsBackdropImage).toContain('gradient')
    expect(initialMetrics.tabsBackdropFilter).toContain('blur')
    expect(initialMetrics.tabsBackdropFilter).not.toContain('brightness')
    expect(initialMetrics.tabsBackdropMaskImage).toContain('gradient')
    expect(initialMetrics.tabsBottomGap).toBeGreaterThanOrEqual(0)
    expect(initialMetrics.tabsBottomGap).toBeLessThanOrEqual(48)
    expect(initialMetrics.scrollRegionBottom).toBeLessThanOrEqual(initialMetrics.tabsTop + 1)

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
      const header = document.querySelector<HTMLElement>('[data-app-chrome="header"] .app-shell > div')
      const tabs = document.querySelector<HTMLElement>('[data-app-chrome="tabs"] .app-shell > div')

      if (!scrollRegionElement || !header || !tabs) {
        throw new Error('Missing mobile app shell elements.')
      }

      const headerRect = header.getBoundingClientRect()
      const tabsRect = tabs.getBoundingClientRect()

      return {
        headerBottom: headerRect.bottom,
        headerTop: headerRect.top,
        rootScrollTop: document.scrollingElement?.scrollTop ?? 0,
        scrollRegionTop: scrollRegionElement.scrollTop,
        tabsBottomGap: window.innerHeight - tabsRect.bottom,
        tabsTop: tabsRect.top,
      }
    })

    expect(scrolledMetrics.rootScrollTop).toBe(0)
    expect(scrolledMetrics.scrollRegionTop).toBeGreaterThan(0)
    expect(Math.abs(scrolledMetrics.headerTop - initialMetrics.headerTop)).toBeLessThanOrEqual(1)
    expect(Math.abs(scrolledMetrics.headerBottom - initialMetrics.headerBottom)).toBeLessThanOrEqual(1)
    expect(scrolledMetrics.tabsBottomGap).toBeGreaterThanOrEqual(0)
    expect(scrolledMetrics.tabsBottomGap).toBeLessThanOrEqual(48)
    expect(Math.abs(scrolledMetrics.tabsTop - initialMetrics.tabsTop)).toBeLessThanOrEqual(1)

    await scrollRegion.evaluate((element) => element.scrollTo(0, element.scrollHeight))
    await expect.poll(async () => (
      scrollRegion.evaluate((element) => element.scrollTop + element.clientHeight >= element.scrollHeight - 1)
    )).toBeTruthy()

    const bottomMetrics = await page.evaluate(() => {
      const scrollRegionElement = document.querySelector<HTMLElement>('[data-app-scroll-region="true"]')
      const tabs = document.querySelector<HTMLElement>('[data-app-chrome="tabs"] .app-shell > div')
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
      document.documentElement.style.setProperty('--app-safe-area-inset-bottom', '34px')
    })

    const browserTabsBottomGap = await page.evaluate(() => {
      const tabs = document.querySelector<HTMLElement>('[data-app-chrome="tabs"] .app-shell > div')

      if (!tabs) {
        throw new Error('Missing browser mobile tabs.')
      }

      return window.innerHeight - tabs.getBoundingClientRect().bottom
    })

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
      const header = document.querySelector<HTMLElement>('[data-app-chrome="header"] .app-shell > div')
      const tabs = document.querySelector<HTMLElement>('[data-app-chrome="tabs"] .app-shell > div')

      if (!shell || !scrollRegionElement || !header || !tabs) {
        throw new Error('Missing standalone mobile shell elements.')
      }

      const headerRect = header.getBoundingClientRect()
      const tabsRect = tabs.getBoundingClientRect()
      const shellStyles = getComputedStyle(shell)

      return {
        headerBottom: headerRect.bottom,
        headerHeight: headerRect.height,
        headerTop: headerRect.top,
        heightMode: shellStyles.getPropertyValue('--authenticated-shell-height-mode').trim(),
        rootScrollTop: document.scrollingElement?.scrollTop ?? 0,
        shellClientHeight: shell.clientHeight,
        tabsBottomGap: window.innerHeight - tabsRect.bottom,
        viewportHeight: window.innerHeight,
      }
    })

    expect(standaloneMetrics.heightMode).toBe('standalone')
    expect(standaloneMetrics.rootScrollTop).toBe(0)
    expect(Math.abs(standaloneMetrics.shellClientHeight - standaloneMetrics.viewportHeight)).toBeLessThanOrEqual(1)
    expect(browserTabsBottomGap).toBeGreaterThanOrEqual(30)
    expect(standaloneMetrics.tabsBottomGap).toBeLessThan(browserTabsBottomGap)
    expect(standaloneMetrics.tabsBottomGap).toBeGreaterThanOrEqual(6)
    expect(standaloneMetrics.tabsBottomGap).toBeLessThanOrEqual(12)

    const scrollRegion = page.locator('[data-app-scroll-region="true"]')
    await scrollRegion.evaluate((element) => element.scrollTo(0, Math.min(600, element.scrollHeight - element.clientHeight)))
    await expect.poll(async () => (
      scrollRegion.evaluate((element) => element.scrollTop)
    )).toBeGreaterThan(0)
    await expect.poll(async () => (
      page.evaluate(() => document.scrollingElement?.scrollTop ?? 0)
    )).toBe(0)

    const headerPosition = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('[data-app-chrome="header"] .app-shell > div')

      if (!header) {
        throw new Error('Missing standalone mobile header.')
      }

      const rect = header.getBoundingClientRect()

      return {
        bottom: rect.bottom,
        top: rect.top,
      }
    })

    expect(Math.abs(headerPosition.top - standaloneMetrics.headerTop)).toBeLessThanOrEqual(1)
    expect(Math.abs(headerPosition.bottom - standaloneMetrics.headerBottom)).toBeLessThanOrEqual(1)
  })

  test('resets the shared scroll region on authenticated route changes', async ({ page }) => {
    await loginAsVerificationUser(page)
    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve())
      })
    }))

    const scrollRegion = page.locator('[data-app-scroll-region="true"]')
    await scrollRegion.evaluate((element) => element.scrollTo(0, Math.min(600, element.scrollHeight - element.clientHeight)))
    await expect.poll(async () => (
      scrollRegion.evaluate((element) => element.scrollTop)
    )).toBeGreaterThan(0)

    await page.getByRole('navigation', { name: 'App tabs' }).getByRole('link', { name: 'Analytics' }).click()
    await expect(page).toHaveURL(/\/analytics(?:\?.*)?$/)
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()

    await expect.poll(async () => (
      page.locator('[data-app-scroll-region="true"]').evaluate((element) => element.scrollTop)
    )).toBe(0)

    const headerBottom = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('[data-app-chrome="header"] .app-shell > div')

      if (!header) {
        throw new Error('Missing mobile header after route change.')
      }

      return header.getBoundingClientRect().bottom
    })

    expect(headerBottom).toBeGreaterThan(0)
  })
})
