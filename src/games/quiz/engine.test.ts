import { describe, expect, it } from 'vitest'
import {
  ANSWER_MS,
  GRACE_MS,
  LAG_MS,
  points,
  type Question,
  QuizEngine,
  REVEAL_MS,
  readingMs,
} from './engine.ts'

const bank: Question[] = Array.from({ length: 30 }, (_, i) => ({
  q: `Question ${i}`,
  a: [`right ${i}`, 'w1', 'w2', 'w3'],
  c: 'test',
  d: ((i % 3) + 1) as 1 | 2 | 3,
}))

function started(...ids: string[]) {
  const quiz = new QuizEngine(bank, 9)
  for (const id of ids) quiz.join(id, id.toUpperCase())
  quiz.start(0)
  return quiz
}

const correctChoice = (quiz: QuizEngine) => {
  const s = quiz.snapshot()
  if (s.phase !== 'question') throw new Error(`not a question: ${s.phase}`)
  return s.order.indexOf(0)
}

describe('points', () => {
  it('gives full marks instantly and half at the buzzer', () => {
    expect(points(0)).toBe(1000)
    expect(points(ANSWER_MS)).toBe(500)
    expect(points(ANSWER_MS * 3)).toBe(500)
  })

  it('gives full marks while the question is being read', () => {
    expect(points(2000, 3000)).toBe(1000)
    expect(points(3000, 3000)).toBe(1000)
    expect(points(ANSWER_MS, 3000)).toBe(500)
    expect(readingMs('Short?')).toBe(1500)
    expect(readingMs('word '.repeat(40))).toBe(4000)
  })
})

describe('QuizEngine', () => {
  it('scores a fast correct answer and moves on after the reveal', () => {
    const quiz = started('a')
    expect(quiz.answer('a', 0, correctChoice(quiz), 0, 0)).toBe(true)
    expect(quiz.update(10)).toBe(true)
    const reveal = quiz.snapshot()
    expect(reveal.phase).toBe('reveal')
    if (reveal.phase === 'reveal') expect(reveal.gained.a).toBe(1000)
    expect(quiz.update(10 + REVEAL_MS)).toBe(true)
    const next = quiz.snapshot()
    expect(next.phase === 'question' && next.n).toBe(1)
  })

  it('gives nothing for a wrong answer', () => {
    const quiz = started('a')
    quiz.answer('a', 0, (correctChoice(quiz) + 1) % 4, 0, 0)
    quiz.update(1)
    const s = quiz.snapshot()
    if (s.phase !== 'reveal') throw new Error('expected reveal')
    expect(s.gained.a).toBe(0)
    expect(s.players[0]?.score).toBe(0)
  })

  it('waits for every online player, but not for offline ones', () => {
    const quiz = started('a', 'b')
    quiz.answer('a', 0, 0, 100, 100)
    expect(quiz.update(200)).toBe(false)
    quiz.setOnline('b', false)
    expect(quiz.update(300)).toBe(true)
  })

  it('closes a question after the time limit plus grace', () => {
    const quiz = started('a')
    expect(quiz.update(ANSWER_MS + GRACE_MS - 1)).toBe(false)
    expect(quiz.update(ANSWER_MS + GRACE_MS)).toBe(true)
    expect(quiz.answer('a', 0, 0, 0, 0)).toBe(false)
  })

  it('does not believe a claimed answer time far below when it arrived', () => {
    const quiz = started('a')
    quiz.answer('a', 0, correctChoice(quiz), 0, 12_000)
    quiz.update(12_001)
    const s = quiz.snapshot()
    if (s.phase !== 'reveal') throw new Error('expected reveal')
    expect(s.gained.a).toBe(points(12_000 - LAG_MS, readingMs(bank[s.q]?.q ?? '')))
  })

  it('rejects answers that are not a real pick or time', () => {
    const quiz = started('a')
    expect(quiz.answer('a', 0, 4, 100, 100)).toBe(false)
    expect(quiz.answer('a', 0, 1.5, 100, 100)).toBe(false)
    expect(quiz.answer('a', 0, 1, Number.NaN, 100)).toBe(false)
    expect(quiz.answer('a', 0, 1, 100, 100)).toBe(true)
  })

  it('tells late joiners how long the question has been open', () => {
    const quiz = started('a')
    const s = quiz.snapshot(8000)
    expect(s.phase === 'question' && s.elapsed).toBe(8000)
  })

  it('accepts one answer per player per question', () => {
    const quiz = started('a', 'b')
    expect(quiz.answer('a', 0, 1, 10, 10)).toBe(true)
    expect(quiz.answer('a', 0, 2, 20, 20)).toBe(false)
    expect(quiz.answer('a', 3, 2, 20, 20)).toBe(false)
    expect(quiz.answer('ghost', 0, 1, 10, 10)).toBe(false)
  })

  it('plays ten distinct questions, easy ones first, then ranks players', () => {
    const quiz = started('a', 'b')
    const seen = new Set<number>()
    let now = 0
    for (let i = 0; i < 10; i++) {
      const s = quiz.snapshot()
      if (s.phase !== 'question') throw new Error('expected question')
      seen.add(s.q)
      if (i < 4) expect(bank[s.q]?.d).toBe(1)
      quiz.answer('b', i, correctChoice(quiz), 1000, 1000)
      quiz.answer('a', i, (correctChoice(quiz) + 1) % 4, 1000, 1000)
      now += 1000
      quiz.update(now)
      now += REVEAL_MS
      quiz.update(now)
    }
    expect(seen.size).toBe(10)
    const final = quiz.snapshot()
    expect(final.phase).toBe('final')
    if (final.phase === 'final') expect(final.players.map((p) => p.id)).toEqual(['b', 'a'])
  })

  it('keeps a rejoining player and their score', () => {
    const quiz = started('a')
    quiz.answer('a', 0, correctChoice(quiz), 0, 0)
    quiz.update(1)
    quiz.setOnline('a', false)
    quiz.join('a', 'A')
    const s = quiz.snapshot()
    expect(s.players).toHaveLength(1)
    expect(s.players[0]).toMatchObject({ name: 'A', score: 1000, online: true })
  })

  it('forgets players who left before a new game starts', () => {
    const quiz = new QuizEngine(bank, 3)
    quiz.join('a', 'A')
    quiz.join('b', 'B')
    quiz.setOnline('b', false)
    quiz.start(0)
    expect(quiz.snapshot().players.map((p) => p.id)).toEqual(['a'])
  })

  it('tells players with the same name apart', () => {
    const quiz = new QuizEngine(bank, 1)
    quiz.join('a', 'Echo')
    quiz.join('b', 'Echo')
    quiz.join('c', 'Echo')
    expect(quiz.snapshot().players.map((p) => p.name)).toEqual(['Echo', 'Echo 2', 'Echo 3'])
  })
})
