import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { StatusPill } from '@/components/common/detail'
import { StarDisplay } from './StarDisplay'
import { istDay, STATUS_LABEL, STATUS_TONE } from '@/pages/feedback/lib'
import type { VideoReview } from '@/services/videoReviews.service'
import { ChevronDown, ChevronUp, Video as VideoIcon } from 'lucide-react'
import { StudentLink, openableRow } from '@/components/students/StudentLink'

interface ReviewListItemProps {
  review: VideoReview
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function ReviewListItem({ review }: ReviewListItemProps) {
  const [expanded, setExpanded] = useState(false)
  const hasFeedback = !!review.feedback
  const location = useLocation()
  const navigate = useNavigate()
  const from = location.pathname + location.search
  // The whole row opens the review; the student's name opens the student
  const row = openableRow(() => navigate(`/feedback/${review._id}`, { state: { from } }), 'flex gap-4 border-b border-border py-4 last:border-0')

  return (
    <div {...row}>
      {/* Video thumbnail */}
      <div className="h-14 w-20 shrink-0 overflow-hidden rounded bg-muted flex items-center justify-center">
        {review.video.thumbnail_url ? (
          <img
            src={review.video.thumbnail_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <VideoIcon className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Video title */}
        <p className="text-sm font-medium leading-tight truncate">
          <Link to={`/feedback/${review._id}`} state={{ from }} className="hover:text-primary hover:underline" title="Open this feedback">
            {review.video.title}
          </Link>
        </p>

        {/* Teacher row */}
        {review.faculty && (
          <div className="mt-1 flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              {review.faculty.photo_url && (
                <AvatarImage src={review.faculty.photo_url} alt={review.faculty.name} />
              )}
              <AvatarFallback className="text-[9px]">
                {getInitials(review.faculty.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">{review.faculty.name}</span>
          </div>
        )}

        {/* Context breadcrumb */}
        <p className="mt-0.5 text-xs text-muted-foreground truncate" title={`${review.package.name} › ${review.series.name} › ${review.module.name}`}>
          {review.package.name} › {review.series.name} › {review.module.name}
        </p>

        {/* Feedback */}
        {hasFeedback && (
          <div className="mt-2">
            <p
              className={`text-sm text-muted-foreground leading-relaxed ${
                !expanded ? 'line-clamp-1' : ''
              }`}
            >
              {review.feedback}
            </p>
            {(review.feedback?.length ?? 0) > 80 && (
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((e) => !e)}
                className="mt-0.5 flex items-center gap-0.5 text-xs text-primary hover:underline"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" /> Read more
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right column */}
      <div className="shrink-0 space-y-1 text-right">
        {review.rating !== null ? (
          <StarDisplay rating={review.rating} size="sm" className="justify-end" />
        ) : (
          <span className="text-xs text-muted-foreground">No rating</span>
        )}
        {review.status && <StatusPill tone={STATUS_TONE[review.status]}>{STATUS_LABEL[review.status]}</StatusPill>}
        <p className="ml-auto max-w-[120px] truncate text-xs"><StudentLink student={review.user} fallback="Unnamed student" from="Video reviews" className="text-xs" /></p>
        <p className="text-xs text-muted-foreground">
          {istDay(review.feedback_submitted_at ?? review.rating_submitted_at ?? review.createdAt)}
        </p>
      </div>
    </div>
  )
}
