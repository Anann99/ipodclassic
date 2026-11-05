// The list menu: the heart of the interface. Turn to move, center to choose.

import { click } from '../device/feedback.ts'
import type { Input } from '../device/wheel.ts'
import { canvas2d, loop } from './canvas.ts'
import { announce, type View } from './nav.ts'

/** Draws a preview into the right half of a split menu, in logical pixels. */
export type Art = (
  ctx: CanvasRenderingContext2D,
  time: number,
  width: number,
  height: number,
) => void

export type MenuItem = {
  label: string
  /** Current value, shown at the right edge (settings). */
  value?: () => string
  /** Shows a chevron: choosing this opens another menu. */
  more?: boolean
  select?: () => void
  art?: Art
}

/** Row height on the 320x240 screen. Eight rows fit under the title bar. */
const ROW = 27
const ROWS = 8
const FADE_MS = 160

let ids = 0

export class Menu implements View {
  readonly el = document.createElement('div')
  readonly title: string
  private items: MenuItem[]
  private index = 0
  private scroll = 0
  private readonly list = document.createElement('ul')
  private readonly thumb = document.createElement('div')
  private readonly art?: {
    draw: ReturnType<typeof loop>
    dispose: () => void
  }

  constructor(title: string, items: MenuItem[], options: { split?: boolean } = {}) {
    this.title = title
    this.items = items
    this.el.className = 'menu'
    this.list.className = 'rows'
    this.list.setAttribute('role', 'listbox')
    this.list.setAttribute('aria-label', title)
    const scrollbar = document.createElement('div')
    scrollbar.className = 'scrollbar'
    this.thumb.className = 'thumb'
    scrollbar.append(this.thumb)
    this.el.append(this.list, scrollbar)
    if (options.split) {
      this.el.classList.add('split')
      const pane = document.createElement('div')
      pane.className = 'pane'
      this.el.append(pane)
      const { ctx, width, height, dispose } = canvas2d(pane, 160, 218)
      let shownIndex = this.index
      let previous: Art | undefined
      let changed = -Infinity
      const start = performance.now()
      const draw = loop(
        () => {},
        () => {
          const now = performance.now()
          if (shownIndex !== this.index) {
            previous = this.items[shownIndex]?.art
            shownIndex = this.index
            changed = now
          }
          const t = (now - start) / 1000
          ctx.clearRect(0, 0, width, height)
          ctx.save()
          this.items[this.index]?.art?.(ctx, t, width, height)
          ctx.restore()
          const fade = 1 - (now - changed) / FADE_MS
          if (previous && fade > 0) {
            ctx.save()
            ctx.globalAlpha = fade
            previous(ctx, t, width, height)
            ctx.restore()
          }
        },
        30,
      )
      this.art = { draw, dispose }
    }
    this.render()
  }

  /** Replaces the items, keeping the highlight where it was when possible. */
  setItems(items: MenuItem[]): void {
    this.items = items
    this.index = Math.min(this.index, items.length - 1)
    this.render()
  }

  get selected(): number {
    return this.index
  }

  input(e: Input): boolean {
    if (e.type === 'tick') {
      const next = Math.max(0, Math.min(this.items.length - 1, this.index + e.dir))
      if (next !== this.index) {
        this.index = next
        click()
        this.update()
        announce(this.items[next]?.label ?? '')
      }
      return true
    }
    if (e.type === 'press' && e.button === 'select') {
      this.items[this.index]?.select?.()
      this.update()
      return true
    }
    return false
  }

  shown(): void {
    this.update()
    this.art?.draw.start()
  }

  hidden(): void {
    this.art?.draw.stop()
  }

  destroy(): void {
    this.art?.draw.stop()
    this.art?.dispose()
  }

  private render() {
    this.list.replaceChildren(
      ...this.items.map((item) => {
        const li = document.createElement('li')
        li.id = `item-${++ids}`
        li.setAttribute('role', 'option')
        const label = document.createElement('span')
        label.textContent = item.label
        li.append(label)
        if (item.value)
          li.append(Object.assign(document.createElement('span'), { className: 'value' }))
        if (item.more) li.classList.add('more')
        return li
      }),
    )
    this.update()
  }

  private update() {
    if (this.index < this.scroll) this.scroll = this.index
    if (this.index >= this.scroll + ROWS) this.scroll = this.index - ROWS + 1
    this.items.forEach((item, i) => {
      const li = this.list.children[i] as HTMLElement
      const on = i === this.index
      li.classList.toggle('on', on)
      li.setAttribute('aria-selected', String(on))
      if (on) this.list.setAttribute('aria-activedescendant', li.id)
      const value = li.querySelector('.value')
      if (value && item.value) value.textContent = item.value()
    })
    this.list.style.transform = `translateY(${-this.scroll * ROW}px)`
    const overflow = this.items.length > ROWS
    this.el.classList.toggle('overflow', overflow)
    if (overflow) {
      this.thumb.style.height = `${(ROWS / this.items.length) * 100}%`
      this.thumb.style.top = `${(this.scroll / this.items.length) * 100}%`
    }
  }
}
