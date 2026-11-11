# Plan: a faithful iPod classic

Version 2, November 2026. It replaces the first plan, which built a minimalist homage. The
owner's verdict on that build was "very basic and timid looking … nothing like the original".
Four independent reviews (owner, fidelity, engineering, risk) have been applied to this
version.

## Summary

- **Why today's build looks wrong.** The proportions are right, within 2% of your photo. What
  is wrong is everything else:
  - the materials;
  - a dark screen where the original is white;
  - a three-item menu;
  - no music;
  - thin games.
- **What you see first.** Your photo, reproduced: the black unit, the white screen and title
  bar, the cover browser and the real main menu. That is P1, about a week after go-ahead, on
  a link you can open on your phone.
- **The order after that.** Every menu and setting, then music and the three games side by
  side, then Extras, Photos and Videos, then polish and a public launch.
- **What will never be exact.**
  - Vortex, iQuiz and Apple's Klondike: we build our own games in their place.
  - Apple's logo, and the words "iPod" and "Cover Flow" on screen.
  - Alarms, which a web page cannot ring reliably.
- **What we need from you now.** D1 to D5 in section 1, and D6 if you can get a real unit.
  Every decision has a default if you don't answer.

**Figure 1** sets three images side by side: your photo, today's build and the target. It is
sent with this plan. It stays out of the repository because it contains your photo, and
because of D1. The target is drawn from the measurements in Appendix B. Approving it approves
the look, and P1 builds it.

## 1. Decisions for you

| #   | Question                                                                                                                                                                                                                                                                                    | Recommendation                                                                                                            | Needed by | If you don't answer                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| D1  | A faithful body resembles a shape Apple registered as a trademark (2008), and in October 2026 Apple put its own working iPod in the browser. Your repository is public, so P1's faithful body is public as soon as it is pushed. Do you accept this risk for a free, own-named web project? | Yes, with a trademark lawyer's review before the public launch. Make the repository private until then.                   | P1        | I ask again before pushing P1                                                                                                |
| D2  | Product name. It must not contain "iPod" or "Pod", and the repository is called `ipodclassic` today. Keep Classic, or choose Detent, Thumbwheel or Rotary? All are cleared for marks in P0.                                                                                                 | Classic, and rename the repository to `classic`. GitHub redirects the old address.                                        | P1        | Classic; the repository keeps its name until you rename it                                                                   |
| D3  | Phone layout: the whole device at true proportions, or today's enlarged wheel?                                                                                                                                                                                                              | True proportions. The body spans the screen width, and the spare height goes above it, so the wheel sits near your thumb. | P1        | True proportions                                                                                                             |
| D4  | Backdrop: light studio (as in your photo) or dark?                                                                                                                                                                                                                                          | Light                                                                                                                     | P1        | Light                                                                                                                        |
| D5  | A preview link, unlisted and password-protected, from P0. You can open each phase on your phone, and it runs the iPhone test. It needs a hosting account in your name; a free tier is enough.                                                                                               | Yes                                                                                                                       | P0        | I run previews in the session and send screenshots. The iPhone test waits, and iPhone uses the simpler audio path.           |
| D6  | Can you get a working iPod classic (yours, borrowed or used)? If so, send the seven shots in Appendix B.6, a 10-second recording of the wheel clicking, and Apple's user guide PDF if you have it.                                                                                          | Yes. They turn estimates into measurements.                                                                               | P2        | Lists, Now Playing and motion use our best estimates, marked provisional. P6 checks only the screens we hold references for. |
| D7  | "On-The-Go" and "Sound Check": Apple's words, or ours ("Quick List", "Even Volume")?                                                                                                                                                                                                        | Apple's words. No registration was found; a search in P0 confirms it.                                                     | P3        | Apple's words, unless the search finds a live mark                                                                           |
| D8  | Music source                                                                                                                                                                                                                                                                                | Openly licensed starter albums, plus your own files imported in the browser and never uploaded. No streaming services.    | P3        | As recommended                                                                                                               |
| D9  | Videos, Photos, Podcasts and Notes show what you import: podcasts as episode files you already have, notes as text files. Calendars and Contacts are hidden. Podcast subscriptions are left out, because they need a server that fetches any web address.                                   | As described                                                                                                              | P5        | As described                                                                                                                 |
| D10 | Our solitaire uses the Klondike rules. Apple's game in this same slot was called Klondike, and our hard rule bans names from existing games. Call it Patience, or keep Klondike (the rules' own name), or Solitaire?                                                                        | Patience                                                                                                                  | P4        | Patience                                                                                                                     |
| D11 | Asked after the P0 test, with its result. Suppose a locked iPhone stops music played through the volume graph. iPhone then uses the simpler path: the wheel in Now Playing scrubs, the phone's own buttons set volume, and EQ, Sound Check and Volume Limit are hidden. Accept?             | Yes. Everything else works the same.                                                                                      | P3        | Accepted                                                                                                                     |

Already decided as engineering calls:

- One client library for reading music tags, loaded on first import (Appendix A).
- About 340 more quiz questions, written and fact-checked like the first 260.

## 2. Why the current build misses

| Area       | The real 6th generation                                                                                             | Ours today                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Screen     | White list with black bold text, on both finishes                                                                   | Dark screen on the dark finish                                   |
| Title bar  | 20 px, strong grey gradient, title on the **left**, battery, play and lock on the right                             | Faint gradient, title centred, no icons                          |
| Type       | A bold Helvetica-like face                                                                                          | The platform's system font, different everywhere                 |
| Black body | Blue-tinted anodised face lit like a pillow: bright side rims, edges falling to black                               | A flat diagonal gradient                                         |
| Wheel      | Lighter than the face and matte; near-white labels; ⏮⏭ drawn as a bar and two triangles                             | Darker than the face; dim grey labels; the wrong glyphs          |
| Glass      | A near-square black window with equal margins                                                                       | A rounded "phone" window, and a display 5% small                 |
| Main menu  | Music, Videos, Photos, Podcasts, Extras, Settings, Shuffle Songs, Now Playing; album art drifting on the right half | Orbit, Quiz, Settings                                            |
| Music      | The point of the device: the library, the cover browser, Now Playing                                                | None                                                             |
| Buttons    | Hold Menu for the main menu, hold Play to sleep, the Hold switch, the backlight timer                               | No long presses                                                  |
| Games      | At Extras > Games, each with its own title, menus, difficulty, saves and score tables                               | Straight into play; one stored number each                       |
| Phone      | —                                                                                                                   | The body is dropped; the screen floats and the wheel is inflated |

