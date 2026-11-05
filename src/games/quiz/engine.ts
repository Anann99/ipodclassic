// The quiz referee. Solo play runs it locally; in multiplayer the host runs it and sends
// snapshots to everyone. Pure: time comes in as arguments, randomness from a seed.

export type Question = {
  q: string
  /** The correct answer first; the engine shuffles the order shown. */
  a: [string, string, string, string]
  c: string
  d: 1 | 2 | 3
}

export const QUESTIONS_PER_GAME = 10
export const ANSWER_MS = 15_000
/** Extra time before the referee closes a question, for network delay. */
export const GRACE_MS = 700
export const REVEAL_MS = 3_200
export const MAX_POINTS = 1000

export type Player = { id: string; name: string; score: number; right: number; online: boolean }

export type Snapshot =
  | { phase: 'lobby'; players: Player[] }
  | {
      phase: 'question'
      n: number
      total: number
      q: number
      order: number[]
      /** Time since the question opened, so late joiners see the true time left. */
      elapsed: number
      answered: string[]
      players: Player[]
    }
  | {
      phase: 'reveal'
      n: number
      total: number
      q: number
      order: number[]
      /** Position of the correct answer in `order`. */
      correct: number
      picks: Record<string, number>
      gained: Record<string, number>
      players: Player[]
    }
  | { phase: 'final'; players: Player[] }

/** The most network delay the referee believes; claimed answer times are bounded by it. */
export const LAG_MS = 400

/** Time to read a question before points start to drop, so slow readers are not penalized. */
export function readingMs(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1500, Math.min(4000, 500 + words * 250))
}

/** Points for a correct answer: full marks while reading, half at the buzzer. */
export function points(elapsedMs: number, readMs = 0): number {
  const t = Math.max(0, Math.min(ANSWER_MS, elapsedMs) - readMs)
  return Math.round(MAX_POINTS * (1 - t / (ANSWER_MS - readMs) / 2))
}

export class QuizEngine {
  private readonly players = new Map<string, Player>()
  private readonly bank: Question[]
  private seed: number
  private phase: Snapshot['phase'] = 'lobby'
  private picks: number[] = []
  private n = 0
  private order: number[] = []
  private started = 0
  private revealed = 0
  private answers = new Map<string, { choice: number; elapsed: number }>()
  private gained: Record<string, number> = {}

  constructor(bank: Question[], seed: number) {
    this.bank = bank
    this.seed = seed || 1
  }

  private random(): number {
    this.seed = (this.seed + 0x6d2b79f5) | 0
    let t = this.seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  join(id: string, name: string): void {
    const existing = this.players.get(id)
    if (existing) {
      existing.online = true
      return
    }
    // Two players called the same thing are told apart: Echo, Echo 2.
    const taken = new Set([...this.players.values()].map((p) => p.name))
    let unique = name
    for (let n = 2; taken.has(unique); n++) unique = `${name} ${n}`
    this.players.set(id, { id, name: unique, score: 0, right: 0, online: true })
  }

  setOnline(id: string, online: boolean): void {
    const p = this.players.get(id)
    if (p) p.online = online
  }

  get current(): Snapshot['phase'] {
    return this.phase
  }

  /** Picks the questions, easy first, and opens question one. */
  start(now: number): void {
    const want: (1 | 2 | 3)[] = [1, 1, 1, 1, 2, 2, 2, 2, 3, 3]
    const free = new Set(this.bank.keys())
    this.picks = []
    for (let i = 0; i < Math.min(QUESTIONS_PER_GAME, this.bank.length); i++) {
      const level = want[i] ?? 2
      let pool = [...free].filter((k) => this.bank[k]?.d === level)
      if (pool.length === 0) pool = [...free]
      const pick = pool[Math.floor(this.random() * pool.length)] as number
      free.delete(pick)
      this.picks.push(pick)
    }
    for (const p of this.players.values()) {
      p.score = 0
      p.right = 0
    }
    this.n = 0
    this.ask(now)
  }

  private ask(now: number) {
    this.phase = 'question'
    this.started = now
    this.answers.clear()
    this.gained = {}
    const order = [0, 1, 2, 3]
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1))
      ;[order[i], order[j]] = [order[j] as number, order[i] as number]
    }
    this.order = order
  }

  /**
   * Records a player's pick (a position in the shown order). `elapsedMs` is the player's own
   * measure; it is trusted only within LAG_MS of when the referee received it.
   */
  answer(id: string, n: number, choice: number, elapsedMs: number, now: number): boolean {
    if (
      this.phase !== 'question' ||
      n !== this.n ||
      !this.players.has(id) ||
      this.answers.has(id) ||
      !Number.isInteger(choice) ||
      choice < 0 ||
      choice >= this.order.length ||
      !Number.isFinite(elapsedMs)
    ) {
      return false
    }
    const seen = now - this.started
    const elapsed = Math.max(0, seen - LAG_MS, Math.min(seen, elapsedMs))
    this.answers.set(id, { choice, elapsed })
    return true
  }

  /** Ends the reveal early (solo players can skip ahead). */
  advance(now: number): boolean {
    if (this.phase !== 'reveal') return false
    this.revealed = now - REVEAL_MS
    return this.update(now)
  }

  /** Advances on timeouts. Returns true when the phase changed. */
  update(now: number): boolean {
    if (this.phase === 'question') {
      const waiting = [...this.players.values()].some((p) => p.online && !this.answers.has(p.id))
      if (!waiting || now - this.started >= ANSWER_MS + GRACE_MS) {
        this.reveal(now)
        return true
      }
    } else if (this.phase === 'reveal' && now - this.revealed >= REVEAL_MS) {
      this.n += 1
      if (this.n >= this.picks.length) this.phase = 'final'
      else this.ask(now)
      return true
    }
    return false
  }

  private reveal(now: number) {
    this.phase = 'reveal'
    this.revealed = now
    const correct = this.order.indexOf(0)
    for (const [id, { choice, elapsed }] of this.answers) {
      const player = this.players.get(id)
      if (!player) continue
      const read = readingMs(this.bank[this.picks[this.n] ?? 0]?.q ?? '')
      const gain = choice === correct ? points(elapsed, read) : 0
      this.gained[id] = gain
      player.score += gain
      if (gain) player.right += 1
    }
  }

  snapshot(now = this.started): Snapshot {
    const players = [...this.players.values()].map((p) => ({ ...p }))
    const base = {
      n: this.n,
      total: this.picks.length,
      q: this.picks[this.n] ?? 0,
      order: this.order,
    }
    switch (this.phase) {
      case 'lobby':
        return { phase: 'lobby', players }
      case 'question':
        return {
          phase: 'question',
          ...base,
          elapsed: Math.max(0, now - this.started),
          answered: [...this.answers.keys()],
          players,
        }
      case 'reveal':
        return {
          phase: 'reveal',
          ...base,
          correct: this.order.indexOf(0),
          picks: Object.fromEntries([...this.answers].map(([id, a]) => [id, a.choice])),
          gained: { ...this.gained },
          players,
        }
      case 'final':
        return { phase: 'final', players: players.sort((a, b) => b.score - a.score) }
    }
  }
}
