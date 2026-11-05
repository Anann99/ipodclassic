import { tone } from '../../device/feedback.ts'
import { angleDelta } from '../../device/wheel.ts'
import { canvas2d, loop } from '../../os/canvas.ts'
import type { Art, Game, GameContext, Input, Session } from '../types.ts'
import {
  BALL_R,
  CX,
  CY,
  create,
  type Event,
  PADDLE_R,
  PADDLE_T,
  type Power,
  RIM,
  restingBall,
  type State,
  step,
} from './logic.ts'

const RING_COLORS = ['#ff6b6b', '#ffb84d', '#5ee38d', '#4cc3ff', '#a78bfa']
const POWER_COLORS: Record<Power, string> = { wide: '#4cc3ff', multi: '#f472d0', life: '#5ee38d' }
const BACKDROP = ['#151a2b', '#07080d'] as const

type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string }

const SOUNDS: Partial<Record<Event['type'], () => void>> = {
  paddle: () => tone({ from: 520, to: 700, ms: 45, gain: 0.08 }),
  serve: () => tone({ wave: 'triangle', from: 300, to: 600, ms: 90, gain: 0.1 }),
  hit: () => tone({ wave: 'triangle', from: 260, ms: 50, gain: 0.12 }),
  power: () =>
    tone(
      { wave: 'triangle', from: 660, ms: 70, gain: 0.1 },
      { wave: 'triangle', from: 990, ms: 110, gain: 0.1, at: 70 },
    ),
  lost: () => tone({ wave: 'sawtooth', from: 320, to: 70, ms: 420, gain: 0.08 }),
  over: () => tone({ wave: 'sawtooth', from: 260, to: 50, ms: 700, gain: 0.08 }),
  clear: () =>
    tone(
      { wave: 'square', from: 523, ms: 90, gain: 0.07 },
      { wave: 'square', from: 659, ms: 90, gain: 0.07, at: 90 },
      { wave: 'square', from: 784, ms: 90, gain: 0.07, at: 180 },
      { wave: 'square', from: 1047, ms: 220, gain: 0.07, at: 270 },
    ),
}

function start(ctx: GameContext): Session {
  const { ctx: g, dispose } = canvas2d(ctx.root)
  let state: State = create(Math.floor(Math.random() * 2 ** 31))
  let best = ctx.load('best', 0)
  let turn = 0
  let launch = false
  /** Screen shake builds as trauma and fades; it is off for reduced motion. */
  let trauma = 0
  let newBest = false
  let before: { paddle: number; balls: { x: number; y: number }[] } = {
    paddle: state.paddle,
    balls: [],
  }
  const calm = matchMedia('(prefers-reduced-motion: reduce)')
  let time = 0
  const particles: Particle[] = []
  const trail: { x: number; y: number }[] = []

  const react = (e: Event) => {
    SOUNDS[e.type]?.()
    if (e.type === 'break' || e.type === 'hit') {
      const color = RING_COLORS[e.ring % RING_COLORS.length] as string
      const n = e.type === 'break' ? 9 : 3
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const v = 30 + Math.random() * 70
        particles.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          life: 0.5,
          color,
        })
      }
      if (e.type === 'break') {
        const pitch = 700 + e.ring * 90 + Math.min(8, state.combo) * 40
        tone({ from: pitch, to: pitch * 1.5, ms: 60, gain: 0.07 })
      }
    }
    if (e.type === 'lost' || e.type === 'over') trauma = Math.min(1, trauma + 0.6)
    if (e.type === 'over' && state.score > best) {
      newBest = true
      best = state.score
      ctx.save('best', best)
    }
  }

  const game = loop(
    (dt) => {
      time += dt
      if (state.phase === 'over' && launch && state.clock > 0.8) {
        state = create(state.seed)
        newBest = false
        particles.length = 0
        trail.length = 0
        // The press that restarted should not also serve: the new game waits to be served.
        launch = false
      }
      before = { paddle: state.paddle, balls: state.balls.map((b) => ({ x: b.x, y: b.y })) }
      const events = step(state, { turn, launch }, dt)
      turn = 0
      launch = false
      for (const e of events) react(e)
      for (const p of particles) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vx *= 0.96
        p.vy *= 0.96
        p.life -= dt
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        if ((particles[i] as Particle).life <= 0) particles.splice(i, 1)
      }
      trauma = Math.max(0, trauma - dt * 1.5)
    },
    (alpha) => {
      // Draw between the last two physics steps, so motion is smooth at any refresh rate.
      const shown: State = {
        ...state,
        paddle: before.paddle + angleDelta(before.paddle, state.paddle) * alpha,
        balls: state.balls.map((b, i) => {
          const from = before.balls[i]
          if (!from || before.balls.length !== state.balls.length) return b
          return { ...b, x: from.x + (b.x - from.x) * alpha, y: from.y + (b.y - from.y) * alpha }
        }),
      }
      const ball = shown.balls[0]
      if (ball) trail.push({ x: ball.x, y: ball.y })
      if (trail.length > 8 || !ball) trail.shift()
      const shake = calm.matches ? 0 : 4 * trauma * trauma
      draw(g, shown, particles, trail, time, shake, best, newBest)
    },
  )
  game.start()

  return {
    input(e: Input) {
      if (e.type === 'turn') turn += e.delta
      if (e.type === 'press' && (e.button === 'select' || e.button === 'play')) launch = true
    },
    pause: () => game.stop(),
    resume: () => game.start(),
    destroy: () => {
      game.stop()
      dispose()
      if (state.score > best) ctx.save('best', state.score)
    },
  }
}

