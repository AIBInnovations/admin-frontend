import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { StatusPill, type Tone } from '@/components/common/detail'
import type { ColumnDef } from '@/components/common/DataTable'
import type { WebStoreRedirectRule } from '@/services/webStoreRedirectRules.service'
import { describeVersionRange, getStoreHost, getStoreKind, STORE_KIND_HINT, STORE_KIND_LABEL, type StoreKind } from '@/lib/webStoreRedirect'

interface Props {
  /** Each is missing when the admin may not do it. */
  onEdit?: (rule: WebStoreRedirectRule) => void
  onDelete?: (rule: WebStoreRedirectRule) => void
  onToggleActive?: (rule: WebStoreRedirectRule) => void
  togglingId?: string | null
}

const STORE_TONE: Record<StoreKind, Tone> = { content_only: 'warning', full: 'success', custom: 'neutral' }

export function useWebStoreRedirectRulesColumns({ onEdit, onDelete, onToggleActive, togglingId }: Props): ColumnDef<WebStoreRedirectRule>[] {
  return [
    { id: 'platform', header: 'App', width: 'w-32', cell: (rule) => <StatusPill tone={rule.platform === 'ios' ? 'info' : 'neutral'}>{rule.platform === 'ios' ? 'iPhone / iPad' : 'Android'}</StatusPill> },
    { id: 'version_range', header: 'Applies To', width: 'w-56', cell: (rule) => <span className="text-sm">{describeVersionRange(rule.min_version, rule.max_version)}</span> },
    {
      id: 'base_url',
      header: 'Opens',
      cell: (rule) => {
        const kind = getStoreKind(rule.base_url)
        return (
          <div className="min-w-[220px] space-y-1">
            <StatusPill tone={STORE_TONE[kind]}>{STORE_KIND_LABEL[kind]}</StatusPill>
            <p className="text-xs text-muted-foreground">{STORE_KIND_HINT[kind].replace(' — ', ': ')}</p>
            <a href={rule.base_url} target="_blank" rel="noreferrer" className="block break-all text-xs text-primary underline-offset-4 hover:underline">{getStoreHost(rule.base_url)}</a>
          </div>
        )
      },
    },
    { id: 'priority', header: 'Priority', width: 'w-20', cell: (rule) => <span className="text-sm font-medium tabular-nums">{rule.priority}</span> },
    {
      id: 'is_active',
      header: 'Status',
      width: 'w-24',
      cell: (rule) => onToggleActive ? (
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground" data-no-row-click>
          <Switch checked={rule.is_active} disabled={togglingId === rule._id} onCheckedChange={() => onToggleActive(rule)} aria-label={rule.is_active ? 'Turn this rule off' : 'Turn this rule on'} />
          {rule.is_active ? 'On' : 'Off'}
        </label>
      ) : <StatusPill tone={rule.is_active ? 'success' : 'neutral'}>{rule.is_active ? 'On' : 'Off'}</StatusPill>,
    },
    { id: 'description', header: 'Description', cell: (rule) => <span className="line-clamp-2 min-w-[140px] text-xs text-muted-foreground">{rule.description || 'No note'}</span> },
    ...(onEdit || onDelete ? [{
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (rule: WebStoreRedirectRule) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Rule actions"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && <DropdownMenuItem onClick={() => onEdit(rule)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>}
            {onEdit && onDelete && <DropdownMenuSeparator />}
            {onDelete && <DropdownMenuItem onClick={() => onDelete(rule)} className="text-danger focus:text-danger"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }] : []),
  ]
}
