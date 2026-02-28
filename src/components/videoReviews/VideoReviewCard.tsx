import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { StarDisplay } from './StarDisplay'
import type { VideoSummary } from '@/services/videoReviews.service'
import { Video as VideoIcon, MessageSquare, Star } from 'lucide-react'

interface VideoReviewCardProps {
  summary: VideoSummary
  onClick: () => void
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function VideoReviewCard({ summary, onClick }: VideoReviewCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow duration-200 hover:border-primary/30"
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Thumbnail */}
        <div className="aspect-video w-full overflow-hidden rounded bg-muted flex items-center justify-center">
          {summary.video.thumbnail_url ? (
            <img
              src={summary.video.thumbnail_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <VideoIcon className="h-8 w-8 text-muted-foreground" />
          )}
        </div>

        {/* Video title */}
        <p className="mt-3 text-sm font-semibold leading-snug line-clamp-2">{summary.video.title}</p>

        {/* Teacher */}
        {summary.faculty && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              {summary.faculty.photo_url && (
                <AvatarImage src={summary.faculty.photo_url} alt={summary.faculty.name} />
              )}
              <AvatarFallback className="text-[9px]">
                {getInitials(summary.faculty.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">{summary.faculty.name}</span>
          </div>
        )}

        {/* Package context */}
        <p className="mt-0.5 text-xs text-muted-foreground/70 truncate">{summary.package.name}</p>

        {/* Stats */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <StarDisplay rating={summary.avg_rating} size="sm" />
            {summary.avg_rating !== null && (
              <span className="text-xs font-medium">{summary.avg_rating.toFixed(1)}</span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{summary.review_count} reviews</span>
        </div>

        {/* Sub-stats */}
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground/70">
          <span className="flex items-center gap-0.5">
            <Star className="h-3 w-3" />
            {summary.rating_count}
          </span>
          <span className="flex items-center gap-0.5">
            <MessageSquare className="h-3 w-3" />
            {summary.feedback_count}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
