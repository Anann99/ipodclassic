// Draws quiz screens as DOM inside the 320x240 stage. Pure rendering: no state lives here.

import type { Letters } from '../../os/letters.ts'

export type Standing = { id: string; name: string; score: number; right: number }

export type Screen =
  | { kind: 'spell'; title: string; letters: Letters }
  | { kind: 'note'; text: string; busy?: boolean }
  | {
      kind: 'lobby'
      code?: string
      names: string[]
      actions: string[]
      selected: number
    }
  | {
      kind: 'question'
      n: number
      total: number
      text: string
      answers: string[]
      selected: number
      picked?: number
      score: number
      /** Milliseconds left on the clock when this screen was drawn. */
      left: number
      paused: boolean
    }
  | {
      kind: 'reveal'
      n: number
      total: number
      text: string
      answers: string[]
      correct: number
      picked?: number
      gained: number
      score: number
    }
  | { kind: 'final'; standings: Standing[]; me: string; solo: boolean; best: number; total: number }

const make = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') => {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text) node.textContent = text
  return node
}

/** The in-game title bar: a centered title, or a count on the left and score on the right. */
function bar(left: string, right?: string, gained = 0) {
  const node = make('header', 'bar')
  if (right === undefined) {
    node.classList.add('single')
    node.append(make('span', '', left))
    return node
  }
  node.append(make('span', '', left))
  const score = make('span', 'score', right)
  if (gained > 0) {
    const plus = make('span', 'gain', `+${gained}`)
    score.prepend(plus)
  }
  node.append(score)
  return node
}

function rows(
  items: string[],
  mark: (i: number) => string,
  glyph: (i: number) => string = () => '',
) {
  const list = make('ul', 'rows')
  list.setAttribute('role', 'listbox')
  items.forEach((text, i) => {
    const li = make('li', mark(i))
    li.setAttribute('role', 'option')
    li.setAttribute('aria-selected', String(/\b(on|right)\b/.test(li.className)))
    li.append(make('span', '', text))
    const g = glyph(i)
    if (g) li.append(make('span', 'glyph', g))
    list.append(li)
  })
  return list
}

export class QuizView {
  readonly el = make('div', 'quiz')
  private timer: Animation | undefined

  render(s: Screen): void {
    this.timer?.cancel()
    this.timer = undefined
    const parts: HTMLElement[] = []
    switch (s.kind) {
      case 'spell': {
        parts.push(bar(s.title), make('div', 'middle'))
        parts[1]?.append(s.letters.el)
        break
      }
      case 'note': {
        const middle = make('div', 'middle note', s.text)
        if (s.busy) middle.classList.add('busy')
        parts.push(bar('Quiz'), middle)
        break
      }
      case 'lobby': {
        const middle = make('div', 'middle lobby')
        if (s.code) middle.append(make('div', 'code', s.code))
        const names = make('div', 'names')
        names.append(...s.names.map((name) => make('span', '', name)))
        middle.append(names)
        if (!s.actions.length) middle.append(make('div', 'pulse'))
        parts.push(bar('Quiz'), middle)
        if (s.actions.length) parts.push(rows(s.actions, (i) => (i === s.selected ? 'on' : '')))
        break
      }
      case 'question':
      case 'reveal': {
        parts.push(
          bar(`${s.n + 1}/${s.total}`, String(s.score), s.kind === 'reveal' ? s.gained : 0),
        )
        const track = make('div', 'track')
        const fill = make('div', 'fill')
        track.append(fill)
        parts.push(track)
        const ask = make('div', 'ask', s.text)
        if (s.text.length > 64) ask.classList.add('small')
        parts.push(ask)
        if (s.kind === 'question') {
          const share = Math.max(0, s.left) / 15_000
          fill.style.transform = `scaleX(${share})`
          if (s.picked === undefined && s.left > 0) {
            this.timer = fill.animate(
              [{ transform: `scaleX(${share})` }, { transform: 'scaleX(0)' }],
              {
                duration: s.left,
                fill: 'forwards',
              },
            )
            if (s.paused) this.timer.pause()
          }
          parts.push(
            rows(s.answers, (i) => {
              if (s.picked !== undefined) return i === s.picked ? 'on' : 'dim'
              return i === s.selected ? 'on' : ''
            }),
          )
        } else {
          fill.style.transform = 'scaleX(0)'
          parts.push(
            rows(
              s.answers,
              (i) => (i === s.correct ? 'right' : i === s.picked ? 'wrong' : 'dim'),
              (i) => (i === s.correct ? '✓' : i === s.picked ? '✗' : ''),
            ),
          )
        }
        break
      }
      case 'final': {
        if (s.solo) {
          const me = s.standings[0]
          const middle = make('div', 'middle final')
          middle.append(make('div', 'big', String(me?.score ?? 0)))
          middle.append(make('div', 'sub', `${me?.right ?? 0}/${s.total}`))
          const isBest = (me?.score ?? 0) >= s.best && (me?.score ?? 0) > 0
          middle.append(make('div', isBest ? 'sub best' : 'sub', `★ ${s.best}`))
          parts.push(bar('Quiz'), middle)
        } else {
          parts.push(bar('Quiz'))
          const list = make('ul', 'rows standings')
          // Eight rows fit: the leaders, and always this player.
          const mine = s.standings.findIndex((p) => p.id === s.me)
          const shown = s.standings
            .map((p, i) => ({ p, i }))
            .filter(({ i }) => i < 7 || i === mine || (mine < 7 && i === 7))
          shown.forEach(({ p, i }) => {
            const li = make('li', p.id === s.me ? 'on' : '')
            li.append(make('span', 'rank', String(i + 1)), make('span', '', p.name))
            li.append(make('span', 'value', String(p.score)))
            list.append(li)
          })
          parts.push(list)
        }
        break
      }
    }
    this.el.replaceChildren(...parts)
  }

  pauseTimer(paused: boolean): void {
    if (paused) this.timer?.pause()
    else this.timer?.play()
  }
}
