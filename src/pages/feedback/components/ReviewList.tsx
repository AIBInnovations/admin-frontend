import { Link, useLocation } from 'react-router-dom'
import { AlertCircle, Clock, MessageSquareText, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/common/detail'
import { StarDisplay } from '@/components/videoReviews/StarDisplay'
import type { FeedbackReview } from '@/services/feedback.service'
import { facultyName, istDay, pathText, PRIORITY_LABEL, STATUS_LABEL, STATUS_TONE } from '../lib'
import { StudentLink } from '@/components/students/StudentLink'

interface ReviewListProps {
  reviews: FeedbackReview[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  /** Shown when there are no rows. */
  empty: { title: string; description?: string; action?: React.ReactNode }
  selected?: Set<string>
  onSelect?: (id: string, on: boolean) => void
  /** Leave out what the page already says. */
  hideVideo?: boolean
  hideFaculty?: boolean
  skeletons?: number
}

/**
 * Reviews as an inbox: the comment is the thing to read, so it gets the width.
 * The whole row opens the review; the checkbox only selects it.
 */
export function ReviewList({ reviews, loading, error, onRetry, empty, selected, onSelect, hideVideo, hideFaculty, skeletons = 6 }: ReviewListProps) {
  const location = useLocation()
  const from = location.pathname + location.search

  if (loading && reviews.length === 0) {
    return (
      <ul role="status" aria-label="Loading reviews" className="divide-y divide-border">
        {Array.from({ length: skeletons }, (_, i) => (
          <li key={i} className="space-y-2 px-5 py-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-3 w-1/2" />
          </li>
        ))}
      </ul>
    )
  }

  if (error && reviews.length === 0) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <AlertCircle aria-hidden="true" className="h-7 w-7 text-danger" />
        <div>
          <p className="text-sm font-semibold">The reviews could not be loaded</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
        {onRetry && <Button variant="outline" size="sm" onClick={onRetry}><RotateCw className="h-3.5 w-3.5" />Try again</Button>}
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <MessageSquareText aria-hidden="true" className="h-8 w-8 text-muted-foreground/50" />
        <div>
          <p className="text-sm font-semibold">{empty.title}</p>
          {empty.description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{empty.description}</p>}
        </div>
        {empty.action}
      </div>
    )
  }

  return (
    <>
      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-danger-soft px-5 py-2.5 text-sm text-danger">
          <span>Could not refresh: {error}</span>
          {onRetry && <Button variant="outline" size="sm" onClick={onRetry}><RotateCw className="h-3.5 w-3.5" />Try again</Button>}
        </div>
      )}
      <ul className={cn('divide-y divide-border transition-opacity', loading && 'opacity-60')} aria-busy={loading || undefined}>
        {reviews.map((r) => {
          const low = r.rating !== null && r.rating <= 2
          const isSelected = selected?.has(r._id) ?? false
          const videoTitle = r.video?.title || 'Deleted video'
          return (
            <li key={r._id} className={cn('relative flex gap-3 px-5 py-4 transition-colors focus-within:bg-accent/60 hover:bg-accent/50', isSelected && 'bg-accent/60')}>
              {onSelect && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(v) => onSelect(r._id, v === true)}
                  aria-label={`Select the review of ${videoTitle} by ${r.user?.name || 'a deleted student'}`}
                  className="relative z-10 mt-0.5 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {r.rating === null ? <span className="text-xs text-muted-foreground">No rating</span> : (
                    <span className="inline-flex items-center gap-1.5">
                      <StarDisplay rating={r.rating} />
                      {low && <span className="text-xs font-semibold text-danger">Low rating</span>}
                    </span>
                  )}
                  {r.priority === 'high' && <StatusPill tone="danger">{PRIORITY_LABEL.high} priority</StatusPill>}
                  {r.overdue && <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger"><Clock aria-hidden="true" className="h-3.5 w-3.5" />Overdue since {istDay(r.action_due_at)}</span>}
                </div>
                <Link
                  to={`/feedback/${r._id}`}
                  state={{ from }}
                  className={cn('mt-1.5 block text-sm leading-relaxed after:absolute after:inset-0 after:content-[""]', r.feedback ? 'font-medium text-foreground' : 'text-muted-foreground')}
                >
                  <span className="line-clamp-3 break-words sm:line-clamp-2">{r.feedback || 'No comment, rating only'}</span>
                </Link>
                <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] text-muted-foreground">
                  {!hideVideo && <span className="max-w-full truncate font-medium text-foreground/80" title={pathText(r) || undefined}>{videoTitle}</span>}
                  {!hideVideo && !hideFaculty && <span aria-hidden="true">·</span>}
                  {!hideFaculty && <span className="truncate">{!r.video && !r.faculty ? 'Lecturer unknown' : facultyName(r.faculty)}</span>}
                  {(!hideVideo || !hideFaculty) && <span aria-hidden="true">·</span>}
                  <span className="relative z-10 min-w-0 truncate"><StudentLink student={r.user} fallback="Unnamed student" from="Feedback" /></span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={r.createdAt} className="whitespace-nowrap">{istDay(r.createdAt)}</time>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 sm:hidden">
                  <StatusPill tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</StatusPill>
                  {r.assigned_to && <span className="text-xs text-muted-foreground">{r.assigned_to.name}</span>}
                </div>
              </div>
              <div className="hidden w-36 shrink-0 flex-col items-end gap-1.5 text-right sm:flex">
                <StatusPill tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</StatusPill>
                <span className="max-w-full truncate text-xs text-muted-foreground">{r.assigned_to ? r.assigned_to.name : 'Not assigned'}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
