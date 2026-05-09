import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import RootLayout from './layout'

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => undefined),
  })),
}))

vi.mock('next/font/google', () => ({
  Geist_Mono: () => ({ variable: 'font-geist-mono' }),
  Manrope: () => ({ variable: 'font-manrope' }),
}))

vi.mock('@vercel/analytics/next', () => ({
  Analytics: () => null,
}))

vi.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => null,
}))

vi.mock('./providers', () => ({
  Providers: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/layout/DeferredClientChrome', () => ({
  DeferredClientChrome: () => null,
}))

describe('RootLayout', () => {
  it('renders the standalone boot splash inside a dedicated centering frame', async () => {
    const markup = renderToStaticMarkup(await RootLayout({ children: <div>App content</div> }))

    expect(markup).toContain('id="plateiq-pwa-boot-splash"')
    expect(markup).toContain('class="plateiq-pwa-boot-frame"')
    expect(markup).toContain('class="plateiq-pwa-boot-card"')
  })
})