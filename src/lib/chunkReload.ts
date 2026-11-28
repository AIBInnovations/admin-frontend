/**
 * Recovery from a stale bundle after a deploy (production readiness, 27 Nov 2026).
 *
 * A deploy replaces dist/ and the old hashed chunks are gone. A tab opened
 * before the deploy still runs the old index-*.js, so the first time it opens a
 * page it has not visited yet, the lazy chunk it asks for no longer exists and
 * the page fails with "Failed to fetch dynamically imported module". Loading
 * the page again fetches the new index.html, and it works.
 *
 * The reload happens at most once per bundle version (a sessionStorage guard),
 * never while offline, and never without storage, so a chunk that is really
 * broken shows its error instead of reloading in a loop.
 */

const STORAGE_KEY = 'pgme-admin:chunk-reload'

/** The URL of the bundle running this code; every build gives it a new hash. */
const VERSION: string = import.meta.url

const CHUNK_ERROR =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError|Loading (CSS )?chunk [\w-]+ failed/i

/** True for the errors a missing or unreachable lazy chunk produces (Chrome, Firefox, Safari, Vite). */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'string') return CHUNK_ERROR.test(error)
  const e = error as { name?: unknown; message?: unknown }
  return CHUNK_ERROR.test(`${String(e.name ?? '')} ${String(e.message ?? '')}`)
}

/** Reloads the page once for this bundle version. Returns whether it did. */
export function reloadOnceForNewVersion(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false
  try {
    if (window.sessionStorage.getItem(STORAGE_KEY) === VERSION) return false
    window.sessionStorage.setItem(STORAGE_KEY, VERSION)
  } catch {
    return false
  }
  window.location.reload()
  return true
}

/** For React's root error callbacks: the router's error boundary catches lazy failures. */
export function handleChunkError(error: unknown): void {
  if (isChunkLoadError(error)) reloadOnceForNewVersion()
}

let installed = false

/** Listens for chunk failures outside React. Call once, before rendering. */
export function installChunkReload(): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  // Vite fires this when a dynamic import, or a file it preloads, fails.
  // The error is not prevented: if no reload happens it still reaches the page.
  window.addEventListener('vite:preloadError', () => {
    reloadOnceForNewVersion()
  })
  // A dynamic import that failed and that nothing caught
  window.addEventListener('unhandledrejection', (event) => {
    handleChunkError(event.reason)
  })
}
