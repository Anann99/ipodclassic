import { describe, expect, it } from 'vitest'
import { angleDelta } from '../../device/wheel.ts'
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

  it('never aims an edge hit past the brick field, however long nothing breaks', () => {
    const s = create(1)
    s.idle = 50
    for (let i = 0; i < 200; i++) {
      place(s, PADDLE_R - 6, s.paddle + s.width / 2, 150)
      step(s, idle, DT)
      const b = s.balls[0]
      if (!b) continue
      // Distance from the center to the ball's straight path.
      const miss = Math.abs((b.x - CX) * b.vy - (b.y - CY) * b.vx) / Math.hypot(b.vx, b.vy)
      expect(miss).toBeLessThan(PADDLE_R * Math.sin(Math.PI / 3) + 0.5)
    }
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

describe('pacing', () => {
  it('a good player clears every early level in under a minute, with no endless loops', () => {
    for (const seed of [3, 11]) {
      const s = create(seed)
      let t = 0
      let levelStart = 0
      while (s.level <= 6 && t < 600) {
        const b = s.balls[0]
        const target = b ? Math.atan2(b.y - CY, b.x - CX) + Math.sin(t * 1.7) * 0.2 : s.paddle
        const turn = Math.max(-0.08, Math.min(0.08, angleDelta(s.paddle, target)))
        const level = s.level
        step(s, { turn, launch: true }, DT)
        t += DT
        if (s.level !== level) {
          expect(t - levelStart, `seed ${seed} level ${level}`).toBeLessThan(60)
          levelStart = t
        }
      }
      expect(s.level).toBeGreaterThan(6)
    }
  })
})

describe('power-ups', () => {
  it('keeps falling during the level-clear pause and can still be caught', () => {
    const s = create(4)
    s.phase = 'clear'
    s.clock = 0
    s.lives = 2
    s.capsules = [{ power: 'life', r: PADDLE_R - 20, angle: s.paddle }]
    expect(run(s, 1)).toContainEqual({ type: 'power', power: 'life' })
    expect(s.lives).toBe(3)
  })

  it('carries a capsule from the innermost ring into the next level', () => {
    const s = create(4)
    s.phase = 'clear'
    s.clock = 0
    s.lives = 2
    s.capsules = [{ power: 'life', r: 23, angle: s.paddle }]
    expect(run(s, 2.5)).toContainEqual({ type: 'power', power: 'life' })
    expect(s.level).toBe(2)
    expect(s.lives).toBe(3)
  })
})

describe('physics', () => {
  it('counts one hit when a spinning brick edge brushes a ball that is leaving', () => {
    const s = create(5)
    const ring = s.rings[0]
    const brick = s.bricks.find((b) => b.ring === 0)
    if (!ring || !brick) throw new Error('no ring')
    s.bricks = [{ ...brick, hp: 99 }]
    ring.spin = 3
    // Just past the brick's leading edge, drifting away tangentially at the same speed.
    const edge = brick.to + ring.angle + 0.02
    const mid = (ring.inner + ring.outer) / 2
    s.phase = 'play'
    s.balls = [
      {
        x: CX + Math.cos(edge) * mid,
        y: CY + Math.sin(edge) * mid,
        vx: -Math.sin(edge) * mid * 2.4,
        vy: Math.cos(edge) * mid * 2.4,
      },
    ]
    const hits = run(s, 0.25).filter((e) => e.type === 'hit').length
    expect(hits).toBeLessThanOrEqual(1)
  })

  it('keeps the ball finite, out of bricks and under the speed cap', () => {
    for (const seed of [2, 9]) {
      const s = create(seed)
      for (let i = 0; i < 120 * 90; i++) {
        const b = s.balls[0]
        const target = b ? Math.atan2(b.y - CY, b.x - CX) : s.paddle
        step(
          s,
          { turn: Math.max(-0.08, Math.min(0.08, angleDelta(s.paddle, target))), launch: true },
          DT,
        )
        for (const ball of s.balls) {
          expect(Number.isFinite(ball.x + ball.y + ball.vx + ball.vy)).toBe(true)
          expect(Math.hypot(ball.vx, ball.vy)).toBeLessThanOrEqual(s.speed * 1.26)
          for (const brick of s.bricks) {
            const ring = s.rings[brick.ring]
            if (!ring) continue
            const p = closestOnSector(
              ball.x - CX,
              ball.y - CY,
              ring.inner,
              ring.outer,
              brick.from + ring.angle,
              brick.to + ring.angle,
            )
            expect(Math.hypot(ball.x - CX - p.x, ball.y - CY - p.y)).toBeGreaterThan(0)
          }
        }
      }
    }
  })
})

it('game logic uses no clock or global randomness, so replays are exact', async () => {
  const { readFile } = await import('node:fs/promises')
  for (const file of ['logic.ts', '../quiz/engine.ts']) {
    const source = await readFile(new URL(file, import.meta.url), 'utf8')
    expect(source, file).not.toMatch(/Math\.random|Date\.now|performance\.now|new Date/)
  }
})