function sector(
  g: CanvasRenderingContext2D,
  inner: number,
  outer: number,
  from: number,
  to: number,
) {
  g.beginPath()
  g.arc(CX, CY, outer, from, to)
  g.arc(CX, CY, inner, to, from, true)
  g.closePath()
}

function draw(
  g: CanvasRenderingContext2D,
  s: State,
  particles: Particle[],
  trail: { x: number; y: number }[],
  time: number,
  shake: number,
  best: number,
  newBest: boolean,
) {
  const bg = g.createRadialGradient(CX, CY, 10, CX, CY, 200)
  bg.addColorStop(0, BACKDROP[0])
  bg.addColorStop(1, BACKDROP[1])
  g.fillStyle = bg
  g.fillRect(0, 0, 320, 240)

  g.save()
  if (shake > 0) {
    g.translate(
      Math.round((Math.random() * 2 - 1) * shake),
      Math.round((Math.random() * 2 - 1) * shake),
    )
  }

  // Track
  g.strokeStyle = 'rgba(255,255,255,0.07)'
  g.lineWidth = 1
  g.beginPath()
  g.arc(CX, CY, RIM, 0, Math.PI * 2)
  g.stroke()

  // Bricks
  const clearing = s.phase === 'clear' ? Math.min(1, s.clock / 0.6) : 0
  for (const b of s.bricks) {
    const ring = s.rings[b.ring]
    if (!ring) continue
    const color = RING_COLORS[b.ring % RING_COLORS.length] as string
    sector(g, ring.inner, ring.outer, b.from + ring.angle, b.to + ring.angle)
    g.fillStyle = color
    g.globalAlpha = b.hp > 1 ? 0.45 : 1
    g.fill()
    g.globalAlpha = 1
    if (b.hp > 1) {
      g.strokeStyle = color
      g.lineWidth = 1.5
      g.stroke()
    }
    if (b.power) {
      const mid = (ring.inner + ring.outer) / 2
      const at = (b.from + b.to) / 2 + ring.angle
      g.fillStyle = 'rgba(255,255,255,0.9)'
      g.beginPath()
      g.arc(CX + Math.cos(at) * mid, CY + Math.sin(at) * mid, 1.6, 0, Math.PI * 2)
      g.fill()
    }
  }

  // Level clear: a bright pulse from the core.
  if (s.phase === 'clear') {
    g.strokeStyle = `rgba(255,255,255,${0.6 * (1 - clearing)})`
    g.lineWidth = 3
    g.beginPath()
    g.arc(CX, CY, 10 + clearing * (RIM - 10), 0, Math.PI * 2)
    g.stroke()
  }

  // Capsules
  for (const c of s.capsules) {
    const x = CX + Math.cos(c.angle) * c.r
    const y = CY + Math.sin(c.angle) * c.r
    g.fillStyle = POWER_COLORS[c.power]
    g.shadowColor = POWER_COLORS[c.power]
    g.shadowBlur = 8
    g.beginPath()
    g.arc(x, y, 4.5, 0, Math.PI * 2)
    g.fill()
    g.shadowBlur = 0
    g.fillStyle = '#0b0d14'
    if (c.power === 'life') {
      g.fillRect(x - 2.5, y - 0.75, 5, 1.5)
      g.fillRect(x - 0.75, y - 2.5, 1.5, 5)
    } else if (c.power === 'wide') {
      g.fillRect(x - 2.5, y - 0.75, 5, 1.5)
    } else {
      for (const dx of [-1.8, 0, 1.8]) g.fillRect(x + dx - 0.6, y - 0.6, 1.2, 1.2)
    }
  }

  // Particles
  for (const p of particles) {
    g.globalAlpha = Math.max(0, p.life / 0.5)
    g.fillStyle = p.color
    g.fillRect(p.x - 1, p.y - 1, 2, 2)
  }
  g.globalAlpha = 1

  // Paddle
  g.lineCap = 'round'
  g.lineWidth = PADDLE_T
  g.strokeStyle = '#f4f5f8'
  g.shadowColor = 'rgba(160,200,255,0.8)'
  g.shadowBlur = 10
  g.beginPath()
  g.arc(CX, CY, PADDLE_R, s.paddle - s.width / 2, s.paddle + s.width / 2)
  g.stroke()
  g.shadowBlur = 0

  // Balls
  if (s.phase === 'serve') {
    const b = restingBall(s)
    const pulse = 0.6 + 0.4 * Math.sin(time * 8)
    g.fillStyle = `rgba(255,255,255,${pulse})`
    g.beginPath()
    g.arc(b.x, b.y, BALL_R, 0, Math.PI * 2)
    g.fill()
  }
  trail.forEach((t, i) => {
    g.globalAlpha = ((i + 1) / trail.length) * 0.25
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.arc(t.x, t.y, BALL_R * 0.8, 0, Math.PI * 2)
    g.fill()
  })
  g.globalAlpha = 1
  g.fillStyle = '#ffffff'
  g.shadowColor = 'rgba(255,255,255,0.9)'
  g.shadowBlur = 6
  for (const b of s.balls) {
    g.beginPath()
    g.arc(b.x, b.y, BALL_R, 0, Math.PI * 2)
    g.fill()
  }
  g.shadowBlur = 0
  g.restore()

  // Score and lives in the corners, outside the ring.
  g.font = '600 13px system-ui, -apple-system, sans-serif'
  g.textBaseline = 'top'
  g.fillStyle = 'rgba(255,255,255,0.85)'
  g.textAlign = 'left'
  g.fillText(String(s.score), 10, 9)
  g.fillStyle = 'rgba(255,255,255,0.75)'
  for (let i = 0; i < s.lives; i++) {
    g.beginPath()
    g.arc(310 - i * 9, 15.5, 2.6, 0, Math.PI * 2)
    g.fill()
  }

  // Level number in the core while serving.
  if (s.phase === 'serve' && s.clock < 1.2) {
    g.globalAlpha = Math.min(1, (1.2 - s.clock) * 2)
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = '700 15px system-ui, -apple-system, sans-serif'
    g.fillStyle = '#ffffff'
    g.fillText(String(s.level), CX, CY + 0.5)
    g.globalAlpha = 1
  }

  if (s.phase === 'over') {
    const fade = Math.min(1, s.clock * 2)
    g.fillStyle = `rgba(5,6,10,${0.72 * fade})`
    g.fillRect(0, 0, 320, 240)
    g.globalAlpha = fade
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillStyle = '#ffffff'
    g.font = '700 40px system-ui, -apple-system, sans-serif'
    g.fillText(String(s.score), CX, CY - 8)
    g.font = '600 13px system-ui, -apple-system, sans-serif'
    g.fillStyle = newBest ? '#ffd166' : 'rgba(255,255,255,0.55)'
    g.fillText(`★ ${best}`, CX, CY + 26)
    g.globalAlpha = 1
  }
}

