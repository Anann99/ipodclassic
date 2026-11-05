// Clicker sound, haptics and a tiny synth for game sound effects. Everything is generated at
// runtime, so there are no audio files to load.

import { settings } from '../os/settings.ts'

let audio: AudioContext | undefined
let clickBuffer: AudioBuffer | undefined
let noiseBuffer: AudioBuffer | undefined

/** Audio can only start inside a user gesture, so the first press or key creates it. */
export function unlockAudio(): void {
  if (!audio) {
    try {
      audio = new AudioContext({ latencyHint: 'interactive' })
    } catch {
      return
    }
    clickBuffer = render(audio, 0.006, (t) => {
      const body = Math.sin(2 * Math.PI * 1900 * t) * Math.exp(-t * 900)
      const snap = (Math.random() * 2 - 1) * Math.exp(-t * 2600)
      return (body * 0.5 + snap * 0.5) * 0.6
    })
    noiseBuffer = render(audio, 1, () => Math.random() * 2 - 1)
  }
  if (audio.state !== 'running') audio.resume().catch(() => {})
}

function render(ctx: AudioContext, seconds: number, sample: (t: number) => number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = sample(i / ctx.sampleRate)
  return buffer
}

/** The wheel's detent click: one per tick and per button press. */
export function click(): void {
  if (settings.get().clicker && audio?.state === 'running' && clickBuffer) {
    const source = audio.createBufferSource()
    source.buffer = clickBuffer
    source.connect(audio.destination)
    source.start()
  }
  if (settings.get().haptics) haptic()
}

let iosSwitch: HTMLLabelElement | undefined

/**
 * Android vibrates. iOS Safari has no vibration API, but toggling a native switch control
 * plays the system haptic, so a hidden one is toggled instead.
 */
function haptic(): void {
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(8)
    return
  }
  if (!iosSwitch) {
    iosSwitch = document.createElement('label')
    iosSwitch.ariaHidden = 'true'
    iosSwitch.style.cssText = 'position:fixed;left:-100px;width:1px;height:1px;overflow:hidden'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    input.tabIndex = -1
    iosSwitch.append(input)
    document.body.append(iosSwitch)
  }
  iosSwitch.click()
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
