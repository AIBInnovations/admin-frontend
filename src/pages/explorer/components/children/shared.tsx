import { useMemo } from 'react'
import { Archive, Eye, EyeOff, Power, type LucideIcon } from 'lucide-react'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { documentsService } from '@/services/documents.service'
import { modulesService } from '@/services/modules.service'
import { publishService } from '@/services/publish.service'
import { seriesService } from '@/services/series.service'
import { videosService } from '@/services/videos.service'
import { useActions, type BulkItem, type BulkRequest } from '../../actions/ActionsContext'
import { PLURAL, useExplorerAccess } from '../../access'
import { classifyArchive, classifyPublish, classifyUnpublish } from '../../dialogs/bulkImpact'
import type { UseSelectionReturn } from '../../hooks/useSelection'
import type { BulkAction } from '../ExplorerSelectionBar'

export const matches = (text: string, query: string) => text.toLowerCase().includes(query.trim().toLowerCase())

export interface FolderTab { value: string; label: string; count?: number; icon: LucideIcon; hidden?: boolean }

/** Tabs this admin may open. If none, the first stays and says there is no access. */
export function readableTabs(tabs: FolderTab[]): FolderTab[] {
  const shown = tabs.filter((t) => !t.hidden)
  return shown.length > 0 ? shown : [{ ...tabs[0], count: undefined }]
}

export function FolderTabs({ tabs, label }: { tabs: FolderTab[]; label: string }) {
  return (
    <div className="shrink-0 overflow-x-auto overscroll-x-contain border-b border-border">
      <TabsList aria-label={label} className="h-auto justify-start gap-5 rounded-none bg-transparent px-4 pb-0 pt-1">
        {tabs.map(({ value, label: text, count, icon: Icon }) => (
          <TabsTrigger key={value} value={value} className="-mb-px gap-1.5 rounded-none border-b-2 border-transparent px-0.5 pb-2.5 pt-2 text-sm text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none">
            <Icon aria-hidden="true" className="h-4 w-4" />{text}{count !== undefined && <span className="tabular-nums text-muted-foreground">({count})</span>}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  )
}

type BulkKind = 'series' | 'module' | 'video' | 'document'

const ARCHIVABLE = { video: videosService, document: documentsService }
const ACTIVATABLE = { series: seriesService, module: modulesService }

/** The selection bar's actions for one kind, limited to what this admin may do. */
export function useBulkActions(kind: BulkKind, selection: UseSelectionReturn, items: BulkItem[]): BulkAction[] {
  const { can } = useExplorerAccess()
  const { open } = useActions()

  return useMemo(() => {
    const picked = items.filter((i) => selection.isSelected(i.id))
    const start = (r: Omit<BulkRequest, 'items' | 'onDone'>) => open({ type: 'bulk', request: { ...r, items: picked, onDone: selection.replace } })
    const many = PLURAL[kind]
    const out: BulkAction[] = []
    if (can(kind, 'update')) {
      out.push(
        {
          label: 'Publish',
          icon: <Eye className="h-3.5 w-3.5" />,
          onClick: () => start({ title: `Publish ${many}?`, actionLabel: 'Publish', doneLabel: 'published', classify: (id) => classifyPublish(kind, id), runOne: (id) => publishService.publish(kind, id) }),
        },
        {
          label: 'Unpublish',
          icon: <EyeOff className="h-3.5 w-3.5" />,
          onClick: () => start({ title: `Unpublish ${many}?`, actionLabel: 'Unpublish', doneLabel: 'unpublished', destructive: true, classify: (id) => classifyUnpublish(kind, id), runOne: (id) => publishService.unpublish(kind, id) }),
        },
      )
    }
    if ((kind === 'series' || kind === 'module') && can(kind, 'update')) {
      const service = ACTIVATABLE[kind]
      out.push({
        label: 'Activate',
        icon: <Power className="h-3.5 w-3.5" />,
        onClick: () => start({ title: `Activate ${many}?`, actionLabel: 'Activate', doneLabel: 'activated', runOne: (id) => service.toggleActive(id, true) }),
      })
    }
    if ((kind === 'video' || kind === 'document') && can(kind, 'delete')) {
      const service = ARCHIVABLE[kind]
      out.push({
        label: 'Archive',
        icon: <Archive className="h-3.5 w-3.5" />,
        onClick: () => start({ title: `Archive ${many}?`, actionLabel: 'Archive', doneLabel: 'archived', destructive: true, classify: (id) => classifyArchive((x) => service.getDeleteImpact(x), id), runOne: (id) => service.archive(id) }),
      })
    }
    return out
  }, [kind, selection, items, can, open])
}

/** Props of the "select all" box for the rows on screen. */
export function selectAllProps(selection: UseSelectionReturn, ids: string[], what: string) {
  const chosen = ids.filter(selection.isSelected).length
  return { checked: ids.length > 0 && chosen === ids.length, indeterminate: chosen > 0, onChange: () => selection.toggleAll(ids), label: `Select all ${what}` }
}
