# Plan

## Goal

The feel of the iPod classic games, played in a browser: a click wheel your thumb runs around,
the menu you remember, and games made for that wheel. Later, played together.

## Why not an emulator

The original games are encrypted per device and per iTunes account, there is no public
emulator for the 6th-generation firmware, and the games are copyrighted. So this is a native
web device running original games in the same genres. Rules and genres are free to reuse;
names, art, levels, music and question packs are not, so none are copied.

"Cortex" is almost certainly Vortex: the 6G shipped with iQuiz, Klondike and Vortex.

| Original | Ours  | What we kept                                                    | What we made our own                                       |
| -------- | ----- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| Vortex   | Orbit | Paddle on a ring, turned 1:1 by the wheel; bricks at the center | 2D top-down look, spinning ring layouts, power-ups, pacing |
| iQuiz    | Quiz  | Ten timed multiple-choice questions, scroll and select          | All 260 questions, scoring, rooms for up to 8 players      |

## Principles

- One purpose per screen. No taglines, helper text or secondary labels.
- The wheel is the only control a screen assumes. Keys and scroll are fallbacks.
- Simple stack: TypeScript, Vite, no UI framework. One runtime dependency, on the server.
- Pure, seeded game logic, so every rule is unit-tested and multiplayer can share it.

## Architecture

```
browser                                         node (dev: inside Vite)
┌──────────────────────────────────────────┐    ┌──────────────────────┐
│ device/  wheel → controls → inputs       │    │ server/relay.ts      │
│ os/      nav · menu · play · settings    │    │ rooms by 4-letter    │
│ games/   orbit · quiz   (logic + view)   │◄──►│ code, forwards msgs, │
│ net/     room client  ── /ws ──────────────── │ heartbeats           │
└──────────────────────────────────────────┘    └──────────────────────┘
```

- The screen is a 320x240 stage zoomed to fit, so the layout is identical on every display.
- Desktop shows the device as an object; on a phone the phone becomes the device.
- Multiplayer: the host's browser referees and sends snapshots; guests send answers. The relay
  is game-agnostic, so new multiplayer games need no server code.

## Milestones

1. **Foundation** (done). Vite, TypeScript 7, Biome, Vitest, Playwright, one `npm run check`.
2. **Device** (done). Wheel gestures from the Rockbox driver's constants (24 detents per turn,
   reversal hysteresis, a dead zone near the center), the clicker, haptics (Android vibrates;
   iOS via a native switch on tap), the menu stack, Settings, back gesture as Menu.
3. **Orbit** (done). Ring breakout with five layout patterns, spinning rings, three power-ups,
   combo scoring, and a best score. Bounces use each brick's moving surface; paddle hits aim
   through the brick field. A bot checks pacing in the tests.
4. **Quiz** (done). 260 original questions, written and fact-checked twice, easy to hard
   within a game; time-based points.
5. **Rooms** (done). Host, join by code or `?room=` link, Invite via the share sheet,
   reconnect after a phone sleeps, works on a plain-http LAN.
6. **Install** (done). App icons, a home-screen manifest, offline play with a service worker.
7. **Review** (done). Five independent reviews (input, navigation, Orbit, multiplayer, design),
   each finding re-checked by a skeptic: 36 confirmed and fixed, then a second round on the
   fixes, with regression tests wherever a browser or a simulation can check them.
8. **Online** (when wanted). Deploy the same Node server (Render, Fly, a small VPS) or move rooms
   to Cloudflare Durable Objects. Add a server-side referee if strangers play together.
9. **More games**. In order of fit for the wheel and for playing together: Klondike, Reversi,
   Hold'em with play chips, a radial aim-and-shoot, mini golf, a lane rhythm game. Orbit
   co-op (two paddles on one ring) once rooms are online.

## Risks

- iOS gives no haptic per wheel tick, and its silent switch mutes the clicker. Taps still buzz.
- Host-referee rooms trust the host. Fine among friends; a public mode needs the server referee.
- Questions age. They are chosen to be timeless, and a test guards their format.
