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

const SLIDE_MS = 240
const EASE = 'cubic-bezier(0.25, 0.8, 0.3, 1)'

export class Nav {
  private stack: View[] = []
  private readonly title: HTMLElement
  private readonly layers: HTMLElement

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
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches || !from
    // Full-screen views slide over the title bar, so it keeps its text beneath them.
    if (to?.title !== undefined) this.setTitle(to.title, still ? 0 : dir)
    if (to) to.el.hidden = false
    const finish = () => {
      if (from && from !== this.top) from.el.hidden = true
      done?.()
      to?.shown?.()
    }
    if (still || !from || !to) return finish()
    const options = { duration: SLIDE_MS, easing: EASE }
    from.el.animate([{ transform: 'none' }, { transform: `translateX(${-dir * 100}%)` }], options)
    to.el
      .animate([{ transform: `translateX(${dir * 100}%)` }, { transform: 'none' }], options)
      .finished.then(finish, finish)
  }

  private setTitle(text: string, dir: number) {
    const old = this.title.lastElementChild
    if (old?.textContent === text) return
    const next = document.createElement('span')
    next.textContent = text
    this.title.append(next)
    if (!old) return
    if (!dir) return old.remove()
    const options = { duration: SLIDE_MS, easing: EASE }
    old
      .animate([{ opacity: 1 }, { opacity: 0, transform: `translateX(${-dir * 24}px)` }], options)
      .finished.then(
        () => old.remove(),
        () => old.remove(),
      )
    next.animate([{ opacity: 0, transform: `translateX(${dir * 24}px)` }, { opacity: 1 }], options)
  }
}
