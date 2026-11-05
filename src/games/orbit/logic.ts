// Orbit: breakout on a ring. The paddle rides the rim and the wheel turns it; bricks sit in
// spinning rings at the center. Pure and deterministic: same seed and inputs, same game.

import { angleDelta } from '../../device/wheel.ts'

export const CX = 160
export const CY = 120
/** The ball is lost beyond this radius. */
export const RIM = 114
export const PADDLE_R = 105
export const PADDLE_T = 5
export const PADDLE_W = 0.62
export const WIDE_W = 1.0
export const BALL_R = 3
const RING_R0 = 18
const RING_H = 10
const RING_GAP = 2.5
const SEG_GAP = 0.06
/** Paddle edges can aim at most this far off center (sine of 60 degrees). */
const MAX_AIM = Math.sin(Math.PI / 3)
/** The ball's path may miss the brick field by at most this much, so most hits reach a brick. */
const AIM_MARGIN = 14
const MAX_BALLS = 3
const SERVE_AUTO = 2.5
const CLEAR_TIME = 1.4
const WIDE_TIME = 15
const CAPSULE_SPEED = 42
const MAX_LIVES = 5

export type Power = 'wide' | 'multi' | 'life'

export type Ring = { inner: number; outer: number; spin: number; angle: number }
export type Brick = { ring: number; from: number; to: number; hp: number; power?: Power }
export type Ball = { x: number; y: number; vx: number; vy: number }
export type Capsule = { power: Power; r: number; angle: number }

export type State = {
  seed: number
  level: number
  score: number
  lives: number
  combo: number
  /** Paddle hits in a row that broke nothing; raises bounce variety so loops cannot repeat. */
  idle: number
  phase: 'serve' | 'play' | 'clear' | 'over'
  /** Seconds spent in the current phase. */
  clock: number
  paddle: number
  width: number
  wideLeft: number
  speed: number
  rings: Ring[]
  bricks: Brick[]
  /** A multi-ball caught while no ball was in play splits the next serve. */
  pendingMulti: boolean
  /** Bricks the level started with; the last few speed the rings up. */
  total: number
  balls: Ball[]
  capsules: Capsule[]
}

export type Event =
  | { type: 'paddle' | 'serve' | 'lost' | 'clear' | 'over' }
  | { type: 'hit' | 'break'; x: number; y: number; ring: number }
  | { type: 'power'; power: Power }

export type Controls = { turn: number; launch: boolean }