The code has a matching gap. The wheel maths, game logic, canvas loop and multiplayer relay
are sound and stay. What is missing sits between "a button happened" and "a screen reacted":
no long press, no system layer, no player, no power states, no long lists, no game shell.

## 3. What "exact" can and cannot mean

**We match**, as far as references allow:

- the object: proportions, materials, both finishes, the wheel, labels and glyphs (drawn by us);
- the screen: the white interface, the title bar and its icons, list metrics, the highlight,
  the split main menu, transitions and the backlight;
- the software: the menu tree, Settings, Extras, Now Playing, the cover browser, Search,
  Shuffle Songs, On-The-Go, sleep, the Hold switch and reset;
- the controls in every screen, including long presses and the letter overlay;
- the games' frame: their place, full-screen front ends, difficulty tiers, saves, score
  tables, statistics and options.

**Fixed, not options.**

- The main-menu title is our product name; the original says "iPod".
- The cover browser is called Covers; your photo says "Cover Flow", a registered Apple mark.

**Left out**, because a web page cannot do them reliably:

- Alarms: a closed page or a locked iPhone cannot ring.
- The battery level where the browser does not report it (iPhone): the battery shows full,
  never a made-up low state.

**We never copy**:

- Vortex, iQuiz or Apple's Klondike: their names, art, levels, music, question packs or
  distinctive look. Appendix C lists exactly what is off-limits.
- Apple logos, icons, artwork, fonts or sounds, and Apple product photos in our materials.
- Firmware or ROMs. No emulation, no DRM circumvention.

You will not get Vortex, iQuiz or Klondike as they were. You get three games of ours in the
same place, with the same controls and the same depth. Orbit is a ring seen from above, not a
tunnel. The originals still play on any used iPod classic; we neither bundle nor link them.

**Names and identity.** "iPod", "iPod classic", "Cover Flow" and the iPod's 3D shape are
registered Apple marks. Apple's only actions against recreations so far were App Store
removals (Rewound 2019, Retro Pod 2023). So:

- No "iPod" or "Pod" in the name, repository, package name, domain, deploy path, page title,
  manifest, icon or share image.
- Our mark, icon and share image are never a front view of the device (a screen above a
  wheel). Today's wheel-on-a-square icon is fine. The share image shows a screen, not the
  device.
- Docs mention the iPod classic only to describe what this is, next to the not-affiliated
  line.
- One "independent project, not affiliated with Apple" line, on Settings > Legal and in the
  README.
- Every Apple-named label lives in one names table.
- Free, no ads, no purchases, open web only (no App Store), no Apple Music or Spotify.

**Words on screen.** AGENTS.md allows only names, values and actions on screen. Prose appears
only as content (questions, explanations, lyrics, notes) and on Settings > Legal. P1 writes
this into AGENTS.md.

## 4. The target, screen by screen

Target software: late 2007, after Apple sped up the menu animations, before Genius. It matches
your black model. Items marked _(to confirm)_ follow our best recollection and are listed for
checking on a real unit (D6). Exact numbers and their sources are in Appendix B.

### 4.0 Feel

- 24 clicks per turn, with acceleration on fast spins.
- Each click sounds, and vibrates on Android, on the same detent that moves the highlight,
  with no dropped ticks. The click is our own sound, tuned against a recording of a real unit
  (D6).
- Center and Menu act on press, so menus never wait for a lift. Center waits only on rows
  where holding it means something (a song: add to On-The-Go). Play, Prev and Next act on
  release, because holding them means sleep or seek.

### 4.1 The object

- One drawing in screen-pixel units at your photo's proportions, scaled by one number and
  snapped so screen pixels stay sharp.
- **Black finish**, from colours measured on your photo:
  - the pillow-lit face with bright side rims;
  - a lighter matte wheel;
  - the centre button lit dark at the top, light at the bottom;
  - near-white labels;
  - a near-square glass window.
- **Silver finish** from best estimates, marked provisional until a silver photo arrives.
- Our own glyphs: MENU in compact bold caps; ⏮ ⏭ as a bar and two triangles; ▶❙❙ with a gap.
- The Hold switch sits on the top edge; switched on, it shows an orange bar.
- **Phone**: the body spans the width at true proportions and is never stretched. The spare
  height goes above it (D3). Landscape shows the whole device upright, fitted to the height.
  The screen and the wheel are never split apart.
- Backdrop: a light studio with a contact shadow (D4).

### 4.2 Screen chrome

- A white interface on both finishes, in a bundled open-licence font with Helvetica's
  metrics, so it looks the same on every platform.
- Title bar: the grey gradient from your photo, with the title bold on the left. On the right:
  - the battery;
  - play or pause while the player is active;
  - a lock while Hold is on.
- Rows: bold black text. The selected row is a glossy blue gradient with a white chevron.
- Screens slide sideways on push and pop.
- **Backlight**: after the Backlight timer (default 10 s, or Always On), the screen dims and
  goes unlit. The device keeps running and music keeps playing.
- **Sleep**: hold Play. Playback pauses and the screen turns off. Any button wakes it to the
  last screen.

### 4.3 Main menu

- The split screen: the list on the left half casts a shadow over the right half.
- The right half shows, per item:
  - Music and Shuffle Songs: covers that drift and cross-fade;
  - Now Playing: the current cover and track;
  - Videos: stills;
  - Photos: photos;
  - Podcasts: show art;
  - Extras and Settings: our own icons.
- Choosing an item widens the list to full width as the art slides away.
- Items: Music, Videos, Photos, Podcasts, Extras, Settings, Shuffle Songs, and Now Playing
  while something is playing or paused _(to confirm)_. Settings > Main Menu edits the list.
