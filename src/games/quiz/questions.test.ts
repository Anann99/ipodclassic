import { expect, it } from 'vitest'
import { questions } from './questions.ts'

it('every question fits the screen and has four distinct answers', () => {
  for (const { q, a } of questions) {
    expect(q.length, q).toBeLessThanOrEqual(100)
    expect(new Set(a).size, q).toBe(4)
    for (const answer of a) expect(answer.length, `${q}: ${answer}`).toBeLessThanOrEqual(24)
  }
})

it('has no repeated questions', () => {
  const seen = new Set(questions.map((x) => x.q.toLowerCase()))
  expect(seen.size).toBe(questions.length)
})

it('has enough of each difficulty for many games', () => {
  for (const d of [1, 2, 3]) {
    expect(questions.filter((x) => x.d === d).length).toBeGreaterThanOrEqual(40)
  }
})
