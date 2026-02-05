type ScheduleOptions = {
  withViewportGuard?: boolean
  guardMs?: number
}

const getScrollTargets = () => {
  if (typeof document === 'undefined') return []

  const elements = [
    document.scrollingElement,
    document.documentElement,
    document.body,
    document.getElementById('root'),
  ]

  return Array.from(new Set(elements.filter((element): element is Element => Boolean(element))))
}

const isIosDevice = () => {
  if (typeof window === 'undefined') return false
  const { userAgent } = window.navigator
  return /iP(hone|od|ad)/.test(userAgent)
    || (userAgent.includes('Mac') && 'ontouchend' in document)
}

export const scrollToTop = () => {
  if (typeof window === 'undefined') return
  const targets = getScrollTargets()

  targets.forEach((target) => {
    if ('scrollTop' in target) {
      target.scrollTop = 0
    }
    if ('scrollLeft' in target) {
      target.scrollLeft = 0
    }
    if ('scrollTo' in target && typeof target.scrollTo === 'function') {
      target.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  })

  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
}

export const scheduleScrollToTop = (options: ScheduleOptions = {}) => {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const timeouts: number[] = []
  const rafs: number[] = []
  const fire = () => scrollToTop()

  fire()
  rafs.push(window.requestAnimationFrame(fire))

  ;[100, 350, 600, 900, 1200, 1600, 2200, 3000, 4000].forEach((delay) => {
    timeouts.push(window.setTimeout(fire, delay))
  })

  const cleanup = () => {
    rafs.forEach((id) => window.cancelAnimationFrame(id))
    timeouts.forEach((id) => window.clearTimeout(id))
  }

  if (!options.withViewportGuard) {
    return cleanup
  }

  const viewport = window.visualViewport
  if (!isIosDevice() || !viewport) {
    return cleanup
  }

  const handleViewportChange = () => fire()
  viewport.addEventListener('resize', handleViewportChange)
  viewport.addEventListener('scroll', handleViewportChange)
  window.addEventListener('scroll', handleViewportChange, { passive: true })
  window.addEventListener('orientationchange', handleViewportChange)

  const guardMs = options.guardMs ?? 2000
  const guardTimeout = window.setTimeout(() => {
    viewport.removeEventListener('resize', handleViewportChange)
    viewport.removeEventListener('scroll', handleViewportChange)
    window.removeEventListener('scroll', handleViewportChange)
    window.removeEventListener('orientationchange', handleViewportChange)
  }, guardMs)

  return () => {
    cleanup()
    window.clearTimeout(guardTimeout)
    viewport.removeEventListener('resize', handleViewportChange)
    viewport.removeEventListener('scroll', handleViewportChange)
    window.removeEventListener('scroll', handleViewportChange)
    window.removeEventListener('orientationchange', handleViewportChange)
  }
}
