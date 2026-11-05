// Client for the room relay (server/relay.ts). Reconnects on its own, so a phone that slept
// comes back into the same room with the same player id.

import type { ClientMessage, Peer, ServerMessage } from './protocol.ts'

export type { Peer }

export type RoomEvents = {
  room?(code: string, host: string, peers: Peer[]): void
  peers?(peers: Peer[]): void
  message?(from: string, data: unknown): void
  /** The connection dropped (true) or came back (false). It keeps retrying meanwhile. */
  offline?(offline: boolean): void
  /** The room is gone or full, this id belongs to someone else, or another tab took over. */
  error?(reason: 'no-room' | 'full' | 'taken' | 'replaced'): void
}

/** Random hex. crypto.randomUUID is missing on plain-http LAN addresses; this is not. */
function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Reads a random value kept for this tab, creating it the first time. */
function perTab(name: string): string {
  try {
    let value = sessionStorage.getItem(name)
    if (!value) {
      value = randomId()
      sessionStorage.setItem(name, value)
    }
    return value
  } catch {
    return randomId()
  }
}

/** A stable id per tab, so two tabs on one computer are two players. */
export const playerId = (): string => perTab('wheel:id')

const RETRY_MS = [250, 500, 1000, 2000, 4000]
const PING_MS = 4000
/** No reply for this long means the socket died quietly (common after a phone sleeps). */
const SILENT_MS = 9000
/** A connection attempt that has not opened by now is abandoned and tried again. */
const CONNECT_MS = 6000

export class Room {
  /** Guests keep one id per tab, so a reload rejoins with their score. A host's game lives in
   * memory, so each hosted room gets a fresh identity: a reloaded or copied tab cannot take
   * over the host's seat. */
  readonly id: string
  /** Proves to the relay that a reconnect is really this player. Never shared with players. */
  private readonly key: string
  private openedAt = 0
  code: string | undefined
  private socket: WebSocket | undefined
  private closed = false
  private attempts = 0
  private heard = 0
  private retry: number | undefined
  private queue: ClientMessage[] = []
  private readonly events: RoomEvents
  private readonly name: string
  private readonly ping: number
  /** Back from sleep or offline: reconnect at once unless a fresh attempt is under way. */
  private readonly wake = () => {
    const state = this.socket?.readyState ?? WebSocket.CLOSED
    const stalled = state === WebSocket.CONNECTING && performance.now() - this.openedAt > CONNECT_MS
    if (
      document.visibilityState === 'visible' &&
      !this.closed &&
      (state >= WebSocket.CLOSING || stalled)
    ) {
      this.reconnect(0)
    }
  }

  constructor(name: string, events: RoomEvents, hosting = false) {
    this.name = name
    this.events = events
    this.id = hosting ? randomId() : playerId()
    this.key = hosting ? randomId() : perTab('wheel:key')
    this.ping = window.setInterval(() => {
      const state = this.socket?.readyState
      // A stalled handshake, or an open socket gone quiet: replace it now rather than waiting
      // for a close handshake that a dead link will never answer.
      const stalled =
        state === WebSocket.CONNECTING && performance.now() - this.openedAt > CONNECT_MS
      const silent = state === WebSocket.OPEN && performance.now() - this.heard > SILENT_MS
      if (stalled || silent) this.reconnect(0)
      else if (state === WebSocket.OPEN) this.write({ t: 'ping' })
    }, PING_MS)
    document.addEventListener('visibilitychange', this.wake)
    window.addEventListener('online', this.wake)
    window.addEventListener('pageshow', this.wake)
  }

  host(): void {
    this.open()
  }

  join(code: string): void {
    this.code = code.toUpperCase()
    this.open()
  }

  send(data: unknown, to?: string): void {
    this.write({ t: 'send', data, to })
  }

  close(): void {
    this.closed = true
    clearInterval(this.ping)
    clearTimeout(this.retry)
    document.removeEventListener('visibilitychange', this.wake)
    window.removeEventListener('online', this.wake)
    window.removeEventListener('pageshow', this.wake)
    this.socket?.close()
  }

  private get isOpen() {
    return this.socket?.readyState === WebSocket.OPEN
  }

  private write(message: ClientMessage) {
    if (this.isOpen) this.socket?.send(JSON.stringify(message))
    else if (message.t === 'send') this.queue.push(message)
  }

  /** Hosts once; after that, every connection rejoins the same room under the same id. */
  private hello(): ClientMessage {
    const { id, key, name } = this
    return this.code ? { t: 'join', code: this.code, id, key, name } : { t: 'host', id, key, name }
  }

  private open() {
    const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`
    const previous = this.socket
    const socket = new WebSocket(url)
    this.socket = socket
    this.openedAt = performance.now()
    previous?.close()
    socket.onopen = () => {
      if (this.attempts > 0) this.events.offline?.(false)
      this.attempts = 0
      this.heard = performance.now()
      socket.send(JSON.stringify(this.hello()))
      for (const m of this.queue.splice(0)) socket.send(JSON.stringify(m))
    }
    socket.onmessage = (e) => {
      if (socket !== this.socket) return
      this.heard = performance.now()
      let m: ServerMessage
      try {
        m = JSON.parse(String(e.data))
      } catch {
        return
      }
      if (m.t === 'room') {
        this.code = m.code
        this.events.room?.(m.code, m.host, m.peers)
      } else if (m.t === 'peers') this.events.peers?.(m.peers)
      else if (m.t === 'msg') this.events.message?.(m.from, m.data)
      else if (m.t === 'error' && m.reason !== 'bad-message') {
        this.close()
        this.events.error?.(m.reason)
      }
    }
    socket.onclose = () => {
      if (this.closed || socket !== this.socket) return
      this.reconnect(RETRY_MS[Math.min(this.attempts, RETRY_MS.length - 1)] as number)
    }
  }

  /** Keeps trying for as long as the room is open: phones lose Wi-Fi and come back. */
  private reconnect(wait: number) {
    clearTimeout(this.retry)
    this.attempts += 1
    // Say so after a couple of failed tries; a single blip passes unnoticed.
    if (this.attempts === 2) this.events.offline?.(true)
    this.retry = window.setTimeout(() => {
      if (this.closed) return
      const silent = this.isOpen && performance.now() - this.heard > SILENT_MS
      if (!this.isOpen || silent) this.open()
    }, wait)
  }
}
