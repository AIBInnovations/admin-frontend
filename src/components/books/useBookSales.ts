import { useCallback, useEffect, useState } from 'react'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { booksService, type BookSales } from '@/services/books.service'
import { errorText } from './bookDisplay'

/** Sales of one book, for a range of IST days or for all time. */
export function useBookSales(bookId: string | undefined, from = '', to = '') {
  const [sales, setSales] = useState<BookSales | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { nextFetchId, isStale } = useLatestFetch()

  const reload = useCallback(async () => {
    if (!bookId) return
    const id = nextFetchId()
    setLoading(true)
    try {
      const res = await booksService.getSales(bookId, from && to ? { from, to } : {})
      if (isStale(id)) return
      if (!res.success || !res.data) throw new Error(res.message || 'Sales could not be loaded.')
      setSales(res.data)
      setError(null)
    } catch (err) {
      if (!isStale(id)) setError(errorText(err, 'Sales could not be loaded.'))
    } finally {
      if (!isStale(id)) setLoading(false)
    }
  }, [bookId, from, to, nextFetchId, isStale])

  useEffect(() => { void reload() }, [reload])
  return { sales, loading, error, reload }
}