/** Small fast seeded PRNG (mulberry32). Returns the next seed and a float in [0, 1). */
function random(s: State): number {
  s.seed = (s.seed + 0x6d2b79f5) | 0
  let t = s.seed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function create(seed = 1): State {
  const s: State = {
    seed,
    level: 1,
    score: 0,
    lives: 3,
    combo: 0,
    idle: 0,
    phase: 'serve',
    clock: 0,
    paddle: Math.PI / 2,
    width: PADDLE_W,
    wideLeft: 0,
    speed: 0,
    rings: [],
    bricks: [],
    pendingMulti: false,
    total: 0,
    balls: [],
    capsules: [],
  }
  build(s)
  return s
}

/** Lays out the rings for the current level. Five patterns cycle while rings and spin grow. */
function build(s: State, pattern = (s.level - 1) % 5) {
  const level = s.level
  const count = Math.min(5, 2 + Math.floor((level - 1) / 2))
  s.speed = Math.min(250, 135 + (level - 1) * 9)
  s.rings = []
  s.bricks = []
  for (let k = 0; k < count; k++) {
    const inner = RING_R0 + k * (RING_H + RING_GAP)
    const dir = k % 2 ? -1 : 1
    const spin = dir * Math.min(0.85, 0.07 + 0.05 * level) * (1 - k * 0.08)
    s.rings.push({ inner, outer: inner + RING_H, spin, angle: random(s) * Math.PI * 2 })
    const segments = 6 + 3 * k
    for (let i = 0; i < segments; i++) {
      const keep =
        pattern === 0 ||
        (pattern === 1 && (i + k) % 2 === 0) ||
        (pattern === 2 && (i + k * 2) % segments > 1) ||
        (pattern === 3 && Math.floor((i / segments) * 6) % 2 === 0) ||
        (pattern === 4 && random(s) > 0.3)
      if (!keep) continue
      const step = (Math.PI * 2) / segments
      const tough = level >= 3 && k === count - 1 && i % 3 === 0
      const roll = random(s)
      s.bricks.push({
        ring: k,
        from: i * step + SEG_GAP / 2,
        to: (i + 1) * step - SEG_GAP / 2,
        hp: tough ? 2 : 1,
        power: roll < 0.05 ? 'multi' : roll < 0.1 ? 'wide' : roll < 0.12 ? 'life' : undefined,
      })
    }
  }
  if (s.bricks.length === 0) build(s, 0)
  s.total = s.bricks.length
}

/** The last fifth of a level spins faster, so the final bricks come to you. */
const boost = (s: State) => (s.bricks.length < s.total * 0.2 ? 1.8 : 1)

/** Where a served ball rests: on the paddle, just inside it. */
export function restingBall(s: State): Ball {
  const r = PADDLE_R - PADDLE_T / 2 - BALL_R - 0.5
  return { x: CX + Math.cos(s.paddle) * r, y: CY + Math.sin(s.paddle) * r, vx: 0, vy: 0 }
}

function launch(s: State, events: Event[]) {
  const aim = s.paddle + Math.PI + (random(s) - 0.5) * 0.4
  s.balls = [{ ...restingBall(s), vx: Math.cos(aim) * s.speed, vy: Math.sin(aim) * s.speed }]
  s.phase = 'play'
  s.clock = 0
  s.combo = 0
  events.push({ type: 'serve' })
  if (s.pendingMulti) {
    s.pendingMulti = false
    split(s)
  }
}

export function step(s: State, controls: Controls, dt: number): Event[] {
  const events: Event[] = []
  s.clock += dt
  s.paddle = (s.paddle + controls.turn) % (Math.PI * 2)

  if (s.phase === 'over') return events
  if (s.phase === 'clear') {
    // Power-ups still falling can still be caught while the level celebrates.
    moveCapsules(s, dt, events)
    if (s.clock >= CLEAR_TIME) {
      s.level += 1
      s.phase = 'serve'
      s.clock = 0
      build(s)
    }
    return events
  }

  for (const ring of s.rings) ring.angle += ring.spin * boost(s) * dt
  if (s.wideLeft > 0) s.wideLeft = Math.max(0, s.wideLeft - dt)
  const target = s.wideLeft > 0 ? WIDE_W : PADDLE_W
  s.width += (target - s.width) * Math.min(1, dt * 8)

  if (s.phase === 'serve') {
    // Power-ups from the last level keep falling into this one.
    moveCapsules(s, dt, events)
    if (controls.launch || s.clock >= SERVE_AUTO) launch(s, events)
    return events
  }

  for (const ball of s.balls) moveBall(s, ball, dt, events)
  s.balls = s.balls.filter((b) => Math.hypot(b.x - CX, b.y - CY) < RIM + BALL_R * 2)
  moveCapsules(s, dt, events)

  if (s.bricks.length === 0) {
    s.phase = 'clear'
    s.clock = 0
    s.balls = []
    s.score += 100 * s.level
    events.push({ type: 'clear' })
  } else if (s.balls.length === 0) {
    s.lives -= 1
    s.wideLeft = 0
    s.capsules = []
    s.clock = 0
    s.phase = s.lives > 0 ? 'serve' : 'over'
    events.push({ type: s.lives > 0 ? 'lost' : 'over' })
  }
  return events
}

function moveBall(s: State, ball: Ball, dt: number, events: Event[]) {
  // Substeps keep the ball moving under half its radius relative to any brick per step.
  const fastest = Math.max(0, ...s.rings.map((r) => Math.abs(r.spin) * r.outer)) * 1.8
  const steps = Math.ceil(((Math.hypot(ball.vx, ball.vy) + fastest) * dt) / (BALL_R / 2))
  for (let i = 0; i < steps; i++) {
    if (substep(s, ball, dt / steps, events)) return
  }
}

/** Moves the ball once and resolves at most one contact. Returns true after a paddle hit. */
function substep(s: State, ball: Ball, dt: number, events: Event[]): boolean {
  ball.x += ball.vx * dt
  ball.y += ball.vy * dt
  const dx = ball.x - CX
  const dy = ball.y - CY
  const r = Math.hypot(dx, dy)
  const angle = Math.atan2(dy, dx)
  const speed = Math.hypot(ball.vx, ball.vy)

  // Paddle: only while moving outward, so the ball never sticks inside it.
  const outward = ball.vx * dx + ball.vy * dy > 0
  if (
    outward &&
    r + BALL_R >= PADDLE_R - PADDLE_T / 2 &&
    r - BALL_R <= PADDLE_R + PADDLE_T / 2 &&
    Math.abs(angleDelta(s.paddle, angle)) <= s.width / 2 + BALL_R / PADDLE_R
  ) {
    // Aim by where the ball lands on the paddle: the center sends it straight through the
    // middle, the edges send it across, but always through the brick field.
    const offset = Math.max(-1, Math.min(1, angleDelta(s.paddle, angle) / (s.width / 2)))
    const field = Math.max(RING_R0, ...s.bricks.map((b) => (s.rings[b.ring] as Ring).outer))
    const reach = Math.min(MAX_AIM, (field + BALL_R + AIM_MARGIN) / PADDLE_R)
    s.idle = s.combo === 0 ? s.idle + 1 : 0
    const jitter = (random(s) - 0.5) * (0.08 + Math.min(0.6, s.idle * 0.15))
    const limit = Math.asin(reach)
    const aim = Math.max(-limit, Math.min(limit, Math.asin(offset * reach) - jitter))
    const out = angle + Math.PI - aim
    const next = Math.min(s.speed * 1.25, speed * 1.015)
    ball.vx = Math.cos(out) * next
    ball.vy = Math.sin(out) * next
    const rest = PADDLE_R - PADDLE_T / 2 - BALL_R
    ball.x = CX + Math.cos(angle) * rest
    ball.y = CY + Math.sin(angle) * rest
    s.combo = 0
    events.push({ type: 'paddle' })
    return true
  }

  // Bricks: resolve the deepest overlap.
  let index = -1
  let depth = 0
  let nx = 0
  let ny = 0
  for (let i = 0; i < s.bricks.length; i++) {
    const brick = s.bricks[i] as Brick
    const ring = s.rings[brick.ring] as Ring
    const hit = closestOnSector(
      dx,
      dy,
      ring.inner,
      ring.outer,
      brick.from + ring.angle,
      brick.to + ring.angle,
    )
    const d = Math.hypot(dx - hit.x, dy - hit.y)
    if (d >= BALL_R || BALL_R - d <= depth) continue
    index = i
    depth = BALL_R - d
    if (d > 1e-6) {
      nx = (dx - hit.x) / d
      ny = (dy - hit.y) / d
    } else {
      // The center is inside the brick: leave through the nearer curved face.
      const out = r > (ring.inner + ring.outer) / 2 ? 1 : -1
      nx = (out * dx) / (r || 1)
      ny = (out * dy) / (r || 1)
    }
  }
  if (index < 0) return false
  const brick = s.bricks[index] as Brick
  const ring = s.rings[brick.ring] as Ring
  ball.x += nx * depth
  ball.y += ny * depth

  // Bounce off the brick's moving surface. Contacts that are already separating (a spinning
  // edge brushing a ball that is leaving) push the ball out but do not count as hits.
  const spin = ring.spin * boost(s)
  const ux = -spin * dy
  const uy = spin * dx
  const approach = (ball.vx - ux) * nx + (ball.vy - uy) * ny
  if (approach >= 0) return false
  const rvx = ball.vx - ux - 2 * approach * nx
  const rvy = ball.vy - uy - 2 * approach * ny
  const vx = rvx + ux
  const vy = rvy + uy
  const scale = speed / (Math.hypot(vx, vy) || 1)
  ball.vx = vx * scale
  ball.vy = vy * scale

  brick.hp -= 1
  const mid = (ring.inner + ring.outer) / 2
  const at = (brick.from + brick.to) / 2 + ring.angle
  const x = CX + Math.cos(at) * mid
  const y = CY + Math.sin(at) * mid
  if (brick.hp > 0) {
    events.push({ type: 'hit', x, y, ring: brick.ring })
  } else {
    s.bricks.splice(index, 1)
    s.combo += 1
    s.score += 10 * Math.min(8, s.combo)
    events.push({ type: 'break', x, y, ring: brick.ring })
    if (brick.power) s.capsules.push({ power: brick.power, r: mid, angle: at })
  }
  return false
}

function moveCapsules(s: State, dt: number, events: Event[]) {
  s.capsules = s.capsules.filter((c) => {
    c.r += CAPSULE_SPEED * dt
    if (
      c.r >= PADDLE_R - PADDLE_T &&
      Math.abs(angleDelta(s.paddle, c.angle)) <= s.width / 2 + 0.08
    ) {
      apply(s, c.power)
      events.push({ type: 'power', power: c.power })
      return false
    }
    return c.r < RIM
  })
}

function apply(s: State, power: Power) {
  if (power === 'life') s.lives = Math.min(MAX_LIVES, s.lives + 1)
  if (power === 'wide') s.wideLeft = WIDE_TIME
  if (power === 'multi') {
    if (s.balls.length) split(s)
    else s.pendingMulti = true
  }
}

/** Two more balls fan out from the first, up to three in play. */
function split(s: State) {
  const ball = s.balls[0]
  if (!ball) return
  for (const turn of [-0.4, 0.4]) {
    if (s.balls.length >= MAX_BALLS) break
    const c = Math.cos(turn)
    const n = Math.sin(turn)
    s.balls.push({ ...ball, vx: ball.vx * c - ball.vy * n, vy: ball.vx * n + ball.vy * c })
  }
}

/** Closest point to (x, y) on an annular sector centered at the origin. */
export function closestOnSector(
  x: number,
  y: number,
  inner: number,
  outer: number,
  from: number,
  to: number,
): { x: number; y: number } {
  const angle = Math.atan2(y, x)
  const span = to - from
  const into = angleDelta(from, angle)
  const within = (into >= 0 && into <= span) || (into < 0 && into + Math.PI * 2 <= span)
  if (within) {
    const r = Math.max(inner, Math.min(outer, Math.hypot(x, y)))
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r }
  }
  // Outside the angular span: the closest point is on the nearer straight edge.
  const edge = Math.abs(angleDelta(from, angle)) < Math.abs(angleDelta(to, angle)) ? from : to
  const ex = Math.cos(edge)
  const ey = Math.sin(edge)
  const t = Math.max(inner, Math.min(outer, x * ex + y * ey))
  return { x: ex * t, y: ey * t }
}
