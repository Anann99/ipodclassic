# Classic

A click-wheel handheld in the browser, with original games in the spirit of the iPod classic
click-wheel games. No framework, one runtime dependency (`ws`, server only).

## Commands

- `npm run dev`: the site and the multiplayer relay, also on your LAN (`--host`)
- `npm run check`: lint, types and unit tests. Run it before every commit.
- `npm run e2e`: Playwright, desktop keys and a phone touchscreen
- `npm run shots`: every screen as a PNG in `test-results/shots/`, phone and desktop, both finishes
- `npm run build && npm start`: the production server on port 8080 (or `PORT`)

## Map

- `src/device/`: the hardware. `wheel.ts` turns pointer samples into inputs (pure, tested);
  `controls.ts` binds touch, mouse, keys and scrolling; `feedback.ts` is the clicker,
  haptics and a tiny synth (`tone`).
- `src/os/`: the software. `nav.ts` is the view stack (Menu goes back), `menu.ts` the list,
  `play.ts` hosts a game session with the pause menu, `letters.ts` spells with the wheel,
  `canvas.ts` gives crisp canvases and a fixed-step loop, `settings.ts` and `store.ts` persist.
- `src/games/`: one folder per game. `types.ts` is the whole contract.
- `src/net/`: `protocol.ts` is shared with the server; `room.ts` is the reconnecting client.
- `server/relay.ts`: game-agnostic rooms. The host's browser runs the game; the relay only
  forwards messages. Mounted by `vite.config.ts` in dev and by `server/index.ts` in production.

## Rules

- The screen is 320x240 logical pixels. Lay out and draw in those units; scaling is automatic.
- Input is one stream: `tick` (one detent, for lists), `turn` (radians, for games), `press`
  and `release`. Menu never reaches a game; it opens the pause menu unless `Session.menu`
  handles it.
- No taglines, helper text or secondary labels. If a screen needs words to make sense, change
  the layout. Words that remain are names, values and actions.
- Game logic is pure and seeded (`create`, `step`), so it can be tested without a browser.
- Original work only: no names, art, levels, music or question packs from existing games.
- Server code runs directly in Node (type stripping): no enums, namespaces or parameter
  properties, and imports end in `.ts`.

## Adding a game

1. Create `src/games/<id>/index.ts` exporting a `Game` (`id`, `title`, `art`, `modes`).
2. Keep rules in `logic.ts` with a `logic.test.ts` beside it.
3. Add it to `src/games/index.ts`. It appears in the home menu with its preview.
4. For multiplayer, use `Room` from `src/net/room.ts`: the host runs the logic and sends
   snapshots; guests send inputs. See `src/games/quiz/index.ts`.