- A list with nothing in it is blank under its title, as on a unit with nothing synced. By the
  public launch, every row has content.

### 4.4 Music

- **Music** lists, in order _(to confirm)_:
  - Covers;
  - Playlists, Artists, Albums, Songs;
  - Genres, Composers, Audiobooks;
  - Search.

  Settings > Music Menu edits the list.
- **Long lists** are as fast with 10,000 songs as with three:
  - Turning fast shows a large letter.
  - Turning further steps through the alphabet, and each letter moves the highlight to its
    first item.
  - Lifting the thumb returns to normal scrolling.
  - Numbers and symbols sort before A.
- **Covers**, your photo's screen:
  - the wheel or Prev/Next moves one album at a time;
  - Center flips the album to its track list, where Center plays a song;
  - Menu flips back.
- **Now Playing**:
  - the cover on a slant with a reflection, then title, artist, album and the position in the
    queue;
  - the wheel sets volume;
  - Center cycles through the scrubber, rating, shuffle, lyrics if present, then back;
  - Prev restarts the song, and Next skips;
  - holding either seeks _(to confirm)_.
- **On-The-Go**: holding Center on a song adds it, and the title bar flashes _(to confirm)_.
- **Search**: the wheel walks the alphabet, and Center enters a letter. Results update live
  and match anywhere in the name. Prev deletes and Next adds a space _(to confirm)_.
- Shuffle Songs; Shuffle and Repeat; Sound Check; Volume Limit.
- EQ: our own list of about eight presets, not Apple's list or its order.
- Playback continues in every screen, inside games, and with the screen unlit.

**Where the music comes from (D8).**

- **Starter library**: 3 to 5 openly licensed albums, 25 to 40 tracks.
  - Two catalogues are checked so far: the Open Goldberg Variations and HoliznaCC0. Each
    album joins only after its track pages are read.
  - Each track downloads on its first play and is kept after that. Nothing downloads in bulk.
- **Starter covers** must hold up beside real ones: verified public-domain photographs or
  paintings with our typography, not flat shapes. Twelve are shown for approval in P1.
- **Your own music**, from files or folders (also on iPhone):
  - copied into the browser's private storage and never uploaded;
  - shows its own embedded covers, which is what makes the screen look like your photo.
- **Settings > Device > Add Music** has two rows, Files and Folder:
  - an import shows its progress, with Added and Skipped counts, and Center on Skipped lists
    the files it skipped;
  - dragging files onto the device on a computer opens it;
  - Erase Music removes what you imported;
  - on a plain-http address (a home-network link), these rows are absent.

### 4.5 Photos, Videos, Podcasts (D9)

- **Photos**: a grid, full screen and slideshow. Photos > Settings holds Time Per Slide, Music,
  Repeat, Shuffle Photos and Transitions.
- **Videos and Podcasts**: real lists over imported files, and full-screen video.

### 4.6 Extras

- **Games** (4.8).
- **Clocks**: Center opens Add (region, then city), Edit and Delete.
- **Alarms** holds only the Sleep Timer, from Off to 60 Minutes. It stays only if it passes the
  locked-iPhone test in P0.
- **Stopwatch**: Center records a lap; the three latest laps show; Play/Pause stops it. Each
  session is saved, with a Current Log.
- **Screen Lock**: New Combination, then Confirm Combination, then Lock. The four digits are
  set with the wheel _(to confirm)_, and Volume Limit uses the same combination. On the lock
  screen, the reset chord offers Reset Settings. It clears the combination and keeps your
  music.
- **Notes** shows imported text files (D9). Calendars and Contacts are hidden.

### 4.7 Settings

- About: pages of names and values only, stepped with Center:
  - the product name;
  - Songs and Albums;
  - Capacity and Available;
  - Version.
- Shuffle (Off, Songs, Albums); Repeat (Off, One, All).
- Main Menu and Music Menu, as checklists.
- Volume Limit, Backlight, Brightness, EQ, Sound Check, Clicker, Date & Time.
- Language, with one entry until a translation exists.
- Legal holds the not-affiliated line, licences and credits, in our own words. Apple's legal
  text is never reproduced.
- Reset Settings _(to confirm)_.
- Values sit at the right in the same bold weight.
- Our additions all live in Settings > Device, and they are the only rows the original lacks:
  - Finish and Player Name;
  - Haptics;
  - Add Music and Erase Music.

### 4.8 Games

Path: Extras > Games > game. Each game runs full screen with its own front end.

**Shared shell**

- A title card (Center skips it), then New Game, Resume (only when a save exists), Scores,
  Statistics and Options.
- Menu pauses: Resume, Save, End Game. Every game also saves itself when the page closes.
- Top-10 named score tables, and one player name for the whole device.
- A music option: Game, Off or Auto, where Auto gives way to your music.
- Play, Prev and Next drive the music player wherever a game does not use them.
- **Teaching without words**:
  - every action works with the wheel and Center alone, and buttons only add shortcuts;
  - where a shortcut matters, the game art draws the button's glyph beside its target (⏮ at
    the undo spot, ⏭ by the stock);
  - the first level or deal forces each mechanic once;
  - no input depends on turning direction unless a pair of arrows is drawn.

**Orbit**, a ring breakout

- Look: lit, glossy bricks; a backdrop and palette per set; full-screen title and menus in a
  2007 gloss style. This replaces today's flat colours on navy.
- Five tiers with start points; level cards and clear tallies.
- 40 to 50 designed levels in five sets, then endless generated levels.
- More brick kinds and ring behaviours, and about eight power-ups.
- Turn or Follow control, and statistics.

**Quiz**, trivia

- Look: our own stage art. The countdown, question and reveal screens follow the device's
  white interface, replacing today's dark screen, bar and pills.
- Packs by category; about 600 questions.
- Three formats:
  - Ten: ten timed questions.
  - Run: endless, until a set number of misses.
  - Ladder: rounds of five questions. Each round adds an answer choice (3, then 4, then 5)
    and shortens the timer. No wagers, no true-or-false round, no spinner.
- A countdown, reading time and explanations; statistics per pack.
- Together (Host and Join) moves onto the new shell.

