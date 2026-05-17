import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { WebStoreRedirectRule } from '@/services/webStoreRedirectRules.service'
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
      header: 'Platform',
      width: 'w-24',
      cell: (rule) => (
        <Badge variant={rule.platform === 'ios' ? 'default' : 'secondary'} className="uppercase">
          {rule.platform}
        </Badge>
      ),
    },
    {
      id: 'version_range',
      header: 'Version Range',
      width: 'w-44',
      cell: (rule) => (
        <span className="font-mono text-xs">
          {rule.min_version} <span className="text-muted-foreground">→</span>{' '}
          {rule.max_version ?? <span className="text-muted-foreground">∞</span>}
        </span>
      ),
    },
    {
      id: 'base_url',
      header: 'Base URL',
      cell: (rule) => (
        <a
          href={rule.base_url}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-primary underline-offset-4 hover:underline break-all"
        >
          {rule.base_url}
        </a>
      ),
    },
    {
      id: 'priority',
      header: 'Priority',
      width: 'w-20',
      cell: (rule) => <span className="text-sm font-medium">{rule.priority}</span>,
    },
    {
      id: 'is_active',
      header: 'Active',
      width: 'w-24',
      cell: (rule) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleActive(rule)}
          className="h-7 px-2"
        >
          <Badge variant={rule.is_active ? 'default' : 'outline'}>
            {rule.is_active ? 'Active' : 'Off'}
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
