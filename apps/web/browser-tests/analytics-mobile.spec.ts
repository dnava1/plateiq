import { expect, test, type Page } from '@playwright/test'
import { loginAsVerificationUser } from './helpers/auth'

interface AnalyticsRequestBody {
  p_date_from?: string
  p_date_to?: string
}

const CONSISTENCY_SESSIONS = [
  { date: '2026-01-12', totalSessions: 1 },
  { date: '2026-01-26', totalSessions: 2 },
  { date: '2026-02-09', totalSessions: 1 },
  { date: '2026-02-23', totalSessions: 2 },
  { date: '2026-03-02', totalSessions: 1 },
  { date: '2026-03-16', totalSessions: 3 },
  { date: '2026-03-30', totalSessions: 2 },
  { date: '2026-04-06', totalSessions: 1 },
  { date: '2026-04-20', totalSessions: 2 },
] as const

function parseIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function formatIsoDate(value: Date) {
  const year = value.getUTCFullYear()
  const month = String(value.getUTCMonth() + 1).padStart(2, '0')
  const day = String(value.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfWeek(value: string) {
  const date = parseIsoDate(value)
  const day = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - day)
  return formatIsoDate(date)
}

function buildAnalyticsPayload(body: AnalyticsRequestBody) {
  const dateFrom = body.p_date_from ?? '2025-10-22'
  const dateTo = body.p_date_to ?? '2026-04-23'
  const filteredTrend = CONSISTENCY_SESSIONS
    .filter((entry) => entry.date >= dateFrom && entry.date <= dateTo)
    .map((entry) => ({
      total_sessions: entry.totalSessions,
      week_start: startOfWeek(entry.date),
    }))

  return {
    bodyweight_lane: {
      relevant: false,
      exercise_summaries: [],
      rep_trend: [],
      weekly_volume_trend: [],
    },
    consistency: {
      total_sessions: filteredTrend.reduce((total, entry) => total + entry.total_sessions, 0),
      weeks_active: filteredTrend.length,
      first_session: filteredTrend[0]?.week_start ?? null,
      last_session: filteredTrend.at(-1)?.week_start ?? null,
    },
    consistency_trend: filteredTrend,
    e1rm_trend: [],
    muscle_balance: [],
    pr_history: [],
    stall_detection: [],
    tm_progression: [],
    volume_trend: [],
  }
}

async function waitForAnalyticsResponse(page: Page) {
  return page.waitForResponse(
    (response) => response.url().includes('/rest/v1/rpc/get_analytics_data') && response.request().method() === 'POST',
  )
}

async function selectDateRange(page: Page, label: string) {
  await page.locator('#analytics-range').click()

  const popup = page.locator('[data-slot="select-content"][data-open]').last()
  await expect(popup).toBeVisible()
  await popup.getByText(label, { exact: true }).click()
}

test.describe('analytics mobile layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await loginAsVerificationUser(page)
  })

  test('keeps analytics usable on an iPhone-sized viewport and updates the consistency chart with the date range', async ({ page }) => {
    await page.route('**/rest/v1/rpc/get_analytics_data', async (route) => {
      const body = route.request().postDataJSON() as AnalyticsRequestBody

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildAnalyticsPayload(body)),
      })
    })

    await page.goto('/analytics')
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()
    await expect(page.locator('#analytics-range')).toContainText(/6m|Last 6 months/)

    await expect.poll(async () => (
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
    )).toBeTruthy()

    const tabList = page.locator('[data-slot="tabs-list"]').first()
    await expect(tabList).toBeVisible()
    expect(await tabList.evaluate((element) => element.getBoundingClientRect().right <= window.innerWidth + 1)).toBe(true)

    const consistencyCard = page.locator('[data-slot="card"]').filter({
      has: page.getByText('Consistency Pulse', { exact: true }),
    }).first()
    await expect(consistencyCard).toBeVisible()

    const chartScroller = consistencyCard.locator('div[tabindex="0"]').first()
    await expect(chartScroller).toBeVisible()
    expect(await chartScroller.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)

    const initialCellCount = await consistencyCard.locator('[aria-label^="Week of "]').count()
    expect(initialCellCount).toBeGreaterThan(8)

    const analyticsResponsePromise = waitForAnalyticsResponse(page)
    await selectDateRange(page, 'Last month')
    await analyticsResponsePromise

    await expect(page.locator('#analytics-range')).toContainText('Last month')

    const updatedCellCount = await consistencyCard.locator('[aria-label^="Week of "]').count()
    expect(updatedCellCount).toBeLessThan(initialCellCount)

    await expect.poll(async () => (
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
    )).toBeTruthy()
  })
})
