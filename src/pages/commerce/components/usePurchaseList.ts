import { useCallback, useEffect, useState } from 'react'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { apiErrorMessage } from '@/components/common/detail'
import { paymentsService, type PurchaseListResult } from '@/services/payments.service'
import { purchaseQuery } from './PurchaseListFilters'
import type { useListUrl } from './useListUrl'

const PAGE_SIZE = 20

/** One page of purchases for the current URL. Old rows stay on a failed refresh. */
export function usePurchaseList(url: ReturnType<typeof useListUrl>, defaults: { type?: string; test?: 'include' | 'only' } = {}) {
  const [data, setData] = useState<PurchaseListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { nextFetchId, isStale } = useLatestFetch()
  const { params, page, setPage } = url
  const query = JSON.stringify(purchaseQuery(params, defaults))

  const load = useCallback(async () => {
    const id = nextFetchId()
    setLoading(true)
    try {
      const res = await paymentsService.getPurchases({ ...JSON.parse(query), page, limit: PAGE_SIZE })
      if (isStale(id)) return
      const result = res.data ?? null
      const last = result?.pagination.totalPages || 0
      if (result && page > 1 && last > 0 && page > last) { setPage(last); return }
      setData(result)
      setError(null)
    } catch (e) {
      if (!isStale(id)) setError(apiErrorMessage(e, 'The list could not be loaded.'))
    } finally {
      if (!isStale(id)) setLoading(false)
    }
  }, [query, page, setPage, nextFetchId, isStale])

  useEffect(() => { load() }, [load])

  return { data, loading, error, reload: load }
}
