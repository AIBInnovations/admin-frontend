import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatExpiry, EXPIRY_BADGE_CLASS } from '@/lib/relativeTime'
import { TYPE_META } from './subscriptionType'
import type { SubscriptionRecord } from '@/services/subscriptions.service'

interface SubscriptionRowProps {
  record: SubscriptionRecord
  selected: boolean
  onSelect: () => void
}

export function SubscriptionRow({ record, selected, onSelect }: SubscriptionRowProps) {
  const { user } = record
  const expiry = formatExpiry(record.expires_at)
  const initials = (user?.name || '?').slice(0, 2).toUpperCase()
  const meta = TYPE_META[record.type]
  const TypeIcon = meta.icon

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 mx-2 my-0.5 rounded-xl transition-colors cursor-pointer select-none',
        selected ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'
      )}
      onClick={onSelect}
    >
      <Avatar className="w-9 h-9 rounded-lg shrink-0">
        {user?.photo_url && <AvatarImage src={user.photo_url} alt={user.name} />}
        <AvatarFallback className="rounded-lg bg-indigo-100 text-indigo-700 text-xs font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{user?.name || 'Unknown user'}</p>
          <span className="text-slate-300">·</span>
          <span
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0',
              meta.badge
            )}
          >
            <TypeIcon className="w-3 h-3" />
            {meta.label}
          </span>
          <p className="text-xs text-slate-500 truncate">{record.item_name || 'Unknown item'}</p>
        </div>
        <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email || '—'}</p>
      </div>

      <div className="flex flex-col items-end gap-0.5 shrink-0 text-right">
        <Badge className={cn('text-xs font-medium border-0', EXPIRY_BADGE_CLASS[expiry.status])}>
          {expiry.relative}
        </Badge>
        <span className="text-xs text-slate-400">{expiry.absolute}</span>
      </div>
    </div>
  )
}
