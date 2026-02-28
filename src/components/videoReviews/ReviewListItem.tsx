import { useState } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { StarDisplay } from './StarDisplay'
import type { VideoReview } from '@/services/videoReviews.service'
import { ChevronDown, ChevronUp, Video as VideoIcon } from 'lucide-react'

interface ReviewListItemProps {
  review: VideoReview
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getInitials(name: string) {
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

  return (
    <div className="flex gap-4 border-b border-border py-4 last:border-0">
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
        <p className="text-sm font-medium leading-tight truncate">{review.video.title}</p>

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
        <p className="mt-0.5 text-xs text-muted-foreground/70 truncate">
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
      <div className="shrink-0 text-right space-y-1">
        {review.rating !== null ? (
          <StarDisplay rating={review.rating} size="sm" className="justify-end" />
        ) : (
          <span className="text-xs text-muted-foreground/50">No rating</span>
        )}
        <p className="text-xs font-medium truncate max-w-[120px] ml-auto">{review.user.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(review.feedback_submitted_at ?? review.rating_submitted_at ?? review.createdAt)}
        </p>
      </div>
    </div>
  )
}
