'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function MobileShellHeaderController() {
  const pathname = usePathname()

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('[data-authenticated-shell="true"]')
    const header = shell?.querySelector<HTMLElement>('[data-app-chrome="header"]')
    const scrollRegion = shell?.querySelector<HTMLElement>('[data-app-scroll-region="true"]')

    if (!shell || !header || !scrollRegion) {
      return
    }

    let frameId = 0
    let headerHeight = 0

    const updateHeaderHeight = () => {
      headerHeight = header.offsetHeight
      shell.style.setProperty('--authenticated-header-height', `${headerHeight}px`)
    }

    const updateHeaderOffset = () => {
      const headerOffset = Math.max(0, Math.min(scrollRegion.scrollTop, headerHeight))
      shell.style.setProperty('--authenticated-header-offset', `${headerOffset}px`)
    }

    const requestOffsetUpdate = () => {
      if (frameId !== 0) {
        return
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        updateHeaderOffset()
      })
    }

    updateHeaderHeight()
    updateHeaderOffset()

    const resizeObserver = new ResizeObserver(() => {
      updateHeaderHeight()
      requestOffsetUpdate()
    })

    resizeObserver.observe(header)
    scrollRegion.addEventListener('scroll', requestOffsetUpdate, { passive: true })

    return () => {
      resizeObserver.disconnect()
      scrollRegion.removeEventListener('scroll', requestOffsetUpdate)

      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [pathname])

  return null
}