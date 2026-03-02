import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ReviewListItem } from './ReviewListItem'
import { videoReviewsService } from '@/services/videoReviews.service'
import type { VideoReview } from '@/services/videoReviews.service'
import { ArrowLeft, MessageSquare, Search } from 'lucide-react'
import { toast } from 'sonner'

interface ReviewDrillDownViewProps {
  type: 'video' | 'teacher'
  id: string
  label: string
  onBack: () => void
}

export function ReviewDrillDownView({ type, id, label, onBack }: ReviewDrillDownViewProps) {
  const [reviews, setReviews] = useState<VideoReview[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20, search: search || undefined }
      const res =
        type === 'video'
          ? await videoReviewsService.getVideoReviews(id, params)
          : await videoReviewsService.getTeacherReviews(id, params)

      if (res.success && res.data) {
        setReviews(res.data.reviews)
        setTotalPages(res.data.pagination.totalPages)
        setTotal(res.data.pagination.total)
      } else {
        toast.error(res.message || 'Failed to load reviews')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }, [type, id, page, search])

  useEffect(() => {
    fetch()
  }, [fetch])

  // Reset page on search change
  useEffect(() => {
    setPage(1)
  }, [search])

  return (
    <div className="space-y-4">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="min-w-0">
          <h2 className="text-base font-semibold truncate">{label}</h2>
          {!loading && (
            <p className="text-xs text-muted-foreground">{total} review{total !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search reviews..."
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
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No reviews found</p>
            {search && (
              <p className="text-xs text-muted-foreground/70 mt-1">
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
