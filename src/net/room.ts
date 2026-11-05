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
  error?(reason: 'no-room' | 'full'): void
}

/** Random hex. crypto.randomUUID is missing on plain-http LAN addresses; this is not. */
function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** A stable id per tab, so two tabs on one computer are two players. */
export function playerId(): string {
  try {
    let id = sessionStorage.getItem('wheel:id')
    if (!id) {
      id = randomId()
      sessionStorage.setItem('wheel:id', id)
    }
    return id
  } catch {
    return randomId()
  }
}

const RETRY_MS = [250, 500, 1000, 2000, 4000]
const PING_MS = 4000
/** No reply for this long means the socket died quietly (common after a phone sleeps). */
const SILENT_MS = 9000

export class Room {
  readonly id = playerId()
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
  private readonly wake = () => {
    if (document.visibilityState === 'visible' && !this.closed && !this.isOpen) this.reconnect(0)
  }

  constructor(name: string, events: RoomEvents) {
    this.name = name
    this.events = events
    this.ping = window.setInterval(() => {
      if (!this.isOpen) return
      if (performance.now() - this.heard > SILENT_MS) this.socket?.close()
      else this.write({ t: 'ping' })
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
    return this.code
      ? { t: 'join', code: this.code, id: this.id, name: this.name }
      : { t: 'host', id: this.id, name: this.name }
  }

  private open() {
    const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`
    const socket = new WebSocket(url)
    this.socket = socket
    socket.onopen = () => {
      if (this.attempts > 0) this.events.offline?.(false)
      this.attempts = 0
      this.heard = performance.now()
      socket.send(JSON.stringify(this.hello()))
      for (const m of this.queue.splice(0)) socket.send(JSON.stringify(m))
    }
    socket.onmessage = (e) => {
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
      if (this.attempts === 2) this.events.offline?.(true)
      this.reconnect(RETRY_MS[Math.min(this.attempts, RETRY_MS.length - 1)] as number)
    }
  }

  /** Keeps trying for as long as the room is open: phones lose Wi-Fi and come back. */
  private reconnect(wait: number) {
    clearTimeout(this.retry)
    this.attempts += 1
    this.retry = window.setTimeout(() => {
      if (!this.closed && !this.isOpen) this.open()
    }, wait)
  }
}
