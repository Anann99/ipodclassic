// A game-agnostic room relay. One player hosts a room and runs the game; the relay only
// forwards messages between members. Shared by the Vite dev server and the production server.

import type { EventEmitter } from 'node:events'
import type { IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'
import { type WebSocket, WebSocketServer } from 'ws'
import {
  type ClientMessage,
  CODE_LENGTH,
  CODE_LETTERS,
  MAX_PLAYERS,
  type Peer,
  type ServerMessage,
} from '../src/net/protocol.ts'

export type { ClientMessage, Peer, ServerMessage }

export const PATH = '/ws'
const MAX_MESSAGE_BYTES = 16 * 1024
/** Rooms with nobody connected are kept this long so a host whose phone slept can return. */
const EMPTY_ROOM_MS = 5 * 60_000
/** A room nobody ever joined is not worth keeping as long. */
const LONELY_ROOM_MS = 60_000
/** Enough for any party; a bound so nobody can use up every code. */
const MAX_ROOMS = 5000
const HEARTBEAT_MS = 5_000

type Member = { peer: Peer; key: string; socket: WebSocket | null; since: number }
type Room = {
  code: string
  host: string
  members: Map<string, Member>
  /** Keys of players whose seats were reused, so nobody else can take their id later. */
  retired: Map<string, string>
  expires?: NodeJS.Timeout
}

export function createRelay() {
  const rooms = new Map<string, Room>()
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES })

  const send = (socket: WebSocket | null, message: ServerMessage) => {
    if (socket && socket.readyState === socket.OPEN) socket.send(JSON.stringify(message))
  }
  const peers = (room: Room) => [...room.members.values()].map((m) => m.peer)
  const broadcastPeers = (room: Room, except?: WebSocket) => {
    for (const m of room.members.values()) {
      if (m.socket !== except) send(m.socket, { t: 'peers', peers: peers(room) })
    }
  }

  const newCode = () => {
    if (rooms.size >= MAX_ROOMS) return undefined
    for (let tries = 0; tries < 100; tries++) {
      let code = ''
      for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]
      }
      if (!rooms.has(code)) return code
    }
    return undefined
  }

  /** Puts a socket in a room under `id`, or says why it cannot be. */
  const enter = (room: Room, socket: WebSocket, id: string, key: string, name: string) => {
    const existing = room.members.get(id)
    const owner = existing?.key ?? room.retired.get(id)
    if (owner !== undefined && owner !== key) return send(socket, { t: 'error', reason: 'taken' })
    if (!existing && room.members.size >= MAX_PLAYERS) {
      // Seats of players who left are reused, oldest first; the host keeps theirs.
      const gone = [...room.members.values()]
        .filter((m) => !m.socket && m.peer.id !== room.host)
        .sort((a, b) => a.since - b.since)[0]
      if (!gone) return send(socket, { t: 'error', reason: 'full' })
      room.members.delete(gone.peer.id)
      room.retired.set(gone.peer.id, gone.key)
    }
    if (existing?.socket && existing.socket !== socket) {
      send(existing.socket, { t: 'error', reason: 'replaced' })
      existing.socket.close()
    }
    clearTimeout(room.expires)
    room.members.set(id, { peer: { id, name, online: true }, key, socket, since: Date.now() })
    send(socket, { t: 'room', code: room.code, host: room.host, peers: peers(room) })
    broadcastPeers(room, socket)
    return true
  }

  // Drop sockets that stopped answering pings (phones that slept without closing).
  const alive = new WeakSet<WebSocket>()
  const heartbeat = setInterval(() => {
    for (const client of wss.clients) {
      if (!alive.has(client)) {
        client.terminate()
        continue
      }
      alive.delete(client)
      client.ping()
    }
  }, HEARTBEAT_MS)

  wss.on('connection', (socket) => {
    let room: Room | undefined
    let self: string | undefined
    alive.add(socket)
    socket.on('pong', () => alive.add(socket))
    // Oversized or malformed frames: ws closes the socket; without a listener it would throw.
    socket.on('error', () => socket.terminate())

    socket.on('message', (raw) => {
      // A backstop: no message, however malformed, may take the relay down.
      try {
        handle(raw)
      } catch {
        send(socket, { t: 'error', reason: 'bad-message' })
      }
    })

    const handle = (raw: unknown) => {
      let message: ClientMessage
      try {
        message = JSON.parse(String(raw))
      } catch {
        return send(socket, { t: 'error', reason: 'bad-message' })
      }
      if (typeof message !== 'object' || message === null) {
        return send(socket, { t: 'error', reason: 'bad-message' })
      }
      if (message.t === 'ping') return send(socket, { t: 'pong' })
      if (message.t === 'send') {
        if (!room || !self) return
        const out: ServerMessage = { t: 'msg', from: self, data: message.data }
        for (const [id, m] of room.members) {
          if (id !== self && (message.to === undefined || message.to === id)) send(m.socket, out)
        }
        return
      }
      if (message.t !== 'host' && message.t !== 'join') return
      if (room || !isToken(message.id) || !isToken(message.key)) {
        return send(socket, { t: 'error', reason: 'bad-message' })
      }
      let target: Room | undefined
      if (message.t === 'host') {
        const code = newCode()
        if (!code) return send(socket, { t: 'error', reason: 'full' })
        target = { code, host: message.id, members: new Map(), retired: new Map() }
        rooms.set(code, target)
      } else {
        target =
          typeof message.code === 'string' ? rooms.get(message.code.toUpperCase()) : undefined
        if (!target) return send(socket, { t: 'error', reason: 'no-room' })
      }
      if (enter(target, socket, message.id, message.key, clean(message.name))) {
        room = target
        self = message.id
      }
    }

    socket.on('close', () => {
      const member = room && self ? room.members.get(self) : undefined
      if (!room || !member || member.socket !== socket) return
      member.socket = null
      member.peer.online = false
      broadcastPeers(room)
      const r = room
      if ([...r.members.values()].every((m) => !m.socket)) {
        const wait = r.members.size > 1 ? EMPTY_ROOM_MS : LONELY_ROOM_MS
        r.expires = setTimeout(() => rooms.delete(r.code), wait)
      }
    })
  })

  return {
    rooms,
    /** Attach to an HTTP server. Other upgrade requests (like Vite's HMR) are left alone. */
    attach(server: EventEmitter) {
      server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
        let path: string
        let sameSite: boolean
        try {
          path = new URL(req.url ?? '/', 'http://x').pathname
          // Only pages served by this host may connect (no cross-site socket hijacking).
          const origin = req.headers.origin
          sameSite = !origin || new URL(origin).host === req.headers.host
        } catch {
          return void socket.destroy()
        }
        if (path !== PATH) return
        if (!sameSite) return void socket.destroy()
        wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
      })
    },
    close() {
      clearInterval(heartbeat)
      for (const r of rooms.values()) clearTimeout(r.expires)
      for (const client of wss.clients) client.terminate()
      wss.close()
    },
  }
}

const isToken = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 64

const clean = (name: unknown) =>
  (typeof name === 'string' ? name : '')
    .replace(/[^\p{L}\p{N} ._-]/gu, '')
    .trim()
    .slice(0, 12) || 'Player'
