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
    <div className={cn('flex items-center gap-0.5', className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          style={{ width: px, height: px }}
          className={
            i < filled
              ? 'fill-amber-400 text-amber-400'
              : 'fill-none text-muted-foreground/40'
          }
        />
      ))}
    </div>
  )
}
