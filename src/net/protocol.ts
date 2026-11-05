// Messages between browsers and the room relay (server/relay.ts). Shared by both sides.

/** Room codes use consonants only: quick to spell with the wheel, and no accidental words. */
export const CODE_LETTERS = 'BCDFGHJKLMNPQRSTVWXZ'
export const CODE_LENGTH = 4
export const MAX_PLAYERS = 8

export type Peer = { id: string; name: string; online: boolean }

export type ClientMessage =
  | { t: 'host'; id: string; name: string }
  | { t: 'join'; code: string; id: string; name: string }
  | { t: 'send'; to?: string; data: unknown }
  | { t: 'ping' }

export type ServerMessage =
  | { t: 'pong' }
  | { t: 'room'; code: string; host: string; peers: Peer[] }
  | { t: 'peers'; peers: Peer[] }
  | { t: 'msg'; from: string; data: unknown }
  | { t: 'error'; reason: 'no-room' | 'full' | 'bad-message' }
