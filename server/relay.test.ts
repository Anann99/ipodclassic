import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { WebSocket } from 'ws'
import { MAX_PLAYERS } from '../src/net/protocol.ts'
import { createRelay, PATH, type ServerMessage } from './relay.ts'

let server: Server
let relay: ReturnType<typeof createRelay>
let url: string

beforeEach(async () => {
  server = createServer()
  relay = createRelay()
  relay.attach(server)
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  url = `ws://127.0.0.1:${(server.address() as AddressInfo).port}${PATH}`
})

afterEach(async () => {
  relay.close()
  await new Promise((done) => server.close(done))
})

/** A test client that queues every server message. */
async function client() {
  const ws = new WebSocket(url)
  const inbox: ServerMessage[] = []
  const waiters: (() => void)[] = []
  ws.on('message', (raw) => {
    inbox.push(JSON.parse(String(raw)))
    for (const w of waiters.splice(0)) w()
  })
  await new Promise((done) => ws.once('open', done))
  const next = async <T extends ServerMessage['t']>(t: T) => {
    for (;;) {
      const i = inbox.findIndex((m) => m.t === t)
      if (i >= 0) return inbox.splice(i, 1)[0] as Extract<ServerMessage, { t: T }>
      await new Promise<void>((done) => waiters.push(done))
    }
  }
  return { ws, next, send: (m: object) => ws.send(JSON.stringify(m)) }
}

it('hosts, joins and relays messages both ways', async () => {
  const host = await client()
  host.send({ t: 'host', id: 'h', key: 'k-h', name: 'Ann' })
  const { code } = await host.next('room')
  expect(code).toMatch(/^[A-Z]{4}$/)

  const guest = await client()
  guest.send({ t: 'join', code: code.toLowerCase(), id: 'g', key: 'k-g', name: 'Bo<b>' })
  const joined = await guest.next('room')
  expect(joined.host).toBe('h')
  expect(joined.peers.map((p) => p.name)).toEqual(['Ann', 'Bob'])

  host.send({ t: 'send', data: { hello: 1 } })
  expect(await guest.next('msg')).toEqual({ t: 'msg', from: 'h', data: { hello: 1 } })
  guest.send({ t: 'send', to: 'h', data: 'hi' })
  expect(await host.next('msg')).toEqual({ t: 'msg', from: 'g', data: 'hi' })
})

it('rejects unknown rooms', async () => {
  const c = await client()
  c.send({ t: 'join', code: 'ZZZZ', id: 'x', key: 'k-x', name: 'X' })
  expect(await c.next('error')).toEqual({ t: 'error', reason: 'no-room' })
})

it('marks a dropped player offline and restores them on rejoin', async () => {
  const host = await client()
  host.send({ t: 'host', id: 'h', key: 'k-h', name: 'Ann' })
  const { code } = await host.next('room')
  const guest = await client()
  guest.send({ t: 'join', code, id: 'g', key: 'k-g', name: 'Bo' })
  await guest.next('room')
  expect((await host.next('peers')).peers).toHaveLength(2)

  guest.ws.close()
  const after = await host.next('peers')
  expect(after.peers.find((p) => p.id === 'g')?.online).toBe(false)

  const back = await client()
  back.send({ t: 'join', code, id: 'g', key: 'k-g', name: 'Bo' })
  await back.next('room')
  const restored = await host.next('peers')
  expect(restored.peers.find((p) => p.id === 'g')?.online).toBe(true)
  expect(restored.peers).toHaveLength(2)
})

it('answers pings', async () => {
  const c = await client()
  c.send({ t: 'ping' })
  expect(await c.next('pong')).toEqual({ t: 'pong' })
})

it('refuses sockets opened by pages from another site', async () => {
  const ws = new WebSocket(url, { origin: 'https://evil.example' })
  const outcome = await new Promise((done) => {
    ws.once('open', () => done('open'))
    ws.once('error', () => done('refused'))
  })
  expect(outcome).toBe('refused')
})

it('survives malformed messages and handshakes', async () => {
  const c = await client()
  for (const raw of ['null', '5', '"x"', '{"t":"host","id":"a","key":"b","name":{"toString":1}}']) {
    c.ws.send(raw)
  }
  c.send({ t: 'join', code: { toString: 1 }, id: 'z', key: 'k', name: 'Z' })
  const bad = new WebSocket(url, { origin: 'null' })
  await new Promise((done) => bad.once('error', done).once('open', done))
  c.send({ t: 'ping' })
  expect(await c.next('pong')).toEqual({ t: 'pong' })
})

it('refuses an id that belongs to someone else, and tells a replaced tab', async () => {
  const host = await client()
  host.send({ t: 'host', id: 'h', key: 'secret', name: 'Ann' })
  const { code } = await host.next('room')
  const thief = await client()
  thief.send({ t: 'join', code, id: 'h', key: 'guess', name: 'Eve' })
  expect(await thief.next('error')).toEqual({ t: 'error', reason: 'taken' })
  const again = await client()
  again.send({ t: 'join', code, id: 'h', key: 'secret', name: 'Ann' })
  await again.next('room')
  expect(await host.next('error')).toEqual({ t: 'error', reason: 'replaced' })
})

it('counts only connected players toward a full room, reusing seats of those who left', async () => {
  const host = await client()
  host.send({ t: 'host', id: 'h', key: 'kh', name: 'Host' })
  const { code } = await host.next('room')
  for (let i = 0; i < MAX_PLAYERS + 3; i++) {
    const guest = await client()
    guest.send({ t: 'join', code, id: `g${i}`, key: `k${i}`, name: `G${i}` })
    await guest.next('room')
    guest.ws.close()
    await new Promise((done) => guest.ws.once('close', done))
  }
  const late = await client()
  late.send({ t: 'join', code, id: 'late', key: 'kl', name: 'Late' })
  const room = await late.next('room')
  expect(room.peers.length).toBeLessThanOrEqual(MAX_PLAYERS)
  expect(room.peers.some((p) => p.id === 'h')).toBe(true)
})
