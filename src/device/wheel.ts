// Click wheel gesture recognition, independent of the DOM.
// Coordinates are normalized: (0, 0) is the wheel center, distance 1 is the rim.
// Screen axes: +x right, +y down, so increasing atan2 angle is clockwise.

export type Button = 'menu' | 'next' | 'play' | 'prev' | 'select'

export type Input =
  /** Continuous rotation in radians since the last turn event. Positive is clockwise. */
  | { type: 'turn'; delta: number }
  /** One detent of rotation, for stepping through lists. */
  | { type: 'tick'; dir: 1 | -1 }
  | { type: 'press'; button: Button }
  | { type: 'release'; button: Button }

/** Detents per revolution. */
export const TICKS_PER_TURN = 24
export const TICK = (2 * Math.PI) / TICKS_PER_TURN
/** Rotation that turns a touch into a scroll, so it can no longer be a button tap. */
export const SCROLL_SLOP = TICK * 0.6
/** Ring buttons fire on release, or after being held this long without scrolling. */
export const HOLD_MS = 350
/** Center button radius as a fraction of the wheel radius. */
export const CENTER_RADIUS = 0.38
/** Angles are unreliable this close to the middle, so moves there are ignored. */
const MIN_ANGLE_RADIUS = 0.2
/** Touches starting beyond the rim are ignored. */
const OUTER_RADIUS = 1.06
/** Absorbs float drift so exact detent angles count. */
const EPSILON = 1e-9

type Pointer =
  | { zone: 'center' }
  | {
      zone: 'ring'
      button: Button
      start: number
      angle: number
      travel: number
      ticks: number
      scrolling: boolean
      held: boolean
    }

export function ringButton(x: number, y: number): Button {
  const a = Math.atan2(y, x)
  const q = Math.PI / 4
  if (a > -3 * q && a < -q) return 'menu'
  if (a >= -q && a <= q) return 'next'
  if (a > q && a < 3 * q) return 'play'
  return 'prev'
}

/** Smallest signed difference between two angles, in (-PI, PI]. */
export function angleDelta(from: number, to: number): number {
  let d = (to - from) % (2 * Math.PI)
  if (d > Math.PI) d -= 2 * Math.PI
  if (d <= -Math.PI) d += 2 * Math.PI
  return d
}

export class WheelGesture {
  private pointers = new Map<number, Pointer>()
  private ringOwner: number | null = null

  down(id: number, x: number, y: number, time: number): Input[] {
    const r = Math.hypot(x, y)
    if (r > OUTER_RADIUS || this.pointers.has(id)) return []
    if (r <= CENTER_RADIUS) {
      this.pointers.set(id, { zone: 'center' })
      return [{ type: 'press', button: 'select' }]
    }
    if (this.ringOwner !== null) return []
    this.ringOwner = id
    this.pointers.set(id, {
      zone: 'ring',
      button: ringButton(x, y),
      start: time,
      angle: Math.atan2(y, x),
      travel: 0,
      ticks: 0,
      scrolling: false,
      held: false,
    })
    return []
  }

  move(id: number, x: number, y: number): Input[] {
    const p = this.pointers.get(id)
    if (p?.zone !== 'ring' || Math.hypot(x, y) < MIN_ANGLE_RADIUS) return []
    const angle = Math.atan2(y, x)
    const delta = angleDelta(p.angle, angle)
    p.angle = angle
    if (delta === 0) return []
    const out: Input[] = [{ type: 'turn', delta }]
    p.travel += delta
    if (!p.scrolling && Math.abs(p.travel) >= SCROLL_SLOP) p.scrolling = true
    p.ticks += delta
    while (p.ticks >= TICK - EPSILON) {
      p.ticks -= TICK
      out.push({ type: 'tick', dir: 1 })
    }
    while (p.ticks <= -TICK + EPSILON) {
      p.ticks += TICK
      out.push({ type: 'tick', dir: -1 })
    }
    return out
  }

  /** Call periodically while a pointer is down so held ring buttons can fire. */
  poll(time: number): Input[] {
    const out: Input[] = []
    for (const p of this.pointers.values()) {
      if (p.zone === 'ring' && !p.scrolling && !p.held && time - p.start >= HOLD_MS) {
        p.held = true
        out.push({ type: 'press', button: p.button })
      }
    }
    return out
  }

  up(id: number): Input[] {
    const p = this.pointers.get(id)
    if (!p) return []
    this.pointers.delete(id)
    if (p.zone === 'center') return [{ type: 'release', button: 'select' }]
    this.ringOwner = null
    if (p.held) return [{ type: 'release', button: p.button }]
    if (p.scrolling) return []
    return [
      { type: 'press', button: p.button },
      { type: 'release', button: p.button },
    ]
  }

  /** The pointer was taken away (system gesture, lost capture): never treat it as a tap. */
  cancel(id: number): Input[] {
    const p = this.pointers.get(id)
    if (!p) return []
    this.pointers.delete(id)
    if (p.zone === 'center') return [{ type: 'release', button: 'select' }]
    this.ringOwner = null
    return p.held ? [{ type: 'release', button: p.button }] : []
  }

  get active(): boolean {
    return this.pointers.size > 0
  }
}
