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
export const SCROLL_SLOP = (6 * Math.PI) / 180
/** Backward travel that counts as a reversal; smaller wobbles do not undo progress. */
const REVERSAL = (2 * Math.PI) / 180
/** Ring buttons fire on a tap: lifted within this time, without scrolling. A thumb resting
 * on the ring (to steer a paddle, or before turning) never presses anything. */
export const TAP_MS = 500
/** Past this, a touch that turned at all is steering (a paddle nudge), not a tap. */
const STEER_MS = 200
/** Center button radius as a fraction of the wheel radius. */
export const CENTER_RADIUS = 0.38
/** Angles are unreliable this close to the middle, so tracking pauses there. */
const MIN_ANGLE_RADIUS = 0.25
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
      /** Last angle, or NaN while the finger is in the dead zone. */
      angle: number
      travel: number
      ticks: number
      /** Direction of travel, and backward travel since it last changed. */
      dir: 0 | 1 | -1
      back: number
      scrolling: boolean
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
  /** Fingers on the center button; it presses on the first and releases on the last. */
  private centers = 0

  down(id: number, x: number, y: number, time: number): Input[] {
    const r = Math.hypot(x, y)
    if (r > OUTER_RADIUS || this.pointers.has(id)) return []
    if (r <= CENTER_RADIUS) {
      this.pointers.set(id, { zone: 'center' })
      this.centers += 1
      return this.centers === 1 ? [{ type: 'press', button: 'select' }] : []
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
      dir: 0,
      back: 0,
      scrolling: false,
    })
    return []
  }

  move(id: number, x: number, y: number): Input[] {
    const p = this.pointers.get(id)
    if (p?.zone !== 'ring') return []
    if (Math.hypot(x, y) < MIN_ANGLE_RADIUS) {
      p.angle = Number.NaN
      return []
    }
    const angle = Math.atan2(y, x)
    if (Number.isNaN(p.angle)) {
      p.angle = angle
      return []
    }
    const delta = angleDelta(p.angle, angle)
    p.angle = angle
    if (delta === 0) return []
    const out: Input[] = [{ type: 'turn', delta }]
    p.travel += delta
    if (!p.scrolling && Math.abs(p.travel) >= SCROLL_SLOP) p.scrolling = true
    p.ticks += delta
    // On a real reversal, drop the leftover forward progress so the first tick back
    // lands one detent from the turning point.
    const dir = delta > 0 ? 1 : -1
    if (dir === p.dir) p.back = 0
    else {
      p.back += Math.abs(delta)
      if (p.dir === 0 || p.back >= REVERSAL) {
        if (p.dir !== 0) p.ticks = dir * p.back
        p.dir = dir
        p.back = 0
      }
    }
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

  up(id: number, time: number): Input[] {
    const p = this.pointers.get(id)
    if (!p) return []
    this.pointers.delete(id)
    if (p.zone === 'center') return this.releaseCenter()
    this.ringOwner = null
    // A tap is quick and still. A slower touch that turned even a little was steering.
    const held = time - p.start
    if (p.scrolling || held > TAP_MS || (held > STEER_MS && Math.abs(p.travel) >= REVERSAL)) {
      return []
    }
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
    if (p.zone === 'center') return this.releaseCenter()
    this.ringOwner = null
    return []
  }

  private releaseCenter(): Input[] {
    this.centers -= 1
    return this.centers === 0 ? [{ type: 'release', button: 'select' }] : []
  }

  get active(): boolean {
    return this.pointers.size > 0
  }
}
