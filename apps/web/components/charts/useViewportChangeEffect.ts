'use client'

import { useEffect, useEffectEvent } from 'react'

const SCROLL_LISTENER_OPTIONS = { capture: true, passive: true } as const
const PASSIVE_LISTENER_OPTIONS = { capture: false, passive: true } as const

export function useViewportChangeEffect(enabled: boolean, onViewportChange: () => void) {
  const handleViewportChange = useEffectEvent(onViewportChange)

  useEffect(() => {
    if (!enabled) {
      return
    }

    let frameId: number | null = null

    const scheduleViewportChange = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null
        handleViewportChange()
      })
    }

    const visualViewport = window.visualViewport
    const scrollTargets: Array<Document | Element | Window> = [window, document]

    if (document.body) {
      scrollTargets.push(document.body)
    }

    if (document.documentElement) {
      scrollTargets.push(document.documentElement)
    }

    if (document.scrollingElement) {
      scrollTargets.push(document.scrollingElement)
    }

    const uniqueScrollTargets = Array.from(new Set(scrollTargets))

    window.addEventListener('resize', scheduleViewportChange)
    for (const target of uniqueScrollTargets) {
      target.addEventListener('scroll', scheduleViewportChange, SCROLL_LISTENER_OPTIONS)
    }
    visualViewport?.addEventListener('resize', scheduleViewportChange, PASSIVE_LISTENER_OPTIONS)
    visualViewport?.addEventListener('scroll', scheduleViewportChange, PASSIVE_LISTENER_OPTIONS)

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }

      window.removeEventListener('resize', scheduleViewportChange)
      for (const target of uniqueScrollTargets) {
        target.removeEventListener('scroll', scheduleViewportChange, SCROLL_LISTENER_OPTIONS)
      }
      visualViewport?.removeEventListener('resize', scheduleViewportChange, PASSIVE_LISTENER_OPTIONS)
      visualViewport?.removeEventListener('scroll', scheduleViewportChange, PASSIVE_LISTENER_OPTIONS)
    }
  }, [enabled])
}
