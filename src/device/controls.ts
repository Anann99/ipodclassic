// Binds the on-screen wheel, the keyboard and the mouse wheel to one stream of inputs.

import { settings } from '../os/settings.ts'
import { click, unlockAudio } from './feedback.ts'
import { type Button, type Input, TICK, WheelGesture } from './wheel.ts'

/** Held arrow keys turn the wheel from the slow speed up to the fast one, in radians per second. */
const KEY_TURN_SLOW = 3
const KEY_TURN_FAST = 7
const KEY_TURN_RAMP_MS = 250
/** Smooth (trackpad) scrolling distance in CSS pixels that equals one detent. */
const SCROLL_PER_TICK = 40
/** The first scroll event of a burst at least this large is a mouse notch: one detent. */
const NOTCH = 50
const BURST_GAP_MS = 80
/** A tapped button stays lit at least this long, so the press can be seen. */
const PRESS_VISIBLE_MS = 110

const KEYS: Record<string, Button> = {
  Enter: 'select',
  NumpadEnter: 'select',
  Space: 'play',
  Escape: 'menu',
  Backspace: 'menu',
  Comma: 'prev',
  Period: 'next',
}

const ARROWS: Record<string, 1 | -1> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }

export function bindControls(wheel: HTMLElement, emit: (input: Input) => void): void {
  const gesture = new WheelGesture()
  const lit = new Map<Button, number>()
  const unlight = new Map<Button, number>()

  const show = (button: Button, on: boolean) => {
    const key = wheel.querySelector(`[data-button="${button}"]`)
    clearTimeout(unlight.get(button))
    if (on) {
      lit.set(button, performance.now())
      key?.classList.add('pressed')
      return
    }
    const wait = PRESS_VISIBLE_MS - (performance.now() - (lit.get(button) ?? 0))
    unlight.set(
      button,
      window.setTimeout(() => key?.classList.remove('pressed'), Math.max(0, wait)),
    )
  }

  const send = (inputs: Input[]) => {
    for (const input of inputs) {
      if (input.type === 'press' || input.type === 'release')
        show(input.button, input.type === 'press')
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
    if (gesture.active) wheel.setPointerCapture(e.pointerId)
    send(inputs)
  })
  wheel.addEventListener('pointermove', (e) => send(gesture.move(e.pointerId, ...local(e))))
  wheel.addEventListener('pointerup', (e) => send(gesture.up(e.pointerId, e.timeStamp)))
  wheel.addEventListener('pointercancel', (e) => send(gesture.cancel(e.pointerId)))
  wheel.addEventListener('lostpointercapture', (e) => send(gesture.cancel(e.pointerId)))
  wheel.addEventListener('contextmenu', (e) => e.preventDefault())

  // Keyboard: arrows turn, Enter selects, Space is play, Escape and Backspace are Menu.
  // Keys are tracked by physical key, so Shift or a lost focus cannot leave one stuck.
  const turning = new Map<string, { dir: 1 | -1; since: number }>()
  const held = new Map<string, Button>()
  let lastFrame = 0
  const spin = (now: number) => {
    if (turning.size === 0) return
    const dt = Math.max(0, Math.min(0.05, (now - lastFrame) / 1000))
    lastFrame = now
    let delta = 0
    for (const { dir, since } of turning.values()) {
      const ramp = Math.min(1, (now - since) / KEY_TURN_RAMP_MS)
      delta += dir * (KEY_TURN_SLOW + (KEY_TURN_FAST - KEY_TURN_SLOW) * ramp) * dt
    }
    if (delta) emit({ type: 'turn', delta })
    requestAnimationFrame(spin)
  }
  const releaseAll = () => {
    turning.clear()
    for (const button of held.values()) send([{ type: 'release', button }])
    held.clear()
  }

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const dir = ARROWS[e.code]
    if (dir) {
      e.preventDefault()
      emit({ type: 'tick', dir })
      if (!turning.has(e.code)) {
        turning.set(e.code, { dir, since: performance.now() })
        if (turning.size === 1) {
          lastFrame = performance.now()
          requestAnimationFrame(spin)
        }
      }
      return
    }
    const button = KEYS[e.code]
    if (!button) return
    e.preventDefault()
    if (e.repeat || held.has(e.code)) return
    held.set(e.code, button)
    send([{ type: 'press', button }])
  })
  window.addEventListener('keyup', (e) => {
    turning.delete(e.code)
    const button = held.get(e.code)
    if (!button) return
    held.delete(e.code)
    send([{ type: 'release', button }])
  })
  window.addEventListener('blur', releaseAll)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) releaseAll()
  })

  // Mouse wheel and trackpad: scrolling anywhere turns the wheel. A mouse notch is one
  // detent; smooth trackpad scrolling accumulates, keeping its remainder.
  let scrolled = 0
  let lastScroll = 0
  /** Whether the current burst of scroll events came from a notched mouse wheel. */
  let notched = false
  window.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey) return
      e.preventDefault()
      const lines = e.deltaMode !== 0
      const px = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1)
      // A burst is classified by its first event: a big first step means a notched wheel,
      // and then every event in the burst is exactly one detent.
      if (e.timeStamp - lastScroll > BURST_GAP_MS) notched = lines || Math.abs(px) >= NOTCH
      lastScroll = e.timeStamp
      if (!px) return
      const dir = Math.sign(px) as 1 | -1
      if (notched) {
        scrolled = 0
        emit({ type: 'turn', delta: dir * TICK })
        emit({ type: 'tick', dir })
        return
      }
      emit({
        type: 'turn',
        delta: (Math.sign(px) * Math.min(Math.abs(px), 120) * TICK) / SCROLL_PER_TICK,
      })
      scrolled += px
      for (let count = 0; Math.abs(scrolled) >= SCROLL_PER_TICK && count < 3; count++) {
        const d = Math.sign(scrolled) as 1 | -1
        scrolled -= d * SCROLL_PER_TICK
        emit({ type: 'tick', dir: d })
      }
      scrolled = Math.max(-SCROLL_PER_TICK, Math.min(SCROLL_PER_TICK, scrolled))
    },
    { passive: false },
  )

  // Safari pinch gestures, which touch-action alone does not always stop.
  document.addEventListener('gesturestart', (e) => e.preventDefault())
}
