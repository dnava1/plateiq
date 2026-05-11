import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const serviceWorkerSource = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8')

describe('service worker cache safety', () => {
  it('routes same-origin non-public navigations back through the launch shell with explicit next-path intent', () => {
    expect(serviceWorkerSource).toContain('const API_PATH_PREFIXES = [')
    expect(serviceWorkerSource).not.toContain('const AUTHENTICATED_ROUTE_PREFIXES = [')
    expect(serviceWorkerSource).toContain("'/api/'")
    expect(serviceWorkerSource).toContain('if (API_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)))')
    expect(serviceWorkerSource).toContain('const publicDocumentPath = getPublicDocumentPath(url.pathname);')
    expect(serviceWorkerSource).toContain('event.respondWith(handlePublicNavigation(request, publicDocumentPath));')
    expect(serviceWorkerSource).toContain('event.respondWith(handleNonPublicNavigation(request));')
    expect(serviceWorkerSource).toContain('return Response.redirect(buildOfflineLaunchUrl(requestUrl).toString(), 302);')
    expect(serviceWorkerSource).toContain('function buildOfflineLaunchUrl(requestUrl) {')
    expect(serviceWorkerSource).toContain("launchUrl.searchParams.set('next', `${requestUrl.pathname}${requestUrl.search}`);")
    expect(serviceWorkerSource).toContain('Response.redirect(')
  })

  it('supports an explicit offline launch prepare handshake for eager bootstrap readiness', () => {
    expect(serviceWorkerSource).toContain("event.data && event.data.type === 'PREPARE_OFFLINE_LAUNCH'")
    expect(serviceWorkerSource).toContain("type: 'OFFLINE_LAUNCH_READY'")
    expect(serviceWorkerSource).toContain("type: 'OFFLINE_LAUNCH_ERROR'")
    expect(serviceWorkerSource).toContain('function respondToMessage(event, payload) {')
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
