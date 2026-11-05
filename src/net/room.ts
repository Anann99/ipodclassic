// Client for the room relay (server/relay.ts). Reconnects on its own, so a phone that slept
// comes back into the same room with the same player id.

import type { ClientMessage, Peer, ServerMessage } from './protocol.ts'

export type { Peer }

export type RoomEvents = {
  room?(code: string, host: string, peers: Peer[]): void
  peers?(peers: Peer[]): void
  message?(from: string, data: unknown): void
  error?(reason: 'no-room' | 'full' | 'offline'): void
}

/** A stable id per tab, so two tabs on one computer are two players. */
export function playerId(): string {
  try {
    let id = sessionStorage.getItem('wheel:id')
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem('wheel:id', id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

const RETRY_MS = [500, 1000, 2000, 4000]

export class Room {
  readonly id = playerId()
  code: string | undefined
  private socket: WebSocket | undefined
  private closed = false
  private attempts = 0
  private queue: ClientMessage[] = []
  private readonly events: RoomEvents
  private readonly name: string

  constructor(name: string, events: RoomEvents) {
    this.name = name
    this.events = events
  }

  host(): void {
    this.open({ t: 'host', id: this.id, name: this.name })
  }

  join(code: string): void {
    this.code = code.toUpperCase()
    this.open({ t: 'join', code: this.code, id: this.id, name: this.name })
  }

  send(data: unknown, to?: string): void {
    this.write({ t: 'send', data, to })
  }

  close(): void {
    this.closed = true
    this.socket?.close()
  }

  private write(message: ClientMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message))
    else this.queue.push(message)
  }

  private open(first: ClientMessage) {
    const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`
    const socket = new WebSocket(url)
    this.socket = socket
    socket.onopen = () => {
      this.attempts = 0
      socket.send(JSON.stringify(first))
      for (const m of this.queue.splice(0)) socket.send(JSON.stringify(m))
    }
    socket.onmessage = (e) => {
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
        this.closed = true
        socket.close()
        this.events.error?.(m.reason)
      }
    }
    socket.onclose = () => {
      if (this.closed || socket !== this.socket) return
      const wait = RETRY_MS[this.attempts]
      if (wait === undefined) {
        this.closed = true
        this.events.error?.('offline')
        return
      }
      this.attempts += 1
      // Rejoin the same room; a host that never got a room simply hosts again.
      setTimeout(() => {
        if (this.closed) return
        this.open(
          this.code
            ? { t: 'join', code: this.code, id: this.id, name: this.name }
            : { t: 'host', id: this.id, name: this.name },
        )
      }, wait)
    }
  }
}
