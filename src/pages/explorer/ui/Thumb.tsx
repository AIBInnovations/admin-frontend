import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ThumbProps {
  src?: string | null
  /** Shown when there is no image or it does not load. */
  fallback: ReactNode
  className?: string
}

/** Small picture beside a name. Decorative: the name is always next to it. */
export function Thumb({ src, fallback, className }: ThumbProps) {
  const [broken, setBroken] = useState<string | null>(null)
  const show = src && broken !== src
  return (
    <span aria-hidden="true" className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-xs font-semibold tabular-nums text-muted-foreground', className ?? 'h-9 w-9')}>
      {show ? <img src={src} alt="" loading="lazy" onError={() => setBroken(src)} className="h-full w-full object-cover" /> : fallback}
    </span>
  )
}

export const initials = (name: string) => name.trim().slice(0, 2).toUpperCase() || '?'
