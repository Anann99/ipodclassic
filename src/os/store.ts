// Persistent key-value storage. Storage can be unavailable (private mode, blocked site data),
// so every access falls back to memory and never throws.

const memory = new Map<string, string>()
const PREFIX = 'wheel:'

export function load<T>(key: string, fallback: T): T {
  let raw: string | null | undefined
  try {
    raw = localStorage.getItem(PREFIX + key)
  } catch {
    raw = memory.get(key)
  }
  if (raw == null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown): void {
  const raw = JSON.stringify(value)
  memory.set(key, raw)
  try {
    localStorage.setItem(PREFIX + key, raw)
  } catch {}
}
