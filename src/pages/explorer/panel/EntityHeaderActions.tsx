import type { ReactNode } from 'react'
import { Braces, Copy, Eye, EyeOff, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { EntityType } from '@/services/publish.service'
import type { PublishStatus } from '@/types/api.types'
import { useActions } from '../actions/ActionsContext'
import { useExplorerAccess } from '../access'
import { copyText } from '../copyShareLink'
import type { PanelEntityKind } from './panelTypes'

export interface EntityMenuProps {
  kind: PanelEntityKind
  id: string
  name: string
  data: unknown
  /** Left out for kinds that are not published (subjects). */
  entityType?: EntityType
  publishStatus?: PublishStatus
  idLabel: string
  /** More items, under a separator. */
  extra?: ReactNode
}

/** The items every record's menu has: publish, copy ID, raw JSON, plus its own. */
export function EntityMenuItems({ kind, id, name, data, entityType, publishStatus, idLabel, extra }: EntityMenuProps) {
  const { open } = useActions()
  const { can } = useExplorerAccess()
  const published = publishStatus === 'published'
  return (
    <>
      {entityType && publishStatus !== undefined && can(kind, 'update') && (
        <DropdownMenuItem onSelect={() => open({ type: 'publish', entityType, kind, id, name, status: published ? 'published' : 'draft' })}>
          {published ? <><EyeOff className="mr-2 h-3.5 w-3.5" /> Unpublish</> : <><Eye className="mr-2 h-3.5 w-3.5" /> Publish</>}
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onSelect={() => copyText(id, idLabel)}><Copy className="mr-2 h-3.5 w-3.5" /> Copy ID</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => open({ type: 'json', name, data })}><Braces className="mr-2 h-3.5 w-3.5" /> View raw JSON</DropdownMenuItem>
      {extra && <><DropdownMenuSeparator />{extra}</>}
    </>
  )
}

export function EntityHeaderActions(props: EntityMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`More actions for ${props.name}`} className="h-8 w-8 text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52"><EntityMenuItems {...props} /></DropdownMenuContent>
    </DropdownMenu>
  )
}
