import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Braces, Copy, Eye, EyeOff, MoreHorizontal } from 'lucide-react'
import { PublishDialog } from '../dialogs/PublishDialog'
import { RawJsonDrawer } from '../components/popovers/RawJsonDrawer'
import { copyText } from '../copyShareLink'
import type { EntityType } from '@/services/publish.service'
import type { PublishStatus } from '@/types/api.types'

interface EntityHeaderActionsProps {
  entityType: EntityType
  entityId: string
  entityName: string
  publishStatus?: PublishStatus
  rawData: unknown
  onRefresh?: () => void
  /** Extra menu items (e.g. Archive) rendered below the standard ones. */
  extraItems?: ReactNode
  idLabel?: string
}

/**
 * Shared panel-header overflow menu: publish/unpublish (via PublishDialog),
 * copy id, view raw JSON, plus any entity-specific extra items. Publish is an
 * immediate workflow with its own dialog — separate from the form's Save.
 */
export function EntityHeaderActions({
  entityType,
  entityId,
  entityName,
  publishStatus,
  rawData,
  onRefresh,
  extraItems,
  idLabel = 'ID',
}: EntityHeaderActionsProps) {
  const [publishOpen, setPublishOpen] = useState(false)
  const [rawOpen, setRawOpen] = useState(false)
  const isPublished = publishStatus === 'published'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {publishStatus !== undefined && (
            <DropdownMenuItem onClick={() => setPublishOpen(true)}>
              {isPublished
                ? <><EyeOff className="w-3.5 h-3.5 mr-2" /> Unpublish</>
                : <><Eye className="w-3.5 h-3.5 mr-2" /> Publish</>}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => copyText(entityId, idLabel)}>
            <Copy className="w-3.5 h-3.5 mr-2" /> Copy ID
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setRawOpen(true)}>
            <Braces className="w-3.5 h-3.5 mr-2" /> View raw JSON
          </DropdownMenuItem>
          {extraItems && <DropdownMenuSeparator />}
          {extraItems}
        </DropdownMenuContent>
      </DropdownMenu>

      {publishStatus !== undefined && (
        <PublishDialog
          open={publishOpen}
          onClose={() => setPublishOpen(false)}
          onSuccess={() => { setPublishOpen(false); onRefresh?.() }}
          entityType={entityType}
          entityId={entityId}
          entityName={entityName}
          currentStatus={isPublished ? 'published' : 'draft'}
        />
      )}

      <RawJsonDrawer open={rawOpen} onClose={() => setRawOpen(false)} label={entityName} data={rawData} />
    </>
  )
}
