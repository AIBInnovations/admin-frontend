import { useCallback, useState } from 'react'

/**
 * useState that remembers its value in localStorage, for per-admin view
 * preferences (rail collapsed, open groups, a chosen tab). Storage can be
 * blocked or full, so every access is guarded and the page works without it.
 */
export function usePersistentState<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
      try { localStorage.setItem(key, JSON.stringify(resolved)) } catch { /* storage unavailable */ }
      return resolved
    })
  }, [key])

  return [value, set]
}
