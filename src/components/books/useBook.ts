import { useCallback, useEffect, useState } from 'react'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { booksService, type Book } from '@/services/books.service'
import { errorText, isNotFound } from './bookDisplay'

/** One book. Keeps what is on screen when a refresh fails. */
export function useBook(bookId: string | undefined) {
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ message: string; notFound: boolean; forbidden: boolean } | null>(null)
  const { nextFetchId, isStale } = useLatestFetch()

  const reload = useCallback(async () => {
    if (!bookId) return
    const id = nextFetchId()
    setLoading(true)
    try {
      const res = await booksService.getById(bookId)
      if (isStale(id)) return
      if (!res.success || !res.data) throw new Error(res.message || 'This book could not be loaded.')
      setBook(res.data)
      setError(null)
    } catch (err) {
      if (isStale(id)) return
      setError({
        message: errorText(err, 'This book could not be loaded.'),
        notFound: isNotFound(err),
        forbidden: (err as { status?: number })?.status === 403,
      })
    } finally {
      if (!isStale(id)) setLoading(false)
    }
  }, [bookId, nextFetchId, isStale])

  useEffect(() => { setBook(null); setError(null); void reload() }, [reload])
  return { book, setBook, loading, error, reload }
}