**Patience** (D10), the Klondike rules

- Look: our own 40×56 cards, card backs and tables.
- Draw 1 or 3; Standard, Vegas or no scoring; undo.
- Winnable deals from a list generated offline; daily deals; statistics.
- A wheel cursor that stops only where a move is legal.

## 5. Phases

First review: the P1 preview, about a week after go-ahead.

- Times are rough working days, plus your reviews.
- After P2, music and games run as two tracks at the same time.
- Content that needs no screens starts in P0: Orbit levels, quiz questions, Patience deals,
  starter covers.
- Each step merges with `npm run check` and the browser tests green. Appendix A.5 lists each
  phase's exit checks.

| Phase                           | Work                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | What you see                                                                                                                                                       | Your part                                                                        | Rough time |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ---------- |
| **P0 Groundwork**, alongside P1 | Long presses and the system layer. Browser tests that walk menus by name. The preview link (D5). The iPhone audio test page. The content track starts. Mark searches (D2, D7); font and music licence checks. A read of Apple's iPod classic user guide (from you, or online if this environment may reach it).                                                                                                                                                                                                                                    | Nothing new on screen                                                                                                                                              | Run the iPhone test, about 15 minutes, and copy back the table it shows          | 2–4 days   |
| **P1 The look**                 | The device in screen units: black finish from your photo, silver from estimates, glyphs, glass, Hold switch, backdrop, phone layout. The white screen with its font, title bar and icons. The main menu with its eight items and drifting art; Extras > Games holds Orbit and Quiz. Music lists the starter albums (titles and covers; playback comes in P3). The cover browser with 12 starter covers: the wheel and Prev/Next move it, and Center flips an album to its tracks. Name, mark, Legal and About. Today's look kept as a second skin. | Your photo, reproduced: the same body and the same cover-browser screen, side by side with your picture                                                            | Compare the preview with your photo, and approve the 12 covers. Answer D1 to D5. | 4–6 days   |
| **P2 The OS**                   | Every submenu and every Settings item. Long lists with acceleration and the letter overlay, over the starter catalogue and a 10,000-song test library. Power: backlight, brightness, sleep, wake, Hold, reset. The boot screen.                                                                                                                                                                                                                                                                                                                    | Browse a real library and every menu. Every button behaves as Apple's guide describes; the rest follows our best recollection, listed for checking on a real unit. | Send the D6 references, if you can                                               | 5–7 days   |
| **P3 Music**, track A           | Import, the player, queue, shuffle, repeat, EQ, Sound Check, Volume Limit. Now Playing and its Center cycle. The cover browser plays music. Search, On-The-Go, Shuffle Songs, lock-screen controls.                                                                                                                                                                                                                                                                                                                                                | Your own music, used like the original                                                                                                                             | Import a folder of your own music; run the phone checklist                       | 6–9 days   |
| **P4 Games**, track B           | The game shell. Orbit and Quiz completed, with Host and Join on the shell; Patience new; their new look. Music hooks wired when P3 lands.                                                                                                                                                                                                                                                                                                                                                                                                          | Three complete games that look like 2007 handheld games, each with title, menus, tiers, scores and saves                                                           | Play each game for a session; run the phone checklist                            | 10–15 days |
| **P5 Extras and media**         | Clocks, Stopwatch, Screen Lock, Sleep Timer. Photos with slideshow; Videos, Podcasts and Notes from imported files (D9).                                                                                                                                                                                                                                                                                                                                                                                                                           | The whole device                                                                                                                                                   | —                                                                                | 5–7 days   |
| **P6 Polish and proof**         | Calibration against your references; low-end phones; accessibility; offline use.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Within tolerance on every screen we hold a reference for                                                                                                           | A final check on your phone                                                      | 3–5 days   |
| **P7 Public launch**            | The trademark review (D1). Public hosting. A daily Patience race.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Play with friends anywhere                                                                                                                                         | Approve the launch                                                               | 2–4 days   |

In total, about 6 to 9 weeks with the two tracks running at once, or 7 to 11 in a single
stream. The P0 iPhone test decides the audio path on iPhone before P3 (D11).

## 6. How we make it exact

1. **References.** Your photo now, and the D6 shots if you can get them.
2. **A fidelity ledger.** `docs/fidelity.md` lists every behaviour and measurement with its
   source, its token and the reference that would settle it. Only sourced or measured rows
   become fidelity tests.
3. **Side-by-side checks.**
   - A developer overlay lays a reference photo over our screen. It covers geometry, type,
     chrome colours and motion only. Pictorial art (pane icons, boot screen, placeholders,
     all game screens) is drawn without it and never traced from Apple's.
   - Locked screenshots from P1 onward catch any change made by accident.
4. **Real devices.** You run a 10-minute checklist on the preview at the end of P1, P3 and P4,
   on your iPhone in Safari and from the Home Screen.

## 7. Risks

| Risk                                                                                                                                        | Mitigation                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trade dress: a faithful device resembles Apple's registered shape. Apple's own browser iPod (October 2026) shows the look is in active use. | D1. Our own name and mark, never a front view of the device. Apple's words off the screen; zero Apple assets; free; web only; the Legal line; a lawyer's review before launch. Today's look stays as a working second skin, so a complaint means switching skins, not a redesign. |
| iPhone audio: no scripted volume, and the volume graph can stop on a locked phone                                                           | The P0 test settles the path before P3. The simpler path always works (D11).                                                                                                                                                                                                      |
| Storage: browsers can evict a site's data; Safari clears it after seven days outside Home Screen apps                                       | Ask for persistent storage after the first import. The index rebuilds from the files. About shows Capacity and Available. No install advice on screen; the README carries any.                                                                                                    |
| Starter covers look flat                                                                                                                    | Verified public-domain imagery, approved in P1. Imported music shows real covers.                                                                                                                                                                                                 |
| Starter-music licences                                                                                                                      | Each track's source, licence page and checksum recorded in P0. CC BY credits on Legal.                                                                                                                                                                                            |
| Unverified details: row height, gradients, timings, silver                                                                                  | One token each, plus calibration and the D6 references                                                                                                                                                                                                                            |
| Covers and long lists on phones                                                                                                             | A cover test with pass marks and a fallback in P0. Long lists built for 10,000 songs from the start.                                                                                                                                                                              |
| A home-network (plain-http) address                                                                                                         | Games and rooms keep working there. Music import needs HTTPS and is absent on such an address.                                                                                                                                                                                    |
| Scope: about 6 to 11 weeks                                                                                                                  | Each phase ships a usable whole. P1 alone fixes the look. Content stays off the critical path.                                                                                                                                                                                    |

