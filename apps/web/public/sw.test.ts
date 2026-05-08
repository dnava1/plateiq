import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const serviceWorkerSource = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8')

describe('service worker cache safety', () => {
  it('bypasses authenticated app and API paths before generic asset caching', () => {
    expect(serviceWorkerSource).toContain('const API_PATH_PREFIXES = [')
    expect(serviceWorkerSource).toContain('const AUTHENTICATED_ROUTE_PREFIXES = [')
    expect(serviceWorkerSource).toContain("'/api/'")
    expect(serviceWorkerSource).toContain("'/dashboard'")
    expect(serviceWorkerSource).toContain("'/analytics'")
    expect(serviceWorkerSource).toContain('if (API_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)))')
    expect(serviceWorkerSource).toContain('if (isAuthenticatedNavigation(url)) {')
    expect(serviceWorkerSource).toContain('const launchUrl = new URL(LAUNCH_URL, self.location.origin);')
    expect(serviceWorkerSource).toContain('return Response.redirect(launchUrl.toString(), 302);')
  })

  it('does not add authenticated documents to the public precache list', () => {
    const precacheBlock = serviceWorkerSource.slice(
      serviceWorkerSource.indexOf('const PRECACHE_URLS = ['),
      serviceWorkerSource.indexOf('];', serviceWorkerSource.indexOf('const PRECACHE_URLS = [')),
    )

    expect(precacheBlock).not.toContain("'/dashboard'")
    expect(precacheBlock).not.toContain("'/analytics'")
    expect(precacheBlock).not.toContain("'/workouts'")
    expect(precacheBlock).not.toContain("'/programs'")
    expect(precacheBlock).not.toContain("'/settings'")
  })
})
