import { Skeleton } from '@/components/ui/skeleton'

/** Shape of a list page, shown while its code loads. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-9 w-full max-w-xl" />
      <div className="space-y-px overflow-hidden rounded-lg border border-border bg-card p-4">
        {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="my-3 h-5 w-full" />)}
      </div>
    </div>
  )
}
