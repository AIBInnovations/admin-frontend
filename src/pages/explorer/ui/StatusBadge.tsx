import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type PublishStatus = 'draft' | 'published'
type ProcessingStatus = 'uploading' | 'processing' | 'ready' | 'failed' | 'upcoming'

interface StatusBadgeProps {
  className?: string
}

export function PublishBadge({ status, className }: { status: PublishStatus } & StatusBadgeProps) {
  const published = status === 'published'
  return (
    <Badge
      className={cn(
        'text-xs font-medium border-0',
        published
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-amber-100 text-amber-700',
        className,
      )}
    >
      {published ? 'Published' : 'Draft'}
    </Badge>
  )
}

export function ActiveBadge({ active, className }: { active: boolean } & StatusBadgeProps) {
  return (
    <Badge
      className={cn(
        'text-xs font-medium border-0',
        active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500',
        className,
      )}
    >
      {active ? 'Active' : 'Inactive'}
    </Badge>
  )
}

export function ProcessingBadge({
  status,
  className,
}: { status: ProcessingStatus } & StatusBadgeProps) {
  const config: Record<ProcessingStatus, { label: string; cls: string }> = {
    ready: { label: 'Ready', cls: 'bg-emerald-100 text-emerald-700' },
    processing: { label: 'Processing', cls: 'bg-blue-100 text-blue-600' },
    uploading: { label: 'Uploading', cls: 'bg-violet-100 text-violet-700' },
    upcoming: { label: 'Upcoming', cls: 'bg-orange-100 text-orange-700' },
    failed: { label: 'Failed', cls: 'bg-red-100 text-red-700' },
  }
  const { label, cls } = config[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return (
    <Badge className={cn('text-xs font-medium border-0', cls, className)}>
      {label}
    </Badge>
  )
}

export function SaleBadge({ className }: StatusBadgeProps) {
  return (
    <Badge className={cn('text-xs font-medium border-0 bg-rose-100 text-rose-700', className)}>
      Sale
    </Badge>
  )
}

export function FreeBadge({ className }: StatusBadgeProps) {
  return (
    <Badge className={cn('text-xs font-medium border-0 bg-teal-100 text-teal-700', className)}>
      Free
    </Badge>
  )
}

export function LinkedBadge({ className }: StatusBadgeProps) {
  return (
    <Badge className={cn('text-xs font-medium border-0 bg-indigo-100 text-indigo-700', className)}>
      Linked
    </Badge>
  )
}

export function ScheduledBadge({ dateIso, className }: { dateIso: string } & StatusBadgeProps) {
  const date = new Date(dateIso)
  const label = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  return (
    <Badge className={cn('text-xs font-medium border-0 bg-sky-100 text-sky-700', className)}>
      Scheduled · {label}
    </Badge>
  )
}

export function ComingSoonBadge({ className }: StatusBadgeProps) {
  return (
    <Badge className={cn('text-xs font-medium border-0 bg-orange-100 text-orange-700', className)}>
      Coming soon
    </Badge>
  )
}

export function FormatBadge({ format, className }: { format: string } & StatusBadgeProps) {
  return (
    <Badge className={cn('text-xs font-medium border-0 bg-slate-100 text-slate-700 uppercase tracking-wide', className)}>
      {format}
    </Badge>
  )
}