/** Home menu preview: rings turning, a paddle sweeping and a ball crossing. */
const art: Art = (g, t, w, h) => {
  const cx = w / 2
  const cy = h / 2
  const R = Math.min(w, h) / 2 - 10
  g.fillStyle = BACKDROP[1]
  g.beginPath()
  g.arc(cx, cy, R + 6, 0, Math.PI * 2)
  g.fill()
  for (let k = 0; k < 3; k++) {
    const inner = R * (0.18 + k * 0.13)
    const outer = inner + R * 0.1
    const n = 6 + 3 * k
    const spin = t * (k % 2 ? -0.4 : 0.5)
    g.fillStyle = RING_COLORS[k] as string
    for (let i = 0; i < n; i++) {
      if ((i + k) % 4 === 3) continue
      const from = (i / n) * Math.PI * 2 + spin + 0.05
      const to = ((i + 1) / n) * Math.PI * 2 + spin - 0.05
      g.beginPath()
      g.arc(cx, cy, outer, from, to)
      g.arc(cx, cy, inner, to, from, true)
      g.closePath()
      g.fill()
    }
  }
  const paddle = Math.PI / 2 + Math.sin(t * 1.3) * 0.9
  g.strokeStyle = '#f4f5f8'
  g.lineCap = 'round'
  g.lineWidth = 4
  g.beginPath()
  g.arc(cx, cy, R * 0.92, paddle - 0.3, paddle + 0.3)
  g.stroke()
  const phase = (t * 0.7) % 1
  const r = R * (0.62 + 0.28 * Math.abs(Math.sin(phase * Math.PI)))
  const a = paddle + Math.sin(t * 2.1) * 0.25
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2.6, 0, Math.PI * 2)
  g.fill()
}

export const orbit: Game = {
  id: 'orbit',
  title: 'Orbit',
  art,
  modes: [{ label: 'Play', start }],
}
