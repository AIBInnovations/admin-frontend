import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { WebStoreRedirectRule } from '@/services/webStoreRedirectRules.service'
import {
  describeVersionRange, getStoreHost, getStoreKind,
  STORE_KIND_BADGE, STORE_KIND_HINT, STORE_KIND_LABEL,
} from '@/lib/webStoreRedirect'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'

interface Props {
  onEdit: (rule: WebStoreRedirectRule) => void
  onDelete: (rule: WebStoreRedirectRule) => void
  onToggleActive: (rule: WebStoreRedirectRule) => void
}

export function useWebStoreRedirectRulesColumns({
  onEdit, onDelete, onToggleActive,
}: Props): ColumnDef<WebStoreRedirectRule>[] {
  return [
    {
      id: 'platform',
      header: 'App',
      width: 'w-32',
      cell: (rule) => (
        <Badge variant={rule.platform === 'ios' ? 'default' : 'secondary'}>
          {rule.platform === 'ios' ? 'iPhone / iPad' : 'Android'}
        </Badge>
      ),
    },
    {
      id: 'version_range',
      header: 'Applies To',
      width: 'w-56',
      cell: (rule) => (
        <span className="text-sm">{describeVersionRange(rule.min_version, rule.max_version)}</span>
      ),
    },
    {
      id: 'base_url',
      header: 'Opens',
      cell: (rule) => {
        const kind = getStoreKind(rule.base_url)
        return (
          <div className="space-y-1">
            <Badge className={`text-[10px] ${STORE_KIND_BADGE[kind]}`}>
              {STORE_KIND_LABEL[kind]}
            </Badge>
            <div className="text-[11px] text-muted-foreground">{STORE_KIND_HINT[kind]}</div>
            <a
              href={rule.base_url}
              target="_blank"
              rel="noreferrer"
              className="block text-[11px] text-primary underline-offset-4 hover:underline break-all"
            >
              {getStoreHost(rule.base_url)}
            </a>
          </div>
        )
      },
    },
    {
      id: 'priority',
      header: 'Priority',
      width: 'w-20',
      cell: (rule) => <span className="text-sm font-medium">{rule.priority}</span>,
    },
    {
      id: 'is_active',
      header: 'Status',
      width: 'w-24',
      cell: (rule) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleActive(rule)}
          className="h-7 px-2"
        >
          <Badge variant={rule.is_active ? 'default' : 'outline'}>
            {rule.is_active ? 'On' : 'Off'}
          </Badge>
        </Button>
      ),
    },
    {
      id: 'description',
      header: 'Description',
      cell: (rule) => (
        <span className="text-xs text-muted-foreground line-clamp-2">
          {rule.description || '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (rule) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(rule)}>
              <Pencil className="mr-2 h-4 w-4" />Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(rule)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
