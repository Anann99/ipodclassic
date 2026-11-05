import { tone } from '../../device/feedback.ts'
import { CODE_LENGTH, CODE_LETTERS, type Peer } from '../../net/protocol.ts'
import { Room } from '../../net/room.ts'
import { Letters } from '../../os/letters.ts'
import { playerName } from '../../os/settings.ts'
import type { Art, Game, GameContext, Input, Mode, Session } from '../types.ts'
import { ANSWER_MS, type Player, QUESTIONS_PER_GAME, QuizEngine, type Snapshot } from './engine.ts'
import { questions } from './questions.ts'
import { QuizView, type Screen } from './view.ts'

/** What the host sends: question text instead of bank indices, so the answer never leaks early. */
type Wire =
  | { phase: 'lobby'; players: Player[] }
  | {
      phase: 'question'
      n: number
      total: number
      text: string
      answers: string[]
      players: Player[]
    }
  | {
      phase: 'reveal'
      n: number
      total: number
      text: string
      answers: string[]
      correct: number
      picks: Record<string, number>
      gained: Record<string, number>
      players: Player[]
    }
  | { phase: 'final'; players: Player[] }

type Message = { s: Wire } | { answer: { n: number; choice: number; elapsed: number } }

function toWire(s: Snapshot): Wire {
  if (s.phase === 'lobby' || s.phase === 'final') return s
  const question = questions[s.q]
  const text = question?.q ?? ''
  const answers = s.order.map((i) => question?.a[i] ?? '')
  const { n, total, players } = s
  if (s.phase === 'question') return { phase: 'question', n, total, text, answers, players }
  const { correct, picks, gained } = s
  return { phase: 'reveal', n, total, text, answers, correct, picks, gained, players }
}

const SOUND = {
  ask: () => tone({ wave: 'triangle', from: 640, ms: 60, gain: 0.08 }),
  right: () =>
    tone(
      { wave: 'sine', from: 880, ms: 90, gain: 0.14 },
      { wave: 'sine', from: 1320, ms: 160, gain: 0.14, at: 90 },
    ),
  wrong: () => tone({ wave: 'square', from: 220, to: 150, ms: 240, gain: 0.07 }),
  done: () =>
    tone(
      { wave: 'triangle', from: 523, ms: 110, gain: 0.12 },
      { wave: 'triangle', from: 659, ms: 110, gain: 0.12, at: 110 },
      { wave: 'triangle', from: 784, ms: 240, gain: 0.12, at: 220 },
    ),
}

type Role = 'solo' | 'host' | 'join'

