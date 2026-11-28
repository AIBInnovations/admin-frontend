import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ReviewListItem } from './ReviewListItem'
import { videoReviewsService } from '@/services/videoReviews.service'
import type { VideoReview } from '@/services/videoReviews.service'
import { apiErrorMessage, ErrorState } from '@/components/common/detail'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { ArrowLeft, MessageSquare, Search } from 'lucide-react'

interface ReviewDrillDownViewProps {
  type: 'video' | 'teacher'
  id: string
  /** Known when it was opened from a card; after a reload it comes from the reviews. */
  label?: string
  onBack: () => void
}

export function ReviewDrillDownView({ type, id, label, onBack }: ReviewDrillDownViewProps) {
  const [reviews, setReviews] = useState<VideoReview[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { nextFetchId, isStale } = useLatestFetch()
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  const fetch = useCallback(async () => {
    const fetchId = nextFetchId()
    setLoading(true)
    try {
      const params = { page, limit: 20, search: query || undefined }
      const res =
        type === 'video'
          ? await videoReviewsService.getVideoReviews(id, params)
          : await videoReviewsService.getTeacherReviews(id, params)
      if (isStale(fetchId)) return
      if (!res.success || !res.data) throw new Error(res.message)
      setReviews(res.data.reviews)
      setTotalPages(res.data.pagination.totalPages)
      setTotal(res.data.pagination.total)
      setError(null)
    } catch (err) {
      if (!isStale(fetchId)) setError(apiErrorMessage(err, 'Failed to load reviews'))
    } finally {
      if (!isStale(fetchId)) setLoading(false)
    }
  }, [type, id, page, query, nextFetchId, isStale])

  useEffect(() => {
    fetch()
  }, [fetch])

  // Reset page on search change
  useEffect(() => {
    setPage(1)
  }, [query])

  const name = type === 'video' ? reviews[0]?.video.title : reviews[0]?.faculty?.name
  const title = label ?? (name ? `Reviews for: ${name}` : 'Reviews')

  return (
    <div className="space-y-4">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="min-w-0">
          <h2 className="text-base font-semibold truncate">{title}</h2>
          {!loading && (
            <p className="text-xs text-muted-foreground">{total} review{total !== 1 ? 's' : ''}</p>
          )}
        </div>
        <Button asChild variant="outline" size="sm" className="ml-auto shrink-0">
          <Link to={type === 'video' ? `/feedback/videos/${id}` : `/feedback/faculty/${id}`}>Open in Feedback</Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search reviews..."
          aria-label="Search reviews"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* List */}
      <div>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-4 border-b border-border">
                <Skeleton className="h-14 w-20 rounded shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState title="The reviews could not be loaded" message={error} onRetry={fetch} />
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No reviews found</p>
            {query && (
              <p className="text-xs text-muted-foreground mt-1">
                Try adjusting your search
              </p>
            )}
          </div>
        ) : (
          <div>
            {reviews.map((r) => (
              <ReviewListItem key={r._id} review={r} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
