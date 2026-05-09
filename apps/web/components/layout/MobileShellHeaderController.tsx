'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const SCROLL_LISTENER_OPTIONS: AddEventListenerOptions = { capture: false, passive: true }
const SCROLL_LISTENER_CLEANUP_OPTIONS: EventListenerOptions = { capture: false }

export function MobileShellHeaderController() {
  const pathname = usePathname()

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('[data-authenticated-shell="true"]')
    const headerSlot = shell?.querySelector<HTMLElement>('[data-app-header-slot="true"]')
    const scrollRegion = shell?.querySelector<HTMLElement>('[data-app-scroll-region="true"]')

    if (!shell || !headerSlot || !scrollRegion) {
      return
    }

    let frameId = 0
    let headerPullOffset = -1

    const updateHeaderPullOffset = () => {
      const nextHeaderPullOffset = Math.max(0, -scrollRegion.scrollTop)

      if (nextHeaderPullOffset === headerPullOffset) {
        return
      }

      headerPullOffset = nextHeaderPullOffset
      shell.style.setProperty('--authenticated-header-pull-offset', `${nextHeaderPullOffset}px`)
    }

    const requestOffsetUpdate = () => {
      if (frameId !== 0) {
        return
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        updateHeaderPullOffset()
      })
    }

    updateHeaderPullOffset()
    scrollRegion.addEventListener('scroll', requestOffsetUpdate, SCROLL_LISTENER_OPTIONS)

    return () => {
      scrollRegion.removeEventListener('scroll', requestOffsetUpdate, SCROLL_LISTENER_CLEANUP_OPTIONS)
      shell.style.setProperty('--authenticated-header-pull-offset', '0px')

      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [pathname])

  return null
}
