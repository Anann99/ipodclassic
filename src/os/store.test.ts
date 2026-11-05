import { afterEach, describe, expect, it, vi } from 'vitest'

const backing = new Map<string, string>()
let refuse = false
vi.stubGlobal('localStorage', {
  getItem: (k: string) => backing.get(k) ?? null,
  setItem: (k: string, v: string) => {
    if (refuse) throw new Error('QuotaExceededError')
    backing.set(k, v)
  },
})
const { load, save } = await import('./store.ts')

afterEach(() => {
  refuse = false
  backing.clear()
})

describe('store', () => {
  it('reads what another tab wrote', () => {
    save('x', 1)
    backing.set('wheel:x', '2')
    expect(load('x', 0)).toBe(2)
  })

  it('keeps a write that storage refused', () => {
    save('best', 40)
    refuse = true
    save('best', 120)
    expect(load('best', 0)).toBe(120)
  })

  it('falls back when nothing is stored or it is unreadable', () => {
    expect(load('missing', 'none')).toBe('none')
    backing.set('wheel:bad', '{')
    expect(load('bad', 7)).toBe(7)
  })
})
