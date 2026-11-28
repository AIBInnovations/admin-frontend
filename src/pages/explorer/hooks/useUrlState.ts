import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/** One list setting (search, filter, tab) kept in the URL. Empty or default = not in the URL. */
export function useUrlState(key: string, fallback = ''): [string, (next: string) => void] {
  const [params, setParams] = useSearchParams()
  const value = params.get(key) ?? fallback
  const set = useCallback((next: string) => {
    setParams((prev) => {
      const p = new URLSearchParams(prev)
      if (!next || next === fallback) p.delete(key)
      else p.set(key, next)
      return p
    }, { replace: true, preventScrollReset: true })
  }, [key, fallback, setParams])
  return [value, set]
}

/** Drop several settings at once (two separate updates in a row would undo each other). */
export function useClearUrl(): (keys: string[]) => void {
  const [, setParams] = useSearchParams()
  return useCallback((keys: string[]) => {
    setParams((prev) => {
      const p = new URLSearchParams(prev)
      keys.forEach((k) => p.delete(k))
      return p
    }, { replace: true, preventScrollReset: true })
  }, [setParams])
}
