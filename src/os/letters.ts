// Spelling with a wheel: turn to pick a letter, center to place it, Menu to take one back.

import { click } from '../device/feedback.ts'
import type { Input } from '../device/wheel.ts'
import type { View } from './nav.ts'

const DONE = '✓'

export class Letters {
  readonly el = document.createElement('div')
  value: string
  private readonly alphabet: string[]
  private readonly length: number
  private readonly finish: boolean
  private candidate = 0

  /** With `finish`, a check mark after the last letter ends early (names); else it fills up (codes). */
  constructor(alphabet: string, length: number, value = '', finish = false) {
    this.alphabet = [...alphabet, ...(finish ? [DONE] : [])]
    this.length = length
    this.finish = finish
    this.value = value
    this.el.className = 'letters'
    this.render()
  }

  /** Returns 'done' when the word is complete, 'empty' when Menu is pressed with nothing left. */
  input(e: Input): 'done' | 'empty' | undefined {
    if (e.type === 'tick') {
      const n = this.alphabet.length
      this.candidate = (this.candidate + e.dir + n) % n
      click()
    } else if (e.type === 'press' && e.button === 'select') {
      const letter = this.alphabet[this.candidate] as string
      if (letter === DONE) return this.value ? 'done' : undefined
      this.value += letter
      if (this.value.length >= this.length) {
        this.render()
        return 'done'
      }
    } else if (e.type === 'press' && e.button === 'menu') {
      if (!this.value) return 'empty'
      this.value = this.value.slice(0, -1)
    }
    this.render()
    return undefined
  }

  /** Shake and clear, for a code that did not work. */
  reject(): void {
    this.value = ''
    this.render()
    this.el.animate(
      [0, -6, 6, -4, 4, 0].map((x) => ({ transform: `translateX(${x}px)` })),
      { duration: 320 },
    )
  }

  private render() {
    // Codes show every slot; names grow one slot at a time.
    const count = this.finish ? Math.min(this.length, this.value.length + 1) : this.length
    const slots: HTMLElement[] = []
    for (let i = 0; i < count; i++) {
      const slot = document.createElement('span')
      slot.className = 'slot'
      if (i < this.value.length) slot.textContent = this.value[i] as string
      else if (i === this.value.length) {
        slot.classList.add('on')
        slot.textContent = this.alphabet[this.candidate] as string
      }
      slots.push(slot)
    }
    this.el.replaceChildren(...slots)
    this.el.classList.toggle('long', this.length > 6)
  }
}

/** A titled screen that edits one word, then calls `done` with it. */
export function lettersView(
  title: string,
  letters: Letters,
  done: (value: string) => void,
  cancel: () => void,
): View {
  const el = document.createElement('div')
  el.className = 'spell'
  el.append(letters.el)
  return {
    el,
    title,
    input(e) {
      const result = letters.input(e)
      if (result === 'done') done(letters.value)
      if (result === 'empty') cancel()
      return true
    },
  }
}
