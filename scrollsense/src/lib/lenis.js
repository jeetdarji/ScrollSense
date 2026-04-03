import Lenis from '@studio-freight/lenis'

let lenisInstance = null

export function initLenis() {
  lenisInstance = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  })

  function raf(time) {
    if (!lenisInstance) return
    lenisInstance.raf(time)
    lenisInstance._rafId = requestAnimationFrame(raf)
  }
  let rafId = requestAnimationFrame(raf)
  lenisInstance._rafId = rafId

  return lenisInstance
}

export function destroyLenis() {
  if (lenisInstance) {
    if (lenisInstance._rafId) {
      cancelAnimationFrame(lenisInstance._rafId)
    }
    lenisInstance.destroy()
    lenisInstance = null
  }
}

export function getLenis() {
  return lenisInstance
}