// Hosts a running game session: full screen, with a pause menu on the Menu button.

import type { Input } from '../device/wheel.ts'
import type { Game, Mode, Session } from '../games/types.ts'
import { Menu } from './menu.ts'
import type { Nav, View } from './nav.ts'
import { load, save } from './store.ts'

let wakeLock: { release(): Promise<void> } | undefined

async function stayAwake(on: boolean) {
  try {
    if (on && !wakeLock) wakeLock = await navigator.wakeLock?.request('screen')
    if (!on && wakeLock) {
      const lock = wakeLock
      wakeLock = undefined
      await lock.release()
    }
  } catch {}
}

export function play(nav: Nav, game: Game, mode: Mode): void {
  const view = new Play(nav, game, mode)
  nav.push(view)
}

class Play implements View {
  readonly el = document.createElement('div')
  private session: Session
  private paused = false
  private readonly onVisibility = () => {
    if (document.hidden) this.pause()
    else if (!this.paused) stayAwake(true)
  }

  private readonly nav: Nav
  private readonly game: Game
  private readonly mode: Mode

  constructor(nav: Nav, game: Game, mode: Mode) {
    this.nav = nav
    this.game = game
    this.mode = mode
    this.el.className = 'play'
    this.session = this.start()
    document.addEventListener('visibilitychange', this.onVisibility)
  }

  private start(): Session {
    this.el.replaceChildren()
    const prefix = `${this.game.id}:`
    return this.mode.start({
      root: this.el,
      load: (key, fallback) => load(prefix + key, fallback),
      save: (key, value) => save(prefix + key, value),
      exit: () => this.nav.close(this),
    })
  }

  input(e: Input): boolean {
    if (e.type === 'press' && e.button === 'menu') {
      if (!this.session.menu?.()) this.pause()
      return true
    }
    if (!this.paused) this.session.input(e)
    return true
  }

  shown(): void {
    stayAwake(true)
    if (this.paused) {
      this.paused = false
      this.session.resume()
    }
  }

  hidden(): void {
    stayAwake(false)
  }

  destroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.session.destroy()
    stayAwake(false)
  }

  private pause() {
    if (this.nav.top !== this) return
    if (!this.mode.live) {
      this.paused = true
      this.session.pause()
    }
    const quit = () => this.nav.close(this)
    const items = [{ label: 'Resume', select: () => this.nav.pop() }]
    if (!this.mode.live) {
      items.push({
        label: 'Restart',
        select: () => {
          this.session.destroy()
          this.session = this.start()
          this.nav.pop()
        },
      })
    }
    items.push({ label: 'Quit', select: quit })
    this.nav.push(new Menu(this.game.title, items))
  }
}
