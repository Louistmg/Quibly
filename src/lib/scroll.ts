type ScheduleOptions = {
  withViewportGuard?: boolean
  guardMs?: number
}

const isIosDevice = () => {
  if (typeof window === 'undefined') return false
  const { userAgent } = window.navigator
  return /iP(hone|od|ad)/.test(userAgent)
    || (userAgent.includes('Mac') && 'ontouchend' in document)
}

export const scrollToTop = () => {
  if (typeof window === 'undefined') return
  const scrollElement = document.scrollingElement || document.documentElement || document.body
  scrollElement.scrollTop = 0
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
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

  ;[100, 350, 900, 1600].forEach((delay) => {
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
  window.addEventListener('orientationchange', handleViewportChange)

  const guardMs = options.guardMs ?? 2000
  const guardTimeout = window.setTimeout(() => {
    viewport.removeEventListener('resize', handleViewportChange)
    viewport.removeEventListener('scroll', handleViewportChange)
    window.removeEventListener('orientationchange', handleViewportChange)
  }, guardMs)

  return () => {
    cleanup()
    window.clearTimeout(guardTimeout)
    viewport.removeEventListener('resize', handleViewportChange)
    viewport.removeEventListener('scroll', handleViewportChange)
    window.removeEventListener('orientationchange', handleViewportChange)
  }
}
