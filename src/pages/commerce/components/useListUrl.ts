import { useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useServerSearch } from '@/hooks/useServerSearch'

/**
 * List state that lives in the URL: filters, search and page. Back, refresh and
 * sharing a link all keep the view. Changing a filter goes back to page 1.
 */
export function useListUrl() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Math.floor(Number(params.get('page'))) || 1)
  const latest = useRef(params)
  latest.current = params

  const update = useCallback((patch: Record<string, string | null | undefined>) => {
    const next = new URLSearchParams(latest.current)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === '') next.delete(k)
      else next.set(k, v)
    }
    if (!('page' in patch)) next.delete('page')
    latest.current = next
    setParams(next, { replace: true })
  }, [setParams])

  const replaceAll = useCallback((next: URLSearchParams) => {
    latest.current = next
    setParams(next, { replace: true })
  }, [setParams])

  const setPage = useCallback((p: number) => update({ page: p > 1 ? String(p) : null }), [update])

  const { inputValue, setInputValue, debouncedSearch } = useServerSearch(params.get('search') || '')
  const search = params.get('search') || ''
  useEffect(() => {
    if (debouncedSearch !== (latest.current.get('search') || '')) update({ search: debouncedSearch || null })
  }, [debouncedSearch, update])

  return { params, page, setPage, update, replaceAll, search, searchInput: inputValue, setSearchInput: setInputValue }
}
