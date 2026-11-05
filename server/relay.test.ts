import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { WebSocket } from 'ws'
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
  host.send({ t: 'host', id: 'h', name: 'Ann' })
  const { code } = await host.next('room')
  expect(code).toMatch(/^[A-Z]{4}$/)

  const guest = await client()
  guest.send({ t: 'join', code: code.toLowerCase(), id: 'g', name: 'Bo<b>' })
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
  c.send({ t: 'join', code: 'ZZZZ', id: 'x', name: 'X' })
  expect(await c.next('error')).toEqual({ t: 'error', reason: 'no-room' })
})

it('marks a dropped player offline and restores them on rejoin', async () => {
  const host = await client()
  host.send({ t: 'host', id: 'h', name: 'Ann' })
  const { code } = await host.next('room')
  const guest = await client()
  guest.send({ t: 'join', code, id: 'g', name: 'Bo' })
  await guest.next('room')
  expect((await host.next('peers')).peers).toHaveLength(2)

  guest.ws.close()
  const after = await host.next('peers')
  expect(after.peers.find((p) => p.id === 'g')?.online).toBe(false)

  const back = await client()
  back.send({ t: 'join', code, id: 'g', name: 'Bo' })
  await back.next('room')
  const restored = await host.next('peers')
  expect(restored.peers.find((p) => p.id === 'g')?.online).toBe(true)
  expect(restored.peers).toHaveLength(2)
})