function start(ctx: GameContext, role: Role, code?: string): Session {
  const view = new QuizView()
  ctx.root.append(view.el)
  const name = playerName()
  let me = 'me'
  let engine: QuizEngine | undefined
  let room: Room | undefined
  let host: string | undefined
  let roomCode: string | undefined
  let wire: Wire | undefined
  let note: { text: string; busy?: boolean } | undefined
  let spelling: Letters | undefined
  let selected = 0
  let picked: number | undefined
  let askedAt = 0
  let lobbyIndex = 0
  let copied = false
  let best = ctx.load('best', 0)
  let lastSent = ''

  // A clock that stops while a solo game is paused.
  let pausedAt = 0
  let pausedFor = 0
  const now = () => (pausedAt || performance.now()) - pausedFor

  const canShare = typeof navigator.share === 'function' || !!navigator.clipboard
  const actions = () =>
    role === 'host' ? ['Start', ...(canShare ? [copied ? 'Copied' : 'Invite'] : [])] : []

  const draw = () => {
    let screen: Screen
    if (spelling) screen = { kind: 'spell', title: 'Join', letters: spelling }
    else if (note) screen = { kind: 'note', ...note }
    else if (!wire) screen = { kind: 'note', text: '', busy: true }
    else if (wire.phase === 'lobby') {
      screen = {
        kind: 'lobby',
        code: roomCode,
        names: wire.players.filter((p) => p.online).map((p) => p.name),
        actions: actions(),
        selected: lobbyIndex,
      }
    } else if (wire.phase === 'question' || wire.phase === 'reveal') {
      const mine = wire.players.find((p) => p.id === me)
      const common = {
        n: wire.n,
        total: wire.total,
        text: wire.text,
        answers: wire.answers,
        picked,
        score: mine?.score ?? 0,
      }
      screen =
        wire.phase === 'question'
          ? {
              kind: 'question',
              ...common,
              selected,
              left: ANSWER_MS - (now() - askedAt),
              paused: pausedAt > 0,
            }
          : { kind: 'reveal', ...common, correct: wire.correct, gained: wire.gained[me] ?? 0 }
    } else {
      screen = {
        kind: 'final',
        standings: wire.players,
        me,
        solo: role === 'solo',
        best,
        total: Math.min(QUESTIONS_PER_GAME, questions.length),
      }
    }
    view.render(screen)
  }

  /** Applies a new snapshot from the referee (local engine or the host). */
  const receive = (next: Wire) => {
    const prev = wire
    wire = next
    if (next.phase === 'question' && (prev?.phase !== 'question' || prev.n !== next.n)) {
      askedAt = now()
      selected = 0
      picked = undefined
      SOUND.ask()
    }
    if (next.phase === 'reveal' && prev?.phase !== 'reveal') {
      if (picked === undefined || next.picks[me] === undefined) picked = undefined
      if ((next.gained[me] ?? 0) > 0) SOUND.right()
      else SOUND.wrong()
    }
    if (next.phase === 'final' && prev?.phase !== 'final') {
      SOUND.done()
      const mine = next.players.find((p) => p.id === me)
      if (role === 'solo' && mine && mine.score > best) {
        best = mine.score
        ctx.save('best', best)
      }
    }
    if (next.phase === 'lobby') note = undefined
    draw()
  }

  /** Referee side: publish the engine state to everyone (and to this screen). */
  const sync = (to?: string) => {
    if (!engine) return
    const next = toWire(engine.snapshot())
    const key = JSON.stringify(next)
    if (to) return room?.send({ s: next } satisfies Message, to)
    if (key === lastSent) return
    lastSent = key
    room?.send({ s: next } satisfies Message)
    receive(next)
  }

  const referee = () => {
    engine = new QuizEngine(questions, Math.floor(Math.random() * 2 ** 31))
    engine.join(me, name)
  }

  const connect = (joinCode?: string) => {
    note = { text: '', busy: true }
    draw()
    room = new Room(name, {
      room: (codeNow, hostId, peers) => {
        roomCode = codeNow
        host = hostId
        if (role === 'host') {
          me = room?.id ?? me
          referee()
          updatePeers(peers)
          note = undefined
          sync()
        } else {
          spelling = undefined
          note = undefined
          draw()
        }
      },
      peers: updatePeers,
      message: (from, data) => {
        const m = data as Message
        if ('s' in m && from === host) receive(m.s)
        if ('answer' in m && engine) {
          engine.answer(from, m.answer.n, m.answer.choice, m.answer.elapsed)
          engine.update(now())
          sync()
        }
      },
      offline: (offline) => {
        note = offline ? { text: 'Offline', busy: true } : undefined
        draw()
      },
      error: (reason) => {
        room = undefined
        if (reason === 'no-room' && role === 'join' && !wire) {
          note = undefined
          spelling = new Letters(CODE_LETTERS, CODE_LENGTH)
          draw()
          spelling.reject()
          return
        }
        note = { text: reason === 'full' ? 'Room full' : 'Room closed' }
        draw()
      },
    })
    me = room.id
    if (joinCode) room.join(joinCode)
    else room.host()
  }

  const updatePeers = (peers: Peer[]) => {
    if (engine) {
      for (const p of peers) {
        if (p.id === me) continue
        if (p.online) engine.join(p.id, p.name)
        else engine.setOnline(p.id, false)
      }
      engine.update(now())
      sync()
      for (const p of peers) if (p.online && p.id !== me) sync(p.id)
    } else if (role === 'join') {
      const hostPeer = peers.find((p) => p.id === host)
      note = hostPeer && !hostPeer.online ? { text: 'Host left' } : undefined
      draw()
    }
  }

  const invite = async () => {
    const url = `${location.origin}${location.pathname}?room=${roomCode}`
    try {
      if (navigator.share) return await navigator.share({ url })
      await navigator.clipboard.writeText(url)
      copied = true
      draw()
      setTimeout(() => {
        copied = false
        draw()
      }, 1500)
    } catch {}
  }

  const answer = () => {
    if (wire?.phase !== 'question' || picked !== undefined) return
    picked = selected
    const elapsed = now() - askedAt
    if (engine) {
      engine.answer(me, wire.n, picked, elapsed)
      engine.update(now())
      sync()
    } else {
      room?.send({ answer: { n: wire.n, choice: picked, elapsed } } satisfies Message, host)
    }
    draw()
  }

  if (role === 'solo') {
    referee()
    engine?.start(now())
    sync()
  } else if (role === 'host') connect()
  else if (code) connect(code)
  else {
    spelling = new Letters(CODE_LETTERS, CODE_LENGTH)
    draw()
  }

  const timer = setInterval(() => {
    if (engine && !pausedAt && engine.update(now())) sync()
  }, 100)

  return {
    input(e: Input) {
      if (spelling) {
        if (spelling.input(e) === 'done') connect(spelling.value)
        else draw()
        return
      }
      if (e.type === 'tick') {
        if (wire?.phase === 'lobby' && role === 'host') {
          lobbyIndex = Math.max(0, Math.min(actions().length - 1, lobbyIndex + e.dir))
        } else if (wire?.phase === 'question' && picked === undefined) {
          selected = Math.max(0, Math.min(wire.answers.length - 1, selected + e.dir))
        } else return
        draw()
        return
      }
      if (e.type !== 'press' || (e.button !== 'select' && e.button !== 'play')) return
      if (wire?.phase === 'lobby' && role === 'host') {
        if (lobbyIndex === 0) {
          engine?.start(now())
          sync()
        } else invite()
      } else if (wire?.phase === 'question') answer()
      else if (wire?.phase === 'reveal' && role === 'solo' && engine?.advance(now())) sync()
      else if (wire?.phase === 'final' && engine) {
        engine.start(now())
        sync()
      }
    },
    menu() {
      // While spelling a code, Menu takes back a letter, then leaves.
      if (!spelling) return false
      if (spelling.input({ type: 'press', button: 'menu' }) === 'empty') ctx.exit()
      else draw()
      return true
    },
    pause() {
      if (!pausedAt) pausedAt = performance.now()
      view.pauseTimer(true)
    },
    resume() {
      if (pausedAt) pausedFor += performance.now() - pausedAt
      pausedAt = 0
      view.pauseTimer(false)
    },
    destroy() {
      clearInterval(timer)
      room?.close()
    },
  }
}