---

## Appendix A: for engineers

These stay: TypeScript, Vite, no UI framework, DOM for lists and text, canvas for games and
artwork, pure seeded logic with unit tests. The client gains one dependency, `music-metadata`
(MIT, about 99 KB gzip), loaded only on the first import. No `idb`: about 60 lines replace it.
AGENTS.md's dependency line changes when it lands.

### A.1 Layers

```
device/   wheel ─► buttons ─► controls          pure gesture and timing; DOM binding
            │  turn · tick · lift · press · release · click · hold · repeat
            ▼
os/system   Hold switch ─► wake ─► chords and global holds ─► top view ─► defaults
            │                                      (Menu = back; Play/Prev/Next = player)
            ▼
os/   nav (stack, slides, overlays) · status (title bar) · power (backlight, sleep, Hold)
      list (virtualised, acceleration, letters) · settings (schema) · split (main menu)
apps/   tree · music · nowplaying · covers · photos · videos · extras · about · legal
media/  library · queue · engine (two tiers) · art · import (worker)
games/  shell · scores · orbit · quiz · patience
net/, server/   unchanged, except that the server serves starter media with Range
```
A lint rule stops `device/` from importing `os/`.

### A.2 Key mechanisms

**Scale.** The body is sized with one unit variable, `--u` (CSS px per screen px). It is
snapped so that `--u × devicePixelRatio` is a whole number where the viewport allows. Body,
wheel and labels use `calc(n * var(--u))`, never `zoom` or `transform`. Only the 320×240
stage keeps `zoom`, as today. Lists and covers take their geometry from tokens and never
measure inside the stage.

**Input v2.**

- On top of raw `press` and `release`, add:
  - `click`: released before the hold threshold;
  - `hold`: fires once, at a per-binding threshold;
  - `repeat`: fires while held, for seeking;
  - `lift`: the wheel stopped turning.
- `lift` is emitted in three cases:
  - a ring touch that scrolled ends or is cancelled;
  - the last held arrow key is released;
  - 250 ms pass with no wheel or trackpad scroll.

  On lift, lists land the letter overlay and reset acceleration, and the cover browser
  settles.
- Center acts on `press`, unless the highlighted target declares a Center hold
  (`View.holds?(button)`); then it acts on `click`. Menu acts on `press`. Play, Prev and Next
  act on `click`. Games keep raw input.
- All gesture timing reads one injected clock (`performance.now`), never `event.timeStamp`,
  so tests can drive holds with `page.clock`. Every threshold is a token.

**User activation.** `click` is dispatched synchronously inside the trusted pointerup or key
handler, never from `poll`, a timer, rAF, or after an `await`. Everything that needs
activation runs in that same call stack:

- a file input's `.click()`;
- the first `play()`;
- `AudioContext.resume()`;
- the Wake Lock.

The audio element is primed on the first gesture. Center on a song calls `play()`
synchronously, on a URL resolved ahead of time.

**System dispatcher.** Every input passes the same steps in order:

1. Hold switch on: new presses are dropped and the lock shows.
2. An unlit or sleeping screen wakes. A gesture that wakes the screen is consumed whole.
3. Chords and global holds:
   - the reset chord: after Hold is switched on then off, Menu+Center held 6 s;
   - hold Menu: the main menu;
   - hold Play: sleep.
4. The top view gets the input.
5. Defaults handle the rest. Views declare the buttons they claim (Appendix B.5); the rest
   drive the player.

Gesture ownership:

- A gesture is one button's press through its release, and it belongs to the view that got
  the press. Its release, click and hold go only to that view, and are dropped if that view
  is no longer on top.
- Hold and sleep drop new presses, but still deliver the releases of gestures already under
  way.
- Synthetic inputs (Android Back as Menu, test hooks) enter before the button layer, so they
  produce `click` exactly like a tap.
- Games (views flagged `rest`) ignore Menu, Center and Prev/Next holds. Hold Play still
  sleeps, after the game saves. Switching Hold on pauses the game.

**Lists.** A pure model over a lazy source `{count, row(i), letter?(i)}`. The view recycles
about 12 rows with `aria-setsize` and `aria-posinset`, so a 10,000-song list costs the same as
a three-row menu. Acceleration comes from ticks counted in a sliding window.

**Audio, two tiers.** iOS ignores scripted `audio.volume`, so wheel volume, EQ and Sound
Check need a Web Audio graph, and that graph has a record of stopping on locked iPhones.

- **Tier A**: one element. Tracks change by swapping `src` on `ended`, never through a second
  element. There is no music bus, so wheel volume, Volume Limit, EQ and Sound Check are
  hidden, and the games' Auto mode pauses music instead of ducking it.
- **Tier B**: two elements alternate for near-gapless play, each through its own
  `MediaElementSource` into the music bus. One `AudioContext` holds the ui, sfx and music
  buses and a master volume.
- **Choosing a tier.** `createMediaElementSource` is permanent, so the tier is chosen once at
  boot, before any element is connected. The test: set `volume = 0.5` on a detached element.
  If it reads back 1, use Tier A, unless the P0 test passed Tier B.
- Media Session gives lock-screen controls. Podcasts always play through Tier A.

**Library and import.** Import runs in one module Worker:

- it parses tags with `music-metadata`, loaded lazily;
- it makes 96 and 480 px thumbnails with `OffscreenCanvas`;
- it streams each file into OPFS with `createSyncAccessHandle`, in 1–4 MB chunks;
- it posts index rows in batches of 50–100.

The page holds a wake lock while importing; iOS cannot import in the background. Worker files
get their own tsconfig with the WebWorker lib, included in `npm run check`.

