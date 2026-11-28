import { Skeleton } from '@/components/ui/skeleton'

export type SkeletonShape = 'trend' | 'bars' | 'columns' | 'heatmap' | 'grid' | 'funnel' | 'segment' | 'block'

// Fixed, not random, so the shape does not change between renders
const BAR_WIDTHS = [92, 74, 61, 48, 37, 29, 22, 16]
const COLUMN_HEIGHTS = [34, 52, 41, 63, 48, 71, 58, 80, 66, 54, 76, 62]

/** A placeholder in the shape of the chart that is on its way, at the chart's own height. */
export function ChartSkeleton({ shape = 'block', height, label }: { shape?: SkeletonShape; height: number; label: string }) {
  const frame = { height }
  return (
    <div role="status" aria-label={`Loading ${label}`} className="relative w-full" style={frame}>
      {shape === 'trend' && (
        <div className="flex h-full flex-col">
          <div className="relative flex-1">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="absolute left-10 right-0 h-px rounded-none" style={{ top: `${12 + i * 26}%` }} />)}
            <svg aria-hidden="true" className="absolute inset-0 h-full w-full animate-pulse" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path d="M10,72 C22,64 28,70 36,58 S52,40 60,46 S78,30 86,34 L100,26 L100,100 L10,100 Z" fill="hsl(var(--muted))" />
              <path d="M10,72 C22,64 28,70 36,58 S52,40 60,46 S78,30 86,34 L100,26" fill="none" stroke="hsl(var(--border))" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <div className="mt-2 flex justify-between pl-10">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-3 w-10" />)}</div>
        </div>
      )}
      {shape === 'bars' && (
        <div className="flex h-full flex-col justify-start gap-3 overflow-hidden">
          {BAR_WIDTHS.slice(0, Math.max(3, Math.floor(height / 46))).map((w, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between"><Skeleton className="h-3.5" style={{ width: `${30 + (i % 3) * 12}%` }} /><Skeleton className="h-3.5 w-14" /></div>
              <Skeleton className="h-2.5" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      )}
      {shape === 'columns' && (
        <div className="flex h-full items-end gap-[6%] px-10 pb-6">
          {COLUMN_HEIGHTS.map((h, i) => <Skeleton key={i} className="flex-1 rounded-b-none" style={{ height: `${h}%` }} />)}
        </div>
      )}
      {shape === 'heatmap' && (
        <div className="grid h-full gap-[3px] pl-10" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))', gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}>
          {Array.from({ length: 168 }, (_, i) => <Skeleton key={i} className="rounded-[3px]" style={{ opacity: 0.45 + ((i * 37) % 11) / 20 }} />)}
        </div>
      )}
      {shape === 'grid' && (
        <div className="grid h-full gap-[3px]" style={{ gridTemplateColumns: '88px repeat(12, minmax(0, 1fr))', gridAutoRows: 'minmax(0, 1fr)' }}>
          {Array.from({ length: 13 * 6 }, (_, i) => <Skeleton key={i} className="rounded-[3px]" style={{ opacity: i % 13 === 0 ? 0.6 : Math.max(0.25, 1 - (i % 13) / 14) }} />)}
        </div>
      )}
      {shape === 'funnel' && (
        <div className="flex h-full flex-col justify-center gap-4">
          {[100, 42, 24].map((w, i) => <div key={i} className="space-y-1.5"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-7" style={{ width: `${w}%` }} /></div>)}
        </div>
      )}
      {shape === 'segment' && (
        <div className="flex h-full flex-col justify-center gap-3">
          <Skeleton className="h-7 w-full" />
          <div className="flex gap-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-3.5 w-24" />)}</div>
        </div>
      )}
      {shape === 'block' && <Skeleton className="h-full w-full rounded-lg" />}
    </div>
  )
}
