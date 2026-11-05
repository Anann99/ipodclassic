import './style.css'
import { bindControls } from './device/controls.ts'
import { games } from './games/index.ts'
import { joinMode, quiz } from './games/quiz/index.ts'
import type { Game } from './games/types.ts'
import { CODE_LENGTH, CODE_LETTERS } from './net/protocol.ts'
import { Letters, lettersView } from './os/letters.ts'
import { type Art, Menu, type MenuItem } from './os/menu.ts'
import { Nav } from './os/nav.ts'
import { play } from './os/play.ts'
import { type Finish, playerName, settings } from './os/settings.ts'

export const NAME = 'Classic'

const root = document.documentElement
const screen = document.querySelector('.screen') as HTMLElement
const stage = document.querySelector('.stage') as HTMLElement
const wheel = document.querySelector('.wheel') as HTMLElement

// Zoom the 320x240 stage to fill the panel at any size.
new ResizeObserver(([entry]) => {
  if (entry) stage.style.setProperty('--zoom', String(entry.contentRect.width / 320))
}).observe(screen)

// Finish: Auto follows the system appearance.
const dark = matchMedia('(prefers-color-scheme: dark)')
const applyFinish = () => {
  const { finish } = settings.get()
  const resolved = finish === 'auto' ? (dark.matches ? 'graphite' : 'silver') : finish
  root.dataset.finish = resolved
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', getComputedStyle(root).getPropertyValue('--face-1').trim())
}
settings.watch(applyFinish)
dark.addEventListener('change', applyFinish)

const nav = new Nav(stage)

function gameItem(game: Game): MenuItem {
  const [only] = game.modes
  return {
    label: game.title,
    art: game.art,
    more: game.modes.length > 1,
    select: () => {
      if (game.modes.length === 1 && only) return play(nav, game, only)
      nav.push(
        new Menu(
          game.title,
          game.modes.map((mode) => ({ label: mode.label, select: () => play(nav, game, mode) })),
        ),
      )
    },
  }
}

const FINISHES: Record<Finish, string> = { auto: 'Auto', silver: 'Silver', graphite: 'Graphite' }
const canVibrate = typeof navigator.vibrate === 'function' || 'switch' in HTMLInputElement.prototype

function settingsMenu(): Menu {
  const s = settings.get
  const items: MenuItem[] = [
    {
      label: 'Clicker',
      value: () => (s().clicker ? 'On' : 'Off'),
      select: () => settings.set({ clicker: !s().clicker }),
    },
  ]
  if (canVibrate && matchMedia('(pointer: coarse)').matches) {
    items.push({
      label: 'Haptics',
      value: () => (s().haptics ? 'On' : 'Off'),
      select: () => settings.set({ haptics: !s().haptics }),
    })
  }
  items.push({
    label: 'Name',
    value: playerName,
    more: true,
    select: () =>
      nav.push(
        lettersView(
          'Name',
          new Letters('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10, '', true),
          (value) => {
            settings.set({ name: value.charAt(0) + value.slice(1).toLowerCase() })
            nav.pop()
          },
          () => nav.pop(),
        ),
      ),
  })
  items.push({
    label: 'Finish',
    value: () => FINISHES[s().finish],
    select: () => {
      const order = Object.keys(FINISHES) as Finish[]
      settings.set({ finish: order[(order.indexOf(s().finish) + 1) % order.length] })
    },
  })
  return new Menu('Settings', items)
}

/** Settings preview: three sliders. */
const settingsArt: Art = (ctx, t, w, h) => {
  const ink = getComputedStyle(root).getPropertyValue('--dim')
  ctx.strokeStyle = ink
  ctx.fillStyle = ink
  ctx.lineCap = 'round'
  ctx.lineWidth = 3
  for (let i = 0; i < 3; i++) {
    const y = h / 2 + (i - 1) * 30
    const x = w / 2 + Math.sin(t * 0.8 + i * 2.1) * 30
    ctx.globalAlpha = 0.35
    ctx.beginPath()
    ctx.moveTo(w / 2 - 44, y)
    ctx.lineTo(w / 2 + 44, y)
    ctx.stroke()
    ctx.globalAlpha = 0.9
    ctx.beginPath()
    ctx.arc(x, y, 7, 0, Math.PI * 2)
    ctx.fill()
  }
}

nav.push(
  new Menu(
    NAME,
    [
      ...games.map(gameItem),
      {
        label: 'Settings',
        more: true,
        art: settingsArt,
        select: () => nav.push(settingsMenu()),
      },
    ],
    { split: true },
  ),
)

bindControls(wheel, (input) => nav.input(input))

// The system back gesture (Android) acts as Menu. While anything is open, one history entry
// sits above the page. Chrome ignores entries added without a user gesture, so the entry is
// added on the finger-up or key-up that follows the change.
let sentinel = false
let swallow = false
const settleHistory = () => {
  const want = nav.depth > 1
  if (want && !sentinel) {
    history.pushState({ wheel: true }, '')
    sentinel = true
  } else if (!want && sentinel) {
    sentinel = false
    swallow = true
    history.back()
  }
}
window.addEventListener('pointerup', settleHistory)
window.addEventListener('keyup', settleHistory)
window.addEventListener('popstate', () => {
  if (swallow) {
    swallow = false
    return
  }
  if (!sentinel) return
  sentinel = false
  nav.input({ type: 'press', button: 'menu' })
  nav.input({ type: 'release', button: 'menu' })
})

// Invite links (?room=CODE) go straight into that room.
const room = new URLSearchParams(location.search).get('room')?.toUpperCase()
if (room && room.length === CODE_LENGTH && [...room].every((c) => CODE_LETTERS.includes(c))) {
  history.replaceState(null, '', location.pathname)
  play(nav, quiz, joinMode(room))
}

// Installed to a home screen, the device keeps working offline.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}
