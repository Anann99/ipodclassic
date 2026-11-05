import { describe, expect, it } from 'vitest'
import {
  CX,
  CY,
  closestOnSector,
  create,
  type Event,
  PADDLE_R,
  RIM,
  type State,
  step,
} from './logic.ts'

const DT = 1 / 120
const idle = { turn: 0, launch: false }

function run(s: State, seconds: number, controls = idle): Event[] {
  const events: Event[] = []
  for (let t = 0; t < seconds; t += DT) events.push(...step(s, controls, DT))
  return events
}

/** Puts a single ball at polar (r, angle) moving radially at `speed` (positive = outward). */
function place(s: State, r: number, angle: number, speed: number) {
  s.phase = 'play'
  s.balls = [
    {
      x: CX + Math.cos(angle) * r,
      y: CY + Math.sin(angle) * r,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    },
  ]
}

describe('closestOnSector', () => {
  it('clamps radially inside the angular span', () => {
    const p = closestOnSector(50, 0, 10, 20, -0.5, 0.5)
    expect(p.x).toBeCloseTo(20)
    expect(p.y).toBeCloseTo(0)
  })
  it('uses the nearest straight edge outside the span', () => {
    const p = closestOnSector(0, 15, 10, 20, -0.5, 0.5)
    const edge = { x: Math.cos(0.5), y: Math.sin(0.5) }
    expect(p.x / edge.x).toBeCloseTo(p.y / edge.y)
  })
  it('handles spans across the angle wrap', () => {
    const p = closestOnSector(-30, 0.1, 10, 20, Math.PI - 0.2, Math.PI + 0.2)
    expect(p.x).toBeCloseTo(-20, 0)
  })
})

describe('Orbit', () => {
  it('serves on launch, and on its own after a pause', () => {
    const a = create(7)
    expect(step(a, { turn: 0, launch: true }, DT)).toContainEqual({ type: 'serve' })
    expect(a.balls).toHaveLength(1)
    const b = create(7)
    expect(run(b, 3)).toContainEqual({ type: 'serve' })
  })

  it('turns the paddle by exactly the wheel rotation', () => {
    const s = create(1)
    const before = s.paddle
    step(s, { turn: 0.3, launch: false }, DT)
    expect(s.paddle).toBeCloseTo(before + 0.3)
  })

  it('bounces a ball that reaches the paddle back inward', () => {
    const s = create(1)
    s.bricks = s.bricks.slice(0, 1)
    place(s, PADDLE_R - 12, s.paddle, 150)
    const events = run(s, 0.2)
    expect(events).toContainEqual({ type: 'paddle' })
    const b = s.balls[0]
    expect(b).toBeDefined()
    if (b) expect(b.vx * (b.x - CX) + b.vy * (b.y - CY)).toBeLessThan(0)
  })

  it('loses a life when the ball passes the paddle', () => {
    const s = create(1)
    place(s, RIM - 20, s.paddle + Math.PI, 150)
    const events = run(s, 0.5)
    expect(events).toContainEqual({ type: 'lost' })
    expect(s.lives).toBe(2)
    expect(s.phase).toBe('serve')
  })

  it('ends the game when the last life is lost', () => {
    const s = create(1)
    s.lives = 1
    place(s, RIM - 20, s.paddle + Math.PI, 150)
    expect(run(s, 0.5)).toContainEqual({ type: 'over' })
    expect(s.phase).toBe('over')
  })

  it('breaks a brick, scores, and clears the level when none remain', () => {
    const s = create(1)
    const brick = s.bricks[0]
    if (!brick) throw new Error('no bricks')
    s.bricks = [brick]
    const ring = s.rings[brick.ring]
    if (!ring) throw new Error('no ring')
    const angle = (brick.from + brick.to) / 2 + ring.angle
    place(s, ring.outer + 15, angle, -150)
    const events = run(s, 0.3)
    expect(events.some((e) => e.type === 'break')).toBe(true)
    expect(events).toContainEqual({ type: 'clear' })
    expect(s.score).toBeGreaterThanOrEqual(10 + 100)
    run(s, 2)
    expect(s.level).toBe(2)
    expect(s.bricks.length).toBeGreaterThan(0)
  })

  it('is deterministic for a seed and inputs', () => {
    const play = () => {
      const s = create(42)
      for (let i = 0; i < 3000; i++)
        step(s, { turn: Math.sin(i / 50) * 0.02, launch: i === 10 }, DT)
      return JSON.stringify(s)
    }
    expect(play()).toBe(play())
  })

  it('builds a playable layout for many levels', () => {
    for (let level = 1; level <= 30; level++) {
      const s = create(level)
      s.level = level
      s.bricks = []
      s.phase = 'clear'
      s.clock = 10
      s.level = level - 1
      step(s, idle, DT)
      expect(s.bricks.length).toBeGreaterThan(0)
      for (const r of s.rings) expect(r.outer).toBeLessThan(PADDLE_R - 20)
    }
  })
})
