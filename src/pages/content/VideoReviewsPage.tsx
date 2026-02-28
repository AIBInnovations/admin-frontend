import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ViewModeToggle } from '@/components/videoReviews/ViewModeToggle'
import { ReviewListItem } from '@/components/videoReviews/ReviewListItem'
import { VideoReviewCard } from '@/components/videoReviews/VideoReviewCard'
import { TeacherReviewCard } from '@/components/videoReviews/TeacherReviewCard'
import { ReviewDrillDownView } from '@/components/videoReviews/ReviewDrillDownView'
import {
  videoReviewsService,
  type VideoReview,
  type VideoSummary,
  type TeacherSummary,
} from '@/services/videoReviews.service'
import type { ViewMode } from '@/components/videoReviews/ViewModeToggle'
import { toast } from 'sonner'
import { Search, MessageSquare } from 'lucide-react'

// ─── Drill-down state ─────────────────────────────────────────────────────────

type DrillDown =
  | { type: 'none' }
  | { type: 'video'; id: string; label: string }
  | { type: 'teacher'; id: string; label: string }

// ─── Skeleton helpers ─────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 py-4 border-b border-border last:border-0">
          <Skeleton className="h-14 w-20 rounded shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
          </div>
          <div className="shrink-0 space-y-2 text-right">
            <Skeleton className="h-3 w-20 ml-auto" />
            <Skeleton className="h-3 w-16 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  )
}

function CardGridSkeleton({ cols = 3 }: { cols?: number }) {
  return (
    <div
      className={`grid gap-4 grid-cols-1 sm:grid-cols-2 ${
        cols === 4 ? 'lg:grid-cols-3 xl:grid-cols-4' : 'lg:grid-cols-3'
      }`}
    >
      {Array.from({ length: cols * 2 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-4 space-y-3">
          {cols === 4 && <Skeleton className="aspect-video w-full rounded" />}
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  )
}

function EmptyReviews({ search }: { search: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
      <p className="text-sm font-medium text-muted-foreground">No reviews found</p>
      {search ? (
        <p className="text-xs text-muted-foreground/70 mt-1">
          Try adjusting your search term
        </p>
      ) : (
        <p className="text-xs text-muted-foreground/70 mt-1">
          Reviews will appear here once users start rating videos
        </p>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function VideoReviewsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [drillDown, setDrillDown] = useState<DrillDown>({ type: 'none' })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Data per mode
  const [reviews, setReviews] = useState<VideoReview[]>([])
  const [videoSummaries, setVideoSummaries] = useState<VideoSummary[]>([])
  const [teacherSummaries, setTeacherSummaries] = useState<TeacherSummary[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      if (viewMode === 'list') {
        const res = await videoReviewsService.getList({ page, limit: 20, search: search || undefined })
        if (res.success && res.data) {
          setReviews(res.data.reviews)
          setTotalPages(res.data.pagination.totalPages)
          setTotal(res.data.pagination.total)
        }
      } else if (viewMode === 'by-video') {
        const res = await videoReviewsService.getByVideo({ page, limit: 12, search: search || undefined })
        if (res.success && res.data) {
          setVideoSummaries(res.data.videos)
          setTotalPages(res.data.pagination.totalPages)
          setTotal(res.data.pagination.total)
        }
      } else {
        const res = await videoReviewsService.getByTeacher({ page, limit: 12, search: search || undefined })
        if (res.success && res.data) {
          setTeacherSummaries(res.data.teachers)
          setTotalPages(res.data.pagination.totalPages)
          setTotal(res.data.pagination.total)
        }
      }
    } catch {
      toast.error('Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }, [viewMode, page, search])

  useEffect(() => {
    if (drillDown.type === 'none') {
      fetchData()
    }
  }, [fetchData, drillDown.type])

  // Reset page when mode or search changes
  useEffect(() => {
    setPage(1)
  }, [viewMode, search])

  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    setDrillDown({ type: 'none' })
  }

  // ── Drill-down ──────────────────────────────────────────────────────────────
  if (drillDown.type !== 'none') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Video Reviews"
          breadcrumbs={[
            { label: 'Dashboard', href: '/' },
            { label: 'Content' },
            { label: 'Video Reviews' },
          ]}
        />
        <ReviewDrillDownView
          type={drillDown.type}
          id={drillDown.id}
          label={drillDown.label}
          onBack={() => setDrillDown({ type: 'none' })}
        />
      </div>
    )
  }

  // ── Main view ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="Video Reviews"
        description="View ratings and feedback submitted by users for video lectures"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Content' },
          { label: 'Video Reviews' },
        ]}
      />

      {/* Toolbar: mode toggle + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <ViewModeToggle value={viewMode} onChange={handleModeChange} />
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              viewMode === 'list'
                ? 'Search by user, teacher, video, package...'
                : viewMode === 'by-video'
                ? 'Search by video title, teacher, package...'
                : 'Search by teacher name...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {!loading && (
          <p className="text-xs text-muted-foreground shrink-0 sm:ml-auto">
            {total} {total === 1 ? 'result' : 'results'}
          </p>
        )}
      </div>

      {/* Content */}
      {viewMode === 'list' && (
        <div>
          {loading ? (
            <ListSkeleton />
          ) : reviews.length === 0 ? (
            <EmptyReviews search={search} />
          ) : (
            <div>
              {reviews.map((r) => (
                <ReviewListItem key={r._id} review={r} />
              ))}
            </div>
          )}
        </div>
      )}

      {viewMode === 'by-video' && (
        <div>
          {loading ? (
            <CardGridSkeleton cols={4} />
          ) : videoSummaries.length === 0 ? (
            <EmptyReviews search={search} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videoSummaries.map((s) => (
                <VideoReviewCard
                  key={s.video._id}
                  summary={s}
                  onClick={() =>
                    setDrillDown({
                      type: 'video',
                      id: s.video._id,
                      label: `Reviews for: ${s.video.title}`,
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {viewMode === 'by-teacher' && (
        <div>
          {loading ? (
            <CardGridSkeleton cols={3} />
          ) : teacherSummaries.length === 0 ? (
            <EmptyReviews search={search} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teacherSummaries.map((s) => (
                <TeacherReviewCard
                  key={s.faculty._id}
                  summary={s}
                  onClick={() =>
                    setDrillDown({
                      type: 'teacher',
                      id: s.faculty._id,
                      label: `Reviews for: ${s.faculty.name}`,
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && drillDown.type === 'none' && (
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
