// Clicker sound, haptics and a tiny synth for game sound effects. Everything is generated at
// runtime, so there are no audio files to load.

import { settings } from '../os/settings.ts'

let audio: AudioContext | undefined
let clickBuffer: AudioBuffer | undefined
let noiseBuffer: AudioBuffer | undefined

/** Audio can only start inside a user gesture; on touch screens that means finger-up. */
export function unlockAudio(): void {
  if (!audio) {
    try {
      audio = new AudioContext({ latencyHint: 'interactive' })
    } catch {
      return
    }
    // The original clicker is a piezo: a few cycles of a 1250 Hz square wave.
    clickBuffer = render(audio, 0.0045, (t) => {
      const square = Math.sin(2 * Math.PI * 1250 * t) >= 0 ? 1 : -1
      return square * Math.exp(-t * 700) * 0.22
    })
    noiseBuffer = render(audio, 1, () => Math.random() * 2 - 1)
  }
  if (audio.state !== 'running') audio.resume().catch(() => {})
}

for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
  window.addEventListener(type, unlockAudio, { capture: true, passive: true })
}

function render(ctx: AudioContext, seconds: number, sample: (t: number) => number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = sample(i / ctx.sampleRate)
  return buffer
}

let lastClick = 0
let lastBuzz = 0

/** The wheel's click: a tick per detent, a firmer one per button press. */
export function click(kind: 'tick' | 'press' = 'tick'): void {
  const now = performance.now()
  if (settings.get().clicker && audio?.state === 'running' && clickBuffer && now - lastClick > 12) {
    lastClick = now
    const source = audio.createBufferSource()
    source.buffer = clickBuffer
    source.playbackRate.value = kind === 'press' ? 0.8 : 1
    source.connect(audio.destination)
    source.start()
  }
  // Android vibrates. iOS has no vibration API: its haptic comes from the native switch
  // the wheel wraps (see bindControls), which only real taps can toggle.
  if (
    settings.get().haptics &&
    typeof navigator.vibrate === 'function' &&
    navigator.userActivation?.hasBeenActive !== false &&
    now - lastBuzz > 30
  ) {
    lastBuzz = now
    navigator.vibrate(kind === 'press' ? 18 : 10)
  }
}

export type Tone = {
  /** Oscillator shape, or noise for hits and explosions. */
  wave?: OscillatorType | 'noise'
  /** Start frequency in Hz (for noise: the low-pass cutoff). */
  from: number
  /** End frequency in Hz; slides exponentially from `from`. */
  to?: number
  ms: number
  gain?: number
  /** Delay before the tone starts, for simple sequences. */
  at?: number
}

/** Plays a short synthesized sound. Sounds follow the Clicker setting. */
export function tone(...tones: Tone[]): void {
  if (audio?.state !== 'running' || !settings.get().clicker) return
  for (const t of tones) {
    const start = audio.currentTime + (t.at ?? 0) / 1000
    const end = start + t.ms / 1000
    const gain = audio.createGain()
    gain.gain.setValueAtTime(t.gain ?? 0.15, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)
    gain.connect(audio.destination)
    let source: AudioScheduledSourceNode
    if (t.wave === 'noise') {
      const noise = audio.createBufferSource()
      noise.buffer = noiseBuffer ?? null
      const filter = audio.createBiquadFilter()
      filter.frequency.setValueAtTime(t.from, start)
      if (t.to) filter.frequency.exponentialRampToValueAtTime(t.to, end)
      noise.connect(filter).connect(gain)
      source = noise
    } else {
      const osc = audio.createOscillator()
      osc.type = t.wave ?? 'square'
      osc.frequency.setValueAtTime(t.from, start)
      if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, end)
      osc.connect(gain)
      source = osc
    }
    source.start(start)
    source.stop(end)
  }
}
