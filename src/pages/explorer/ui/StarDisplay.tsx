import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Read-only 5-star rating. */
export function StarDisplay({ rating, className }: { rating: number | null; className?: string }) {
  const filled = Math.round(rating ?? 0)
  return (
    <span role="img" aria-label={rating == null ? 'No rating' : `${rating.toFixed(1)} out of 5`} className={cn('inline-flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} aria-hidden="true" className={cn('h-3.5 w-3.5', i <= filled ? 'fill-warning text-warning' : 'text-border')} />
      ))}
    </span>
  )
}
