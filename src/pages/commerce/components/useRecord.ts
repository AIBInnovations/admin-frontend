import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { apiErrorInfo, apiErrorMessage } from '@/components/common/detail'

/**
 * Loads one record for a detail page. A failed refresh keeps what is on screen;
 * a late answer never replaces a newer one.
 */
export function useRecord<T>(key: string, fetcher: () => Promise<T>) {
  const [state, setState] = useState<{ key: string; data: T | null }>({ key, data: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ message: string; status?: number } | null>(null)
  const { nextFetchId, isStale } = useLatestFetch()

  const load = useCallback(async () => {
    const id = nextFetchId()
    setLoading(true)
    try {
      const data = await fetcher()
      if (isStale(id)) return
      setState({ key, data })
      setError(null)
    } catch (e) {
      if (!isStale(id)) setError({ message: apiErrorMessage(e, 'This record could not be loaded.'), status: apiErrorInfo(e).status })
    } finally {
      if (!isStale(id)) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nextFetchId, isStale])

  useEffect(() => { load() }, [load])

  return {
    // Never show the previous record under a new address.
    data: state.key === key ? state.data : null,
    loading,
    error,
    reload: load,
    setData: (data: T) => setState({ key, data }),
  }
}

interface Back { label: string; href: string }

/** Back to the list the admin came from, filters included; else the given list. */
export function useBack(fallback: Back): Back {
  const state = useLocation().state as { back?: Back } | null
  const back = state?.back
  return back && typeof back.label === 'string' && typeof back.href === 'string' && back.href.startsWith('/') && !back.href.startsWith('//') ? back : fallback
}