The index lives in IndexedDB, can be rebuilt from OPFS, and loads after first paint, so the
main menu never waits for it. `persist()` is requested after the first import. At 10,000
tracks, Node measured 12 ms to sort and under 1 ms to search; the phone budget is 100 ms.

**Starter media.**

- Starter tracks are served by our server with Range, from outside git, on the preview host.
- Each track streams on its first play and is then kept in OPFS.
- In P3, the phase that first fetches media, `sw.js` stops caching anything except
  `/assets/` and the app shell, and its cache name is bumped. Today it caches every GET,
  which would store media twice.

**Secure context.** OPFS, the pickers and the service worker need HTTPS.

- `npm run dev` stays plain http: games and rooms work there, and media rows are hidden.
- `npm run dev:https` serves the same with an mkcert certificate, trusted once on the
  developer's phone.
- The preview deploy (static build plus relay) is set up in P0 and updated at each phase end.

**Cover browser.** DOM with CSS 3D inside the zoomed stage. Reflections are baked into each
cover bitmap. A spring drives a continuous position that settles on whole albums, on `lift`.
The layout maths is a pure module.

- P0 test: 7 covers spinning at 15 covers/s, on iPhone Safari, Android Chrome and desktop
  Safari, at scales 1, 1.5 and 2.
- It passes at 55 fps or more, with no clipping or z-fighting.
- If it fails, the cover browser renders in an unzoomed layer placed over the stage. WebGL
  comes only if that also fails.

**Names table.** Every on-screen label that could change (D2, D7) is one key. Browser tests
walk menus by key, not by literal label.

**Skins.** Today's homage body stays as a working `generic` skin on the same tokens, and runs
in the browser tests.

**Fidelity tokens.** Each of these is one CSS or TS token:

- rows: height, rows visible, text size and inset;
- highlight stops, chevron rule, scroll bar;
- title-bar hairline and status glyphs;
- main menu: split shadow, art scale, drift, crossfade and cadence;
- the Now Playing layout;
- every animation duration;
- hold thresholds, acceleration and letter-overlay thresholds;
- the Prev-restart window, volume step and linger, backlight dimming;
- the LCD border, silver colours, centre concavity, the wheel groove.

**Patience deals.** Winnable deals come from a seed list generated offline by a Node script
and shipped as data. No solver runs in the browser.

### A.3 The iPhone audio test (P0)

- **The page.** A standalone page, outside the app, on the preview link so it can be added to
  the Home Screen. The owner runs it, and the page shows a pass-or-fail table to copy back.
- **The matrix.** iOS 18 and 26, each in a Safari tab and as a Home Screen app:
  - Tier A: one element, `src` swapped on `ended`;
  - Tier B: the same element through the graph, with `audioSession.type = 'playback'`.
- **The source.** Files picked through the folder picker, written to OPFS and played from
  `URL.createObjectURL(file)`. The next URL is created before `ended`.
- **A tier passes when**, with the phone locked for 10 minutes:
  - it makes three automatic track changes;
  - lock-screen play, pause and next work;
  - a seek lands within 1 s;
  - a Web Audio click during playback does not pause the music;
  - playback is right with the silent switch on and off.
- **Also checked:**
  - Center opens the picker and starts a song, from a release-time click;
  - the Wake Lock is granted;
  - the import time for a 300-file folder;
  - whether a 60-minute Sleep Timer fires while locked, stopping at a media position.
- **The same checks on a computer:** Enter in desktop Safari, for the picker and the first
  `play()`.
- **No result by the end of P1:** iOS uses Tier A.

### A.4 Tests

- **The path helper** (`open(page, 'Settings', 'Backlight')`) turns the wheel and reads only
  the highlighted row until its label matches, bounded by `aria-setsize`. It never queries
  rows off screen. No test counts key presses.
- **Asserted baselines** start in P1, for the body and every screen that exists, and each
  phase adds its own. They run only in the pinned Playwright container (1.63.0), after
  `document.fonts.ready`, on one reference platform with a tolerance.
- **WebKit and Firefox** Playwright projects run the browser tests from P0, where those
  browsers can be installed; otherwise the phone checklist covers WebKit.
- **Dispatcher and button tests** on a fake clock cover click, hold, repeat, chord, lift,
  waking and gesture ownership.
- **Fixtures:** three short audio files (under 200 KB in all), committed and imported with
  `setInputFiles`; a generated 10,000-track library behind `?fixture=10k`.
- **Fidelity tests:** each [V] or [P] row in `docs/fidelity.md` becomes a browser test.

### A.5 Phase exits

- **P0**:
  - check and the browser tests pass;
  - the lint rule holds (`device/` does not import `os/`);
  - dispatcher tests pass on a fake clock;
  - the iPhone table and the tier decision are recorded.
- **P1**:
  - body, glass, wheel and label fractions match Appendix B.1 within ±0.5% W, in a unit test
    of the layout module;
  - no page scroll, and the wheel fully visible, at 360×640, 390×844, 430×932 and 844×390;
  - no `system-ui` left in `src`;
  - the font loads before first paint;
  - baselines exist.
- **P2**:
  - the 10,000-track fixture keeps 12 rows or fewer;
  - a spin from A to Z takes 3 s or less with the letter overlay;
  - the holds, wake, Hold, the reset chord and the backlight are tested on `page.clock`;
  - every Settings row persists;
  - tick-to-paint p95 is 16 ms or less at 4× CPU throttle.
- **P3**:
  - fixture import, sorted lists, play, Next, Prev and resume after reload pass;
  - the index rebuilds from OPFS after IndexedDB is cleared;
  - with 10,000 tracks, the main menu shows in 1 s or less at 4× throttle;
  - covers hold 55 fps;
  - the iPhone checklist passes on the chosen tier.
- **P4**:
  - each game passes a snapshot-and-restore unit test, and a browser test of New Game, Menu,
    Save, reload and Resume;
  - score tables keep names;
  - the room tests stay green, with `?room=` skipping the title menu;
  - `os/play.ts` is deleted.

---

## Appendix B: fidelity spec

