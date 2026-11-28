import { useCallback, useEffect, useState } from 'react'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { apiErrorMessage } from '@/components/common/detail'
import type { ApiResponse } from '@/services/api.service'

/**
 * Load something that depends on `key`. Late answers are dropped, the last good
 * data stays on screen while a new one loads or when a refresh fails.
 */
export function useRemote<T>(key: string, load: () => Promise<ApiResponse<T>>) {
  const { nextFetchId, isStale } = useLatestFetch()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ message: string; status?: number } | null>(null)

  const refresh = useCallback(async () => {
    const id = nextFetchId()
    setLoading(true)
    try {
      const res = await load()
      if (isStale(id)) return
      if (!res.success || res.data === undefined) throw new Error(res.message)
      setData(res.data)
      setError(null)
    } catch (err) {
      if (isStale(id)) return
      setError({ message: apiErrorMessage(err), status: (err as { status?: number })?.status })
    } finally {
      if (!isStale(id)) setLoading(false)
    }
    // `load` is rebuilt every render; the key says when its inputs changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nextFetchId, isStale])

  useEffect(() => { refresh() }, [refresh])
  return { data, setData, loading, error, refresh }
}

/** Reads and writes filters in the URL. An empty value removes the parameter. */
export function patchParams(params: URLSearchParams, patch: Record<string, string | null | undefined>, keepPage = false): URLSearchParams {
  const next = new URLSearchParams(params)
  if (!keepPage) next.delete('page')
  for (const [k, v] of Object.entries(patch)) {
    if (v) next.set(k, v)
    else next.delete(k)
  }
  return next
}

export const pageOf = (params: URLSearchParams) => {
  const n = Number(params.get('page'))
  return Number.isInteger(n) && n > 0 ? n : 1
}
