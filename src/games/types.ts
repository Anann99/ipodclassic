// The contract between the device and a game. To add a game: make a folder in src/games,
// export a `Game`, and list it in src/games/index.ts.

import type { Input } from '../device/wheel.ts'
import type { Art } from '../os/menu.ts'

export type { Art, Input }

export interface GameContext {
  /** The full 320x240 screen. Draw into it with `canvas2d` or plain DOM. */
  readonly root: HTMLElement
  /** Reads a value this game saved earlier, such as a best score. */
  load<T>(key: string, fallback: T): T
  save(key: string, value: unknown): void
  /** Ends the session and returns to the menu. */
  exit(): void
}

export interface Session {
  /** Wheel input. Menu presses go to `menu` instead. */
  input(e: Input): void
  /** Return true to handle the Menu button yourself; otherwise it opens the pause menu. */
  menu?(): boolean
  pause(): void
  resume(): void
  destroy(): void
}

export interface Mode {
  label: string
  start(ctx: GameContext): Session
  /** Live sessions (multiplayer) keep running under the pause menu and cannot restart. */
  live?: boolean
}

export interface Game {
  id: string
  title: string
  /** Animated preview shown beside the home menu. */
  art: Art
  /** One mode starts straight away; several open a menu of modes first. */
  modes: Mode[]
}
