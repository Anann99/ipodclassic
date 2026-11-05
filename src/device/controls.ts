// Binds the on-screen wheel, the keyboard and the mouse wheel to one stream of inputs.

import { click, unlockAudio } from './feedback.ts'
import { type Button, HOLD_MS, type Input, TICK, WheelGesture } from './wheel.ts'

/** Held arrow keys turn the wheel at this speed, in radians per second. */
const KEY_TURN_SPEED = 4.5
/** Scroll distance in CSS pixels that equals one detent. */
const SCROLL_PER_TICK = 50

const KEYS: Record<string, Button> = {
  Enter: 'select',
  ' ': 'select',
  Escape: 'menu',
  Backspace: 'menu',
  p: 'play',
  '[': 'prev',
  ']': 'next',
}

export function bindControls(wheel: HTMLElement, emit: (input: Input) => void): void {
  const gesture = new WheelGesture()
  const holdTimers = new Map<number, number>()

  const send = (inputs: Input[]) => {
    for (const input of inputs) {
      if (input.type === 'press' || input.type === 'release') {
        wheel
          .querySelector(`[data-button="${input.button}"]`)
          ?.classList.toggle('pressed', input.type === 'press')
      }
      if (input.type === 'press') click()
      emit(input)
    }
  }

  const local = (e: PointerEvent) => {
    const rect = wheel.getBoundingClientRect()
    const radius = rect.width / 2
    return [
      (e.clientX - rect.left - radius) / radius,
      (e.clientY - rect.top - radius) / radius,
    ] as const
  }

  const end = (e: PointerEvent, cancelled: boolean) => {
    clearTimeout(holdTimers.get(e.pointerId))
    holdTimers.delete(e.pointerId)
    send(cancelled ? gesture.cancel(e.pointerId) : gesture.up(e.pointerId))
  }

  wheel.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    unlockAudio()
    const inputs = gesture.down(e.pointerId, ...local(e), e.timeStamp)
    if (!gesture.active) return
    wheel.setPointerCapture(e.pointerId)
    holdTimers.set(
      e.pointerId,
      window.setTimeout(() => send(gesture.poll(performance.now())), HOLD_MS),
    )
    send(inputs)
  })
  wheel.addEventListener('pointermove', (e) => send(gesture.move(e.pointerId, ...local(e))))
  wheel.addEventListener('pointerup', (e) => end(e, false))
  wheel.addEventListener('pointercancel', (e) => end(e, true))
  wheel.addEventListener('lostpointercapture', (e) => end(e, true))
  wheel.addEventListener('contextmenu', (e) => e.preventDefault())

  // Keyboard: arrows turn, Enter/Space select, Escape/Backspace go back.
  const turning = new Map<string, 1 | -1>()
  let lastFrame = 0
  const spin = (now: number) => {
    if (turning.size === 0) return
    const dt = Math.min(0.05, (now - lastFrame) / 1000)
    lastFrame = now
    let dir = 0
    for (const d of turning.values()) dir += d
    if (dir) emit({ type: 'turn', delta: dir * KEY_TURN_SPEED * dt })
    requestAnimationFrame(spin)
  }

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    unlockAudio()
    const dir = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key] as
      | 1
      | -1
      | undefined
    if (dir) {
      e.preventDefault()
      emit({ type: 'tick', dir })
      if (!turning.has(e.key)) {
        turning.set(e.key, dir)
        if (turning.size === 1) {
          lastFrame = performance.now()
          requestAnimationFrame(spin)
        }
      }
      return
    }
    const button = KEYS[e.key]
    if (!button) return
    e.preventDefault()
    if (!e.repeat) send([{ type: 'press', button }])
  })
  window.addEventListener('keyup', (e) => {
    turning.delete(e.key)
    const button = KEYS[e.key]
    if (button) send([{ type: 'release', button }])
  })
  window.addEventListener('blur', () => turning.clear())

  // Mouse wheel and trackpad: scrolling anywhere turns the wheel.
  let scrolled = 0
  window.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault()
      const px = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1)
      emit({ type: 'turn', delta: (px / SCROLL_PER_TICK) * TICK })
      scrolled += px
      while (Math.abs(scrolled) >= SCROLL_PER_TICK) {
        const dir = Math.sign(scrolled) as 1 | -1
        scrolled -= dir * SCROLL_PER_TICK
        emit({ type: 'tick', dir })
      }
    },
    { passive: false },
  )
}
