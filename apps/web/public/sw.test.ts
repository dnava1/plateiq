import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const serviceWorkerSource = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8')

describe('service worker cache safety', () => {
  it('routes same-origin non-public navigations through the cached launch shell fallback', () => {
    expect(serviceWorkerSource).toContain('const API_PATH_PREFIXES = [')
    expect(serviceWorkerSource).not.toContain('const AUTHENTICATED_ROUTE_PREFIXES = [')
    expect(serviceWorkerSource).toContain("'/api/'")
    expect(serviceWorkerSource).toContain('if (API_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)))')
    expect(serviceWorkerSource).toContain('const publicDocumentPath = getPublicDocumentPath(url.pathname);')
    expect(serviceWorkerSource).toContain('event.respondWith(handlePublicNavigation(request, publicDocumentPath));')
    expect(serviceWorkerSource).toContain('event.respondWith(handleNonPublicNavigation(request));')
    expect(serviceWorkerSource).toContain('return serveCachedLaunchShell();')
    expect(serviceWorkerSource).toContain('const cachedLaunchResponse = await cache.match(LAUNCH_URL);')
    expect(serviceWorkerSource).not.toContain('Response.redirect(')
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
