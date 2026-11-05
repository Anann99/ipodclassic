// The screen's view stack. Menu goes back one level, like the original.

import type { Input } from '../device/wheel.ts'

export interface View {
  readonly el: HTMLElement
  /** Shown in the title bar. Views without a title take the whole screen. */
  readonly title?: string
  /** Return true when the input was handled, so Menu does not also go back. */
  input(e: Input): boolean | undefined
  /** Called when the view becomes the visible top of the stack. */
  shown?(): void
  /** Called when the view is covered or removed. */
  hidden?(): void
  destroy?(): void
}

const PUSH_MS = 240
const POP_MS = 200
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

/** Says something to screen readers through the page's one live region. */
export function announce(text: string): void {
  const region = document.querySelector('.sr')
  if (region) region.textContent = text
}

export class Nav {
  private stack: View[] = []
  private readonly title: HTMLElement
  private readonly layers: HTMLElement
  /** Slides in flight. A new push or pop snaps them to their end first. */
  private running: Animation[] = []

  constructor(screen: HTMLElement) {
    this.title = screen.querySelector('.title') as HTMLElement
    this.layers = screen.querySelector('.layers') as HTMLElement
  }

  get top(): View | undefined {
    return this.stack.at(-1)
  }

  get depth(): number {
    return this.stack.length
  }

  push(view: View): void {
    const from = this.top
    this.stack.push(view)
    view.el.classList.add('view')
    view.el.classList.toggle('full', !view.title)
    this.layers.append(view.el)
    from?.hidden?.()
    this.transition(from, view, 1)
  }

  /** Removes the top view. The root view always stays. */
  pop(): void {
    if (this.stack.length < 2) return
    const from = this.stack.pop() as View
    from.hidden?.()
    this.transition(from, this.top, -1, () => {
      from.destroy?.()
      from.el.remove()
    })
  }

  /** Pops views until `view` is on top, animating only the last step. */
  popTo(view: View): void {
    const i = this.stack.indexOf(view)
    if (i < 0 || i === this.stack.length - 1) return
    for (const removed of this.stack.splice(i + 1, this.stack.length - i - 2)) {
      removed.destroy?.()
      removed.el.remove()
    }
    this.pop()
  }

  /** Removes `view` and everything above it, animating once. */
  close(view: View): void {
    const i = this.stack.indexOf(view)
    const below = this.stack[i - 1]
    if (i > 0 && below) this.popTo(below)
  }

  input(e: Input): void {
    const top = this.top
    if (!top) return
    if (top.input(e)) return
    if (e.type === 'press' && e.button === 'menu') this.pop()
  }

  private transition(from: View | undefined, to: View | undefined, dir: 1 | -1, done?: () => void) {
    for (const animation of this.running.splice(0)) animation.finish()
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches || !from
    const duration = still ? 0 : dir > 0 ? PUSH_MS : POP_MS
    // Full-screen views slide over the title bar, so it keeps its text beneath them.
    if (to?.title !== undefined) {
      this.setTitle(to.title, duration)
      announce(to.title)
    }
    if (to) to.el.hidden = false
    const finish = () => {
      if (from && from !== this.top) from.el.hidden = true
      done?.()
      if (to && to === this.top) to.shown?.()
    }
    if (!duration || !from || !to) return finish()
    const options = { duration, easing: EASE }
    const out = from.el.animate(
      [{ transform: 'none' }, { transform: `translateX(${-dir * 100}%)` }],
      options,
    )
    const into = to.el.animate(
      [{ transform: `translateX(${dir * 100}%)` }, { transform: 'none' }],
      options,
    )
    this.running.push(out, into)
    into.finished.then(finish, finish)
  }

  private setTitle(text: string, duration: number) {
    const old = this.title.lastElementChild
    if (old?.textContent === text) return
    const next = document.createElement('span')
    next.textContent = text
    this.title.append(next)
    if (!old) return
    if (!duration) return old.remove()
    const options = { duration, easing: EASE }
    const fade = old.animate([{ opacity: 1 }, { opacity: 0 }], options)
    fade.finished.then(
      () => old.remove(),
      () => old.remove(),
    )
    this.running.push(fade, next.animate([{ opacity: 0 }, { opacity: 1 }], options))
  }
}
