// Crisp canvases at any size, and a fixed-step game loop.

/**
 * Creates a canvas drawn in logical pixels (the screen is 320x240) and backed by real device
 * pixels, so lines and text stay sharp however large the device is shown.
 */
export function canvas2d(parent: HTMLElement, width = 320, height = 240) {
  const canvas = document.createElement('canvas')
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  canvas.style.display = 'block'
  parent.append(canvas)
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  const resize = () => {
    const shown = canvas.getBoundingClientRect().width
    if (!shown) return
    const scale = (shown / width) * devicePixelRatio
    const w = Math.round(width * scale)
    const h = Math.round(height * scale)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  // Moving the window to a sharper display changes the pixel ratio but not the size.
  let density: MediaQueryList | undefined
  const watchDensity = () => {
    density?.removeEventListener('change', onDensity)
    density = matchMedia(`(resolution: ${devicePixelRatio}dppx)`)
    density.addEventListener('change', onDensity)
  }
  const onDensity = () => {
    // A canvas that left the page stops listening, so it can be collected.
    if (!canvas.isConnected) return density?.removeEventListener('change', onDensity)
    resize()
    watchDensity()
  }
  watchDensity()
  resize()
  return {
    canvas,
    ctx,
    width,
    height,
    dispose: () => {
      observer.disconnect()
      density?.removeEventListener('change', onDensity)
    },
  }
}

/**
 * Runs `update` at a fixed rate (so physics is deterministic) and `draw` once per frame.
 * Time does not pass while stopped.
 */
export function loop(update: (dt: number) => void, draw: (alpha: number) => void, hz = 120) {
  const step = 1 / hz
  let last = 0
  let pending = 0
  let frame = 0
  const tick = (now: number) => {
    pending += Math.min(0.1, (now - last) / 1000)
    last = now
    while (pending >= step) {
      update(step)
      pending -= step
    }
    draw(Math.min(1, Math.max(0, pending / step)))
    frame = requestAnimationFrame(tick)
  }
  return {
    start() {
      if (frame) return
      last = performance.now()
      frame = requestAnimationFrame(tick)
    },
    stop() {
      cancelAnimationFrame(frame)
      frame = 0
    },
    get running() {
      return frame !== 0
    },
  }
}