/** Joins a room straight from an invite link. */
export function joinMode(code: string): Mode {
  return { label: 'Join', live: true, start: (ctx) => start(ctx, 'join', code) }
}

/** Home preview: four answers, one lighting up. */
const art: Art = (g, t, w, h) => {
  const rows = 4
  const rowH = 20
  const top = h / 2 - (rows * (rowH + 6)) / 2 + 12
  const pick = Math.floor(t / 1.2) % rows
  g.fillStyle = '#6b6f7a'
  g.globalAlpha = 0.35
  g.beginPath()
  g.roundRect(18, top - 40, w - 36, 22, 6)
  g.fill()
  for (let i = 0; i < rows; i++) {
    const y = top + i * (rowH + 6)
    const on = i === pick
    g.globalAlpha = on ? 1 : 0.18
    const grad = g.createLinearGradient(0, y, 0, y + rowH)
    grad.addColorStop(0, on ? '#62a6f8' : '#6b6f7a')
    grad.addColorStop(1, on ? '#2a6fdf' : '#6b6f7a')
    g.fillStyle = grad
    g.beginPath()
    g.roundRect(18, y, w - 36, rowH, 5)
    g.fill()
  }
  g.globalAlpha = 1
}

export const quiz: Game = {
  id: 'quiz',
  title: 'Quiz',
  art,
  modes: [
    { label: 'Solo', start: (ctx) => start(ctx, 'solo') },
    { label: 'Host', live: true, start: (ctx) => start(ctx, 'host') },
    { label: 'Join', live: true, start: (ctx) => start(ctx, 'join') },
  ],
}
