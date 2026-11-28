import { BellRing, CalendarPlus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusPill } from '@/components/common/detail'
import { subscriptionLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import { formatExpiry, relativeTime } from '@/lib/relativeTime'
import type { SubscriptionRecord } from '@/services/subscriptions.service'
import { EXPIRY_TONE, TYPE_META } from './subscriptionType'
import { StudentLink } from '@/components/students/StudentLink'

interface SubscriptionRowProps {
  record: SubscriptionRecord
  selected: boolean
  /** Opens the purchase's full page. */
  onOpen: () => void
  /** Opens the extend panel beside the list. Left out when it cannot be extended. */
  onExtend?: () => void
  /** "Send reminder now" for this row. Left out when it cannot get a reminder. */
  onRemind?: () => void
  /** Ticked for a reminder to several at once. Left out when the row cannot be ticked. */
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const BY: Record<string, string> = { cron: 'daily reminder', admin: 'reminder run', manual: 'by hand' }

export function SubscriptionRow({ record, selected, onOpen, onExtend, onRemind, checked, onCheckedChange }: SubscriptionRowProps) {
  const { user } = record
  const expiry = formatExpiry(record.expires_at)
  const initials = (user?.name || '?').slice(0, 2).toUpperCase()
  const meta = TYPE_META[record.type]
  const TypeIcon = meta.icon
  const item = record.type === 'package' ? subscriptionLabel(record.item_name, record) : record.item_name || 'Deleted item'

  return (
    <div className={cn('relative mx-2 my-0.5 flex items-center gap-2 rounded-xl pr-2 transition-colors', selected ? 'bg-accent ring-1 ring-primary/30' : 'hover:bg-muted/60')}>
      {/* The whole row opens the purchase; the student's name above it opens the student */}
      <button type="button" onClick={onOpen} aria-label={`Open ${item} for ${user?.name || 'a deleted student'}`} className="absolute inset-0 rounded-xl" />
      {onCheckedChange && (
        <span className="relative flex shrink-0 items-center pl-3 pointer-coarse:pl-2">
          <Checkbox
            checked={!!checked}
            onCheckedChange={(v) => onCheckedChange(v === true)}
            aria-label={`Choose ${user?.name || 'this student'}, ${item}, for a reminder`}
            className="pointer-coarse:h-5 pointer-coarse:w-5"
          />
        </span>
      )}
      <div className={cn('pointer-events-none relative flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left', onCheckedChange ? 'pl-1 pr-3' : 'px-3')}>
        <Avatar className="h-9 w-9 shrink-0 rounded-lg">
          {user?.photo_url && <AvatarImage src={user.photo_url} alt="" />}
          <AvatarFallback className="rounded-lg bg-accent text-xs font-semibold text-accent-foreground">{initials}</AvatarFallback>
        </Avatar>

        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <StudentLink student={user} from="Subscriptions" className="pointer-events-auto max-w-full truncate text-sm" deletedClassName="max-w-full truncate text-sm" />
            <span className="inline-flex shrink-0 items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              <TypeIcon aria-hidden="true" className="h-3 w-3" />{meta.label}
            </span>
            {record.is_test && <StatusPill tone="warning" className="h-5 shrink-0 px-2 text-[11px]">Test</StatusPill>}
          </span>
          <span className="mt-0.5 block truncate text-[13px]">{item}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {user?.email || user?.phone_number || '—'}
            {record.from_combo && ', included with a combo'}
            {record.renewed && ', renewed'}
          </span>
          {record.last_reminder && (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground" title={record.last_reminder.sent_by_admin_name ? `Sent by ${record.last_reminder.sent_by_admin_name}` : undefined}>
              Reminded {relativeTime(record.last_reminder.at)} ({record.last_reminder.triggered_by === 'manual' && record.last_reminder.sent_by_admin_name ? `by ${record.last_reminder.sent_by_admin_name}` : BY[record.last_reminder.triggered_by] ?? 'daily reminder'})
            </span>
          )}
          <span className="mt-1.5 flex flex-wrap gap-1.5 sm:hidden">
            <StatusPill tone={EXPIRY_TONE[expiry.status]}>{expiry.relative}</StatusPill>
          </span>
        </span>

        <span className="hidden shrink-0 flex-col items-end gap-0.5 text-right sm:flex">
          <span className="flex flex-wrap justify-end gap-1.5">
            {record.dispute_status && <StatusPill tone={record.dispute_status === 'won' ? 'success' : record.dispute_status === 'lost' ? 'danger' : 'warning'}>Dispute {record.dispute_status}</StatusPill>}
            <StatusPill tone={EXPIRY_TONE[expiry.status]}>{expiry.relative}</StatusPill>
          </span>
          <span className="text-xs text-muted-foreground">{expiry.absolute}</span>
        </span>
      </div>
      {onRemind && (
        <Button type="button" variant="outline" size="sm" className="relative shrink-0" onClick={onRemind} aria-label={`Send reminder now to ${user?.name || 'this student'}, ${item}`}>
          <BellRing aria-hidden="true" /><span className="hidden md:inline">Remind</span>
        </Button>
      )}
      {onExtend && (
        <Button type="button" variant="outline" size="sm" className="relative shrink-0" onClick={onExtend} aria-label={`Extend ${user?.name || 'this student'}, ${item}`}>
          <CalendarPlus aria-hidden="true" /><span className="hidden md:inline">Extend</span>
        </Button>
      )}
    </div>
  )
}
