import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarDisplayProps {
  rating: number | null
  size?: 'sm' | 'md'
  className?: string
}

export function StarDisplay({ rating, size = 'sm', className }: StarDisplayProps) {
  const filled = Math.round(rating ?? 0)
  const px = size === 'sm' ? 12 : 16

  return (
    <div
      role="img"
      aria-label={rating === null ? 'Not rated' : `${Number.isInteger(rating) ? rating : rating.toFixed(1)} out of 5 stars`}
      className={cn('flex items-center gap-0.5', className)}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          style={{ width: px, height: px }}
          className={i < filled ? 'fill-warning text-warning' : 'fill-none text-muted-foreground/40'}
        />
      ))}
    </div>
  )
}
