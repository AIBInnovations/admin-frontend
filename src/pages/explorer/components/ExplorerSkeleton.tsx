import { Skeleton } from '@/components/ui/skeleton'

export function ChildrenListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading" className="py-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4" style={{ width: `${40 + ((i * 17) % 35)}%` }} />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="hidden h-6 w-16 shrink-0 rounded-full @md:block" />
        </div>
      ))}
    </div>
  )
}

export function PanelSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-5 p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-24" /></div>
      </div>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-9 w-full" /></div>
      ))}
    </div>
  )
}
