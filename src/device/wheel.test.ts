import { describe, expect, it } from 'vitest'
import { angleDelta, HOLD_MS, type Input, ringButton, WheelGesture } from './wheel.ts'

const at = (deg: number, r = 0.75) => {
  const a = (deg * Math.PI) / 180
  return [Math.cos(a) * r, Math.sin(a) * r] as const
}

/** Drag a pointer along the ring from one angle to another in small steps. */
function drag(g: WheelGesture, from: number, to: number, step = 3): Input[] {
  const out: Input[] = []
  out.push(...g.down(1, ...at(from), 0))
  const dir = Math.sign(to - from)
  for (let d = from + dir * step; dir > 0 ? d <= to : d >= to; d += dir * step) {
    out.push(...g.move(1, ...at(d)))
  }
  out.push(...g.up(1))
  return out
}

const ticks = (events: Input[]) => events.reduce((n, e) => (e.type === 'tick' ? n + e.dir : n), 0)

describe('angleDelta', () => {
  it('takes the short way across the wrap', () => {
    expect(angleDelta(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2)
    expect(angleDelta(-Math.PI + 0.1, Math.PI - 0.1)).toBeCloseTo(-0.2)
  })
})

describe('ringButton', () => {
  it('maps quadrants to the classic layout', () => {
    expect(ringButton(...at(-90))).toBe('menu')
    expect(ringButton(...at(0))).toBe('next')
    expect(ringButton(...at(90))).toBe('play')
    expect(ringButton(...at(180))).toBe('prev')
  })
})

describe('WheelGesture', () => {
  it('emits one tick per detent, clockwise positive', () => {
    expect(ticks(drag(new WheelGesture(), 0, 90))).toBe(6)
    expect(ticks(drag(new WheelGesture(), 90, 0))).toBe(-6)
  })

  it('counts a full revolution across the angle wrap', () => {
    expect(ticks(drag(new WheelGesture(), 0, 360))).toBe(24)
  })

  it('reports continuous turn that sums to the rotation', () => {
    const turned = drag(new WheelGesture(), 10, 100).reduce(
      (s, e) => (e.type === 'turn' ? s + e.delta : s),
      0,
    )
    expect(turned).toBeCloseTo(Math.PI / 2)
  })

  it('treats a still touch on the ring as a button tap', () => {
    const g = new WheelGesture()
    const events = [...g.down(1, ...at(-90), 0), ...g.up(1)]
    expect(events).toEqual([
      { type: 'press', button: 'menu' },
      { type: 'release', button: 'menu' },
    ])
  })

  it('does not tap after scrolling', () => {
    const events = drag(new WheelGesture(), -90, -45)
    expect(events.some((e) => e.type === 'press')).toBe(false)
  })

  it('presses the center immediately and releases on lift', () => {
    const g = new WheelGesture()
    expect(g.down(1, 0, 0, 0)).toEqual([{ type: 'press', button: 'select' }])
    expect(g.up(1)).toEqual([{ type: 'release', button: 'select' }])
  })

  it('fires a held ring button before release', () => {
    const g = new WheelGesture()
    g.down(1, ...at(90), 0)
    expect(g.poll(HOLD_MS - 1)).toEqual([])
    expect(g.poll(HOLD_MS)).toEqual([{ type: 'press', button: 'play' }])
    expect(g.up(1)).toEqual([{ type: 'release', button: 'play' }])
  })

  it('lets a second finger press the center while the first scrolls', () => {
    const g = new WheelGesture()
    g.down(1, ...at(0), 0)
    g.move(1, ...at(20))
    expect(g.down(2, 0.05, 0, 10)).toEqual([{ type: 'press', button: 'select' }])
    expect(g.move(1, ...at(40)).some((e) => e.type === 'tick')).toBe(true)
  })

  it('ignores touches outside the wheel and a second ring finger', () => {
    const g = new WheelGesture()
    expect(g.down(1, 2, 0, 0)).toEqual([])
    g.down(2, ...at(0), 0)
    g.down(3, ...at(180), 0)
    expect(g.move(3, ...at(200))).toEqual([])
  })

  it('never taps on cancel', () => {
    const g = new WheelGesture()
    g.down(1, ...at(0), 0)
    expect(g.cancel(1)).toEqual([])
  })
})
