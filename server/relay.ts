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
const HEARTBEAT_MS = 5_000

type Member = { peer: Peer; socket: WebSocket | null }
type Room = { code: string; host: string; members: Map<string, Member>; expires?: NodeJS.Timeout }

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
    for (;;) {
      let code = ''
      for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]
      }
      if (!rooms.has(code)) return code
    }
  }

  const enter = (room: Room, socket: WebSocket, id: string, name: string) => {
    clearTimeout(room.expires)
    const existing = room.members.get(id)
    if (existing?.socket && existing.socket !== socket) existing.socket.close()
    room.members.set(id, { peer: { id, name, online: true }, socket })
    send(socket, { t: 'room', code: room.code, host: room.host, peers: peers(room) })
    broadcastPeers(room, socket)
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

    socket.on('message', (raw) => {
      let message: ClientMessage
      try {
        message = JSON.parse(String(raw))
      } catch {
        return send(socket, { t: 'error', reason: 'bad-message' })
      }
      if (message.t === 'ping') return send(socket, { t: 'pong' })
      if (message.t === 'host' && !room && typeof message.id === 'string') {
        room = { code: newCode(), host: message.id, members: new Map() }
        rooms.set(room.code, room)
        self = message.id
        enter(room, socket, self, clean(message.name))
      } else if (message.t === 'join' && !room && typeof message.id === 'string') {
        const target = rooms.get(String(message.code).toUpperCase())
        if (!target) return send(socket, { t: 'error', reason: 'no-room' })
        if (!target.members.has(message.id) && target.members.size >= MAX_PLAYERS) {
          return send(socket, { t: 'error', reason: 'full' })
        }
        room = target
        self = message.id
        enter(room, socket, self, clean(message.name))
      } else if (message.t === 'send' && room && self) {
        const out: ServerMessage = { t: 'msg', from: self, data: message.data }
        for (const [id, m] of room.members) {
          if (id !== self && (message.to === undefined || message.to === id)) send(m.socket, out)
        }
      }
    })

    socket.on('close', () => {
      const member = room && self ? room.members.get(self) : undefined
      if (!room || !member || member.socket !== socket) return
      member.socket = null
      member.peer.online = false
      broadcastPeers(room)
      const r = room
      if ([...r.members.values()].every((m) => !m.socket)) {
        r.expires = setTimeout(() => rooms.delete(r.code), EMPTY_ROOM_MS)
      }
    })
  })

  return {
    rooms,
    /** Attach to an HTTP server. Other upgrade requests (like Vite's HMR) are left alone. */
    attach(server: EventEmitter) {
      server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
        if (new URL(req.url ?? '/', 'http://x').pathname !== PATH) return
        // Only pages served by this host may connect (no cross-site socket hijacking).
        const origin = req.headers.origin
        if (origin && new URL(origin).host !== req.headers.host) return void socket.destroy()
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

const clean = (name: unknown) =>
  String(name ?? '')
    .replace(/[^\p{L}\p{N} ._-]/gu, '')
    .trim()
    .slice(0, 12) || 'Player'
