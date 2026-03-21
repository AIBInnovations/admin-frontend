import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { StarDisplay } from './StarDisplay'
import type { TeacherSummary } from '@/services/videoReviews.service'
import { MessageSquare, Star, Video as VideoIcon } from 'lucide-react'

interface TeacherReviewCardProps {
  summary: TeacherSummary
  onClick: () => void
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

export function TeacherReviewCard({ summary, onClick }: TeacherReviewCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow duration-200 hover:border-primary/30"
      onClick={onClick}
    >
      <CardContent className="p-4 flex gap-4">
        {/* Avatar */}
        <Avatar className="h-12 w-12 shrink-0">
          {summary.faculty.photo_url && (
            <AvatarImage src={summary.faculty.photo_url} alt={summary.faculty.name} />
          )}
          <AvatarFallback className="text-sm font-medium">
            {getInitials(summary.faculty.name)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{summary.faculty.name}</p>

          {/* Rating */}
          <div className="mt-1 flex items-center gap-1.5">
            <StarDisplay rating={summary.avg_rating} size="sm" />
            {summary.avg_rating !== null && (
              <span className="text-xs font-medium">{summary.avg_rating.toFixed(1)}</span>
            )}
          </div>

          {/* Count summary */}
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.review_count} reviews across {summary.video_count}{' '}
            {summary.video_count === 1 ? 'video' : 'videos'}
          </p>

          {/* Sub-stats */}
          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground/70">
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3" />
              {summary.rating_count} ratings
            </span>
            <span className="flex items-center gap-0.5">
              <MessageSquare className="h-3 w-3" />
              {summary.feedback_count} feedback
            </span>
            <span className="flex items-center gap-0.5">
              <VideoIcon className="h-3 w-3" />
              {summary.video_count}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
