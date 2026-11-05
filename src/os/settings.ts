import { load, save } from './store.ts'

export type Finish = 'auto' | 'silver' | 'graphite'

export type Settings = {
  clicker: boolean
  haptics: boolean
  finish: Finish
  name: string
}

const defaults: Settings = { clicker: true, haptics: true, finish: 'auto', name: '' }
let current: Settings = { ...defaults, ...load<Partial<Settings>>('settings', {}) }
const listeners = new Set<(s: Settings) => void>()

export const settings = {
  get: (): Readonly<Settings> => current,
  set(patch: Partial<Settings>) {
    // Merge into what is stored now, so another tab's changes are not written over.
    current = { ...defaults, ...load<Partial<Settings>>('settings', {}), ...patch }
    save('settings', current)
    for (const listener of listeners) listener(current)
  },
  /** Calls the listener now and on every change. Returns an unsubscribe function. */
  watch(listener: (s: Settings) => void) {
    listeners.add(listener)
    listener(current)
    return () => listeners.delete(listener)
  },
}

const NAMES = [
  'Comet',
  'Pixel',
  'Mango',
  'Nova',
  'Echo',
  'Kiwi',
  'Juno',
  'Pebble',
  'Rocket',
  'Maple',
  'Opal',
  'Tango',
  'Luna',
  'Ziggy',
  'Biscuit',
  'Clover',
  'Disco',
  'Fable',
  'Gizmo',
  'Hazel',
]

/** The name other players see. A friendly one is picked the first time. */
export function playerName(): string {
  let { name } = settings.get()
  if (!name) {
    name = NAMES[Math.floor(Math.random() * NAMES.length)] as string
    settings.set({ name })
  }
  return name
}
