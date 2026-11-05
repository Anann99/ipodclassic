import { orbit } from './orbit/index.ts'
import { quiz } from './quiz/index.ts'
import type { Game } from './types.ts'

/** Every game on the device, in home menu order. */
export const games: Game[] = [orbit, quiz]