Labels:

- **[V]**: from a source.
- **[P]**: measured on the owner's photo.
- **[R]**: read in code, ours or the open-source iPod.js.
- **[E]**: our estimate.

Every [E] and [R] value is one token, settled by calibration or the D6 references.
`docs/fidelity.md` carries this list in the repository.

### B.1 The object

Fractions of body width W; body aspect 0.597.

- Body 389×652 screen px, radius 0.084 W [P].
- Glass window at x = y = 0.073 W, 0.854 W × 0.651 W, radius 0.006 W, `#010103` [P].
- `--lcd-border`: 0.016 W inside the glass [E]. The photo gives 0.0135 W; the panel spec
  allows up to 0.023 W.
- Wheel D = 0.616 W ≈ 240, centred at 0.704 H [P].
- Centre button 0.369 D ≈ 88 [P].
- Labels: outer edge 0.11 R inside the rim, `#e4e6eb` [P].
- Glyphs [P]:
  - ⏮⏭: 0.10 D × 0.046 D;
  - ▶❙❙: triangle 0.05 D, gap 0.02 D, bars 0.012 D with a 0.014 D gap;
  - MENU: cap height 0.046 D, width 0.204 D, tracking +0.05em [E].
- Black finish [P, except the groove]:

  ```
  --face: linear-gradient(180deg,#2c2b31 0%,#26282f 40%,#1c1f26 62%,#1d2029 88%,#0c0f17 100%);
  --rim-side: linear-gradient(90deg,rgb(110 110 122/.55),transparent 8.5%,transparent 91.5%,rgb(118 118 126/.6));
  --rim-top: linear-gradient(180deg,rgb(0 0 0/.85),transparent 6.7%W);
  --rim-bottom: linear-gradient(0deg,rgb(0 0 0/.8),transparent 12%W);
  --wheel: linear-gradient(180deg,#35383d,#2c2f36);
  --wheel-groove: 0 0 0 1px rgb(0 0 0/.3);            /* [E] */
  --centre: linear-gradient(180deg,#11141b,#22252c 50%,#3a3d44);
  --centre-lip: inset 0 1px 1px #0a0b0f, 0 1px 0 rgb(255 255 255/.10);
  ```

  The centre is lit dark at the top and light at the bottom [P]. Whether it is truly concave
  is [E].
- Silver finish, provisional until a silver photo arrives:
  - from iPod.js [R]: face `#e3e3e3 → #d6d6d6`, wheel `#fafafa → #ececee`, labels `#afafaf`;
  - our estimate [E]: centre `#d4d5d8 → #c4c5c9`;
  - Rockbox shows a grey wheel.
- Pressed state: the label brightens and a faint inset appears [E, our affordance].
- Hold switch: an orange bar shows when it is on [V].
- Backdrop [E]:
  - `#fff → #ececef`;
  - a contact shadow, blur 0.06 W at 35% black;
  - an optional floor reflection at 12–15%.
- Phone [E]:
  - the body spans the viewport width at 0.597 and is never stretched;
  - all spare height goes above it, so the wheel centre sits a token distance above the
    bottom edge;
  - landscape shows the whole device upright, fitted to the height.

### B.2 Screen chrome

320×240, white on both finishes.

- **Title bar** [P unless marked]:
  - 20 px tall;
  - gradient `#fbfbfc 0, #eeeeef 25%, #dcdcdd 40%, #cccccc 58%, #bdbdbd 75%, #adadad 92%`;
  - bottom hairline 1 px `#8a8d90` [E];
  - title 13 px bold, 9 px from the left, with an ellipsis.
- **Right cluster**, from the right edge: an 8 px margin, the battery, an 8 px gap, play or
  pause, then the lock [V presence; R spacing].
- **Battery**:
  - 22×11, fill stops `#b9d5ad 0, #c2f0b0 20%, #a3d98d 35%, #78ae63 50%, #618f4f 62%,
    #7b9f6f 78%, #a1bd97 100%` [P];
  - red at 20% or below [R, unverified]; a plug while charging [V];
  - the level comes from the Battery Status API where it exists, otherwise it shows full [E];
  - glyph shapes and colours are tokens [E];
  - the full-screen charging and low-battery screens are not simulated [E].
- **Font**: a bundled open-licence bold with Helvetica's metrics, Arimo or TeX Gyre Heros [E].
  P0 checks the licence, including Reserved Font Names, before subsetting.
- **Rows**:
  - height 24 px, 9 visible [E; iPod.js about 25];
  - text 15 px bold, inset 9 px [E];
  - selected: `linear-gradient(#3cb8ff,#347ab5)` with white text [R];
  - a 6×10 chevron on the selected row, 8 px from the right [R];
  - values right-aligned in the row's bold weight [E].
- **Scroll bar**: an 8 px track at the right, on overflow only; thumb at least 16 px [E].
- **Motion**: push and pop take 0.3 s [R]. Input during a slide snaps it to its end [E].
- **Backlight**:
  - the timer defaults to 10 s [V], with Always On [V] and steps of 2/5/10/15/20 s [E];
  - the screen dims, then goes unlit, while the device keeps running [V].
- **Sleep**:
  - hold Play [V] to pause and turn the screen off;
  - any button wakes it to the last view [V];
  - the waking press is consumed [E];
  - no deep sleep.

### B.3 Main menu

- The list covers x 0–160 over the art at x 160–320, y 20–240. The list shadow is
  `0 0 24px #000` [R].
- Art [R]:
  - covers at about 240 px;
  - a drift of 10% over 20 s;
  - a 2 s crossfade;
  - a new cover every 5 s.
- Each item shows different art [V]; which art goes with which item is [E] (section 4.3).
- Choosing an item widens the list as the art slides right and fades, in 0.35 s [R].
- Second-level menus are full width [E; iPod.js splits Music and Settings].
- Now Playing is listed while playing or paused [R, unverified].

### B.4 Music

- **Covers**, geometry [P]:
  - the centre cover is 128×128 at (96, 42);
  - side covers are trapezoids: outer edge 130–134 px, inner edge 94–96 px, 36–37 px wide,
    centred on y 106;
  - the first outer edges sit at x 60 and 264, then a 29.5 px pitch;
  - three covers per side, the third clipped; nearer covers on top.
