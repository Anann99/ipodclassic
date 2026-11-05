// Persistent key-value storage. Storage can be unavailable (private mode, blocked site data),
// so refused writes are kept in memory and nothing ever throws.

const memory = new Map<string, string>()
const PREFIX = 'wheel:'

export function load<T>(key: string, fallback: T): T {
  // A write that storage refused (full, or private mode) is kept here and wins.
  let raw: string | null | undefined = memory.get(key)
  if (raw === undefined) {
    try {
      raw = localStorage.getItem(PREFIX + key)
    } catch {}
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
  try {
    localStorage.setItem(PREFIX + key, raw)
    memory.delete(key)
  } catch {
    memory.set(key, raw)
  }
}
