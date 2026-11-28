/**
 * Explorer cache. Lives outside React because the page is remounted for every
 * folder, and moving around should feel instant: the last known content shows
 * at once and is refreshed behind it.
 *
 * Each key has its own request number, so a slow old answer can never replace
 * a newer one, and a folder's answer can never land in another folder.
 */
export interface LoadError { status?: number; message: string }
export interface Entry<T = unknown> { data?: T; error?: LoadError; loading: boolean }

const entries = new Map<string, Entry>()
const requests = new Map<string, number>()
const listeners = new Set<() => void>()
let version = 0
let owner: string | null = null

const EMPTY: Entry = { loading: false }

function emit() {
  version += 1
  listeners.forEach((l) => l())
}

export const explorerCache = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => { listeners.delete(l) }
  },
  version: () => version,
  get<T>(key: string): Entry<T> { return (entries.get(key) ?? EMPTY) as Entry<T> },

  /** Another admin signed in on this browser: start clean. */
  setOwner(next: string) {
    if (owner === next) return
    if (owner !== null) { entries.clear(); requests.clear() }
    owner = next
  },

  async load<T>(key: string, fetcher: () => Promise<T>): Promise<void> {
    const request = (requests.get(key) ?? 0) + 1
    requests.set(key, request)
    const before = entries.get(key)
    entries.set(key, { data: before?.data, error: before?.error, loading: true })
    emit()
    try {
      const data = await fetcher()
      if (requests.get(key) !== request) return
      entries.set(key, { data, loading: false })
    } catch (err) {
      if (requests.get(key) !== request) return
      const e = err as Error & { status?: number }
      // Gone or forbidden: old data would be wrong. Anything else: keep showing it.
      const keep = e.status !== 404 && e.status !== 403 && e.status !== 400
      entries.set(key, { data: keep ? before?.data : undefined, error: { status: e.status, message: e.message || 'This could not be loaded.' }, loading: false })
    }
    emit()
  },
}