- **Covers**, rendering:
  - built as `scale(.86) perspective(380px) rotateY(±70deg)` [E, fitted to the measured
    edges];
  - the reflection starts at y 170: 0.38 at the base, 0.15 by 8 px, gone by 45 px [P];
  - album, then artist, centred, bold 15 px, at baselines 205 and 225 [P].
- **Covers**, controls:
  - the wheel or Prev/Next moves one album per detent [V], in a 0.25 s step [R];
  - Center flips to the track list in 0.5 s [R];
  - in the track list, the wheel moves and Center plays [V];
  - Menu flips back, and Menu again returns to Music [R];
  - Play/Pause [E].
- **Lists**:
  - acceleration of 1/3/5/8 rows at 0/6/10/14 ticks per second [R];
  - the letter overlay [V], on sorted library lists only: Artists, Albums, Songs, Genres,
    Composers [E].
- **Now Playing**, layout:
  - art 128 px at rotateY 35° with a reflection [R];
  - title 15 px bold, artist and album 12 px `#636567` [R];
  - a bottom progress row with time columns [R];
  - "n of m", elapsed and remaining time, and the shuffle and repeat glyphs [E].
- **Now Playing**, controls:
  - volume moves 4% per detent, and its bar lingers 3 s [R];
  - Center cycle [V]:
    1. the scrubber, where the wheel scrubs;
    2. the rating, where the wheel sets 0–5 stars;
    3. shuffle: Off, Songs, Albums;
    4. lyrics, if present;
    5. podcast info, for episodes;
    6. back.
  - each panel returns after an idle token [E];
  - Prev restarts [V], and Prev within 3 s goes back [E];
  - Next skips [V]; holding either seeks until release [E];
  - the end of the queue returns to the menu it started from [R], with no automatic return to
    Now Playing [E].
- **On-The-Go** [E]:
  - hold Center on a song (500 ms [R]) to add it, and the title flashes;
  - Playlists ends with On-The-Go, which lists its songs, then Save Playlist and Clear
    Playlist.
- **Search**:
  - the wheel walks the alphabet, and Center enters [V];
  - results are live and match anywhere in the name [V];
  - Prev deletes, Next adds a space, and Menu goes to the results [E].
- The Music list order is [E], and so are its "All Albums" and "All Songs" rows.

### B.5 Buttons, holds, Settings

- **Hold thresholds**:
  - Menu to the main menu: 500 ms [R];
  - Center on a song: 500 ms [R];
  - Play to sleep: 2 s [E];
  - reset: 6 s [V].
- **Reset**: after Hold is switched on then off, Menu+Center held 6 s returns to the boot
  screen [V].
- **Button claims**, where a view's claim beats the player:
  - Covers: Prev/Next move one album [V].
  - Photos grid: Play starts the slideshow; Prev/Next move a page of thumbnails; holding goes
    to the first or last [V].
  - Slideshow: Prev/Next skip a photo [V].
  - Search: Prev deletes, Next adds a space, Menu goes to the results [E].
  - Menus: Play on a highlighted album or playlist plays it [E].
  - Games: per game.
  - Elsewhere, Play, Prev and Next drive the player [E, our rule].
- **Settings** [V]:
  - About; Shuffle; Repeat; Main Menu; Music Menu;
  - Volume Limit, lockable;
  - Backlight; Brightness; EQ (presets [E]); Sound Check; Clicker;
  - Date & Time: Date, Time, 24 Hour Clock, Time in Title [E];
  - Language.
- **Settings that are ours** [E]: Audiobooks speed, Compilations, Legal, and Reset Settings
  (Cancel, Reset). The order is [E] until the guide is read.
- **Extras**: the order is [E]. The Sleep Timer has Off and 60 Minutes [V], with 15/30/90/120
  [E].

### B.6 References that would settle the rest (D6)

Shoot straight on, sharp, in diffuse light, at least 1500 px across the device:

1. The main menu, a 30 s idle video of it, then a scroll through all its items.
2. A long list scrolled mid-way (Settings or Songs).
3. A macro of the title bar while playing, paused, with Hold on, and at low battery or
   charging.
4. Now Playing, and each press of Center from it.
5. A 60 fps video of entering and leaving two menu levels, and of the cover browser scrolling
   and flipping.
6. A silver unit's front, and a macro of the wheel and centre-button edge on each finish.
7. A video of Extras > Games and each bundled game's menus, for game flow only.

---

## Appendix C: off-limits in the games

- **From Vortex**:
  - the name, logo and title screen;
  - the tube view with bricks on its wall, and the fly-into-the-centre transition;
  - level layouts, backdrops and palettes;
  - the five tier names, and "Wheel Rotation" and "Finger Position";
  - the nine bonuses, their names and capsule art, and the red-dot dynamite art;
  - cheat codes, music and effects, and wording such as "Personal Info" and "Abandon".
- **From iQuiz**:
  - the names iQuiz and Music Quiz, and its set of packs;
  - any Apple, Aspyr or community question;
  - its themes and their art, the jazz tune, and the win and lose wording;
  - five rounds of eight with three strikes, the bonus wheel, "Wheel of Chance", dollar
    scoring, and the `trivia.txt` format;
  - a true-or-false lightning round, and wagering points before a question.
- **From Apple's Klondike**:
  - its title;
  - card faces, court cards, backs and tables, and their names;
  - cursor art and animations, menu wording and help text;
  - sounds, and the win animation.

## Appendix D: research behind this plan

Kept outside the repository, in the session that wrote this plan:

- an architecture audit with file and line references;
- a visual fidelity audit, measured against the owner's photo;
- a behaviour spec for the iPod classic: menus, buttons, Now Playing, Extras, power;
- a games depth brief;
- a media technology memo, with browser support data and a 10,000-track benchmark;
- a prior-art and risk brief;
- the first round of research: the wheel, the catalogue, the UI, game design, multiplayer;
- four reviews of the draft (owner, fidelity, engineering, risk), all applied here.
