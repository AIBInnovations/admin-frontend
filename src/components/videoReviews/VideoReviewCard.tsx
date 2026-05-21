import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { StarDisplay } from './StarDisplay'
import type { VideoSummary } from '@/services/videoReviews.service'
import { Video as VideoIcon, MessageSquare, Star, Eye, Users, Clock } from 'lucide-react'

interface VideoReviewCardProps {
  summary: VideoSummary
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

// Compact watch-time formatter (avg seconds per unique viewer).
function formatWatch(seconds: number): string {
  if (!seconds || seconds < 1) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${s}s`
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

        {/* View metrics: plays / unique viewers / avg watch time */}
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1" title="Plays">
            <Eye className="h-3 w-3" />
            {(summary.video.view_count ?? 0).toLocaleString('en-IN')}
          </span>
          <span className="flex items-center gap-1" title="Unique viewers">
            <Users className="h-3 w-3" />
            {(summary.video.unique_viewer_count ?? 0).toLocaleString('en-IN')}
          </span>
          <span className="flex items-center gap-1" title="Avg watch time per viewer">
            <Clock className="h-3 w-3" />
            {formatWatch(
              Math.round(
                (summary.video.total_watch_seconds ?? 0) /
                  Math.max(summary.video.unique_viewer_count ?? 0, 1)
              )
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
