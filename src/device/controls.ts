// Binds the on-screen wheel, the keyboard and the mouse wheel to one stream of inputs.

import { settings } from '../os/settings.ts'
import { click, unlockAudio } from './feedback.ts'
import { type Button, HOLD_MS, type Input, TICK, WheelGesture } from './wheel.ts'

/** Held arrow keys turn the wheel at this speed, in radians per second. */
const KEY_TURN_SPEED = 4.5
/** Smooth (trackpad) scrolling distance in CSS pixels that equals one detent. */
const SCROLL_PER_TICK = 40
/** A single scroll event at least this large is a mouse notch: exactly one detent. */
const NOTCH = 50

const KEYS: Record<string, Button> = {
  Enter: 'select',
  ' ': 'play',
  Escape: 'menu',
  Backspace: 'menu',
  ',': 'prev',
  '.': 'next',
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
      if (input.type === 'press') click('press')
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

  // Tapping the wheel toggles this hidden switch; on iOS that plays the system haptic.
  const haptic = wheel.querySelector('.haptic') as HTMLInputElement | null
  haptic?.addEventListener('click', (e) => e.stopPropagation())
  haptic?.addEventListener('focus', () => haptic.blur())
  settings.watch((s) => {
    if (haptic) haptic.disabled = !s.haptics
  })

  wheel.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
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

  // Mouse wheel and trackpad: scrolling anywhere turns the wheel. A mouse notch is one
  // detent; smooth trackpad scrolling accumulates.
  let scrolled = 0
  window.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey) return
      e.preventDefault()
      const px = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1)
      if (!px) return
      emit({
        type: 'turn',
        delta: (Math.sign(px) * Math.min(Math.abs(px), 120) * TICK) / SCROLL_PER_TICK,
      })
      if (Math.abs(px) >= NOTCH) {
        scrolled = 0
        emit({ type: 'tick', dir: Math.sign(px) as 1 | -1 })
        return
      }
      scrolled += px
      let count = 0
      while (Math.abs(scrolled) >= SCROLL_PER_TICK && count < 3) {
        const dir = Math.sign(scrolled) as 1 | -1
        scrolled -= dir * SCROLL_PER_TICK
        count += 1
        emit({ type: 'tick', dir })
      }
    },
    { passive: false },
  )

  // Safari pinch gestures, which touch-action alone does not always stop.
  document.addEventListener('gesturestart', (e) => e.preventDefault())
}
