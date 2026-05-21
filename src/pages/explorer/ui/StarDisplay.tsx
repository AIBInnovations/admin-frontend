import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarDisplayProps {
  rating: number | null
  size?: 'sm' | 'md'
  className?: string
}

/** Read-only 5-star rating display (explorer-local). */
export function StarDisplay({ rating, size = 'sm', className }: StarDisplayProps) {
  const filled = Math.round(rating ?? 0)
  const px = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(px, i <= filled ? 'fill-amber-400 text-amber-400' : 'text-slate-300')}
        />
      ))}
    </span>
  )
}
