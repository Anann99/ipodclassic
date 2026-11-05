// Messages between browsers and the room relay (server/relay.ts). Shared by both sides.

/** Room codes use consonants only: quick to spell with the wheel, and no accidental words. */
export const CODE_LETTERS = 'BCDFGHJKLMNPQRSTVWXZ'
export const CODE_LENGTH = 4
export const MAX_PLAYERS = 8

export type Peer = { id: string; name: string; online: boolean }

/**
 * `id` is public (everyone in the room sees it); `key` is a secret the same tab sends again
 * when it reconnects, so nobody else can take over its id.
 */
export type ClientMessage =
  | { t: 'host'; id: string; key: string; name: string }
  | { t: 'join'; code: string; id: string; key: string; name: string }
  | { t: 'send'; to?: string; data: unknown }
  | { t: 'ping' }

export type ServerMessage =
  | { t: 'pong' }
  | { t: 'room'; code: string; host: string; peers: Peer[] }
  | { t: 'peers'; peers: Peer[] }
  | { t: 'msg'; from: string; data: unknown }
  | { t: 'error'; reason: 'no-room' | 'full' | 'taken' | 'replaced' | 'bad-message' }
