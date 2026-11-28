import { StatusPill, type Tone } from '@/components/common/detail'
import { formatDay } from '@/lib/format'

type PublishStatus = 'draft' | 'published'
export type ProcessingStatus = 'uploading' | 'processing' | 'ready' | 'failed' | 'upcoming'

interface BadgeProps { className?: string }

export function PublishBadge({ status, className }: { status: PublishStatus } & BadgeProps) {
  return <StatusPill tone={status === 'published' ? 'success' : 'warning'} className={className}>{status === 'published' ? 'Published' : 'Draft'}</StatusPill>
}

export function ActiveBadge({ active, className }: { active: boolean } & BadgeProps) {
  return <StatusPill tone={active ? 'info' : 'neutral'} className={className}>{active ? 'Active' : 'Inactive'}</StatusPill>
}

const PROCESSING: Record<ProcessingStatus, { label: string; tone: Tone }> = {
  ready: { label: 'Ready', tone: 'success' },
  processing: { label: 'Processing', tone: 'info' },
  uploading: { label: 'Uploading', tone: 'info' },
  upcoming: { label: 'Upcoming', tone: 'warning' },
  failed: { label: 'Failed', tone: 'danger' },
}

export function ProcessingBadge({ status, className }: { status: ProcessingStatus } & BadgeProps) {
  const { label, tone } = PROCESSING[status] ?? { label: status, tone: 'neutral' as Tone }
  return <StatusPill tone={tone} className={className}>{label}</StatusPill>
}

export const SaleBadge = ({ className }: BadgeProps) => <StatusPill tone="info" className={className}>Sale</StatusPill>
export const FreeBadge = ({ className }: BadgeProps) => <StatusPill tone="success" className={className}>Free</StatusPill>
export const EbookBadge = ({ className }: BadgeProps) => <StatusPill tone="info" className={className}>eBook</StatusPill>
export const LinkedBadge = ({ className }: BadgeProps) => <StatusPill tone="info" className={className}>Linked</StatusPill>
export const ComboBadge = ({ className }: BadgeProps) => <StatusPill tone="info" className={className}>Combo</StatusPill>
export const UnavailableBadge = ({ className }: BadgeProps) => <StatusPill className={className}>Unavailable</StatusPill>

export function ScheduledBadge({ dateIso, className }: { dateIso: string } & BadgeProps) {
  return <StatusPill tone="warning" className={className}>Scheduled · {formatDay(dateIso)}</StatusPill>
}

export function FormatBadge({ format, className }: { format?: string | null } & BadgeProps) {
  return format ? <StatusPill className={className}>{format.toUpperCase()}</StatusPill> : null
}
