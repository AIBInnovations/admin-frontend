import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChevronRight, MoreHorizontal, Pencil, Layers, FileText, Copy, Eye, EyeOff, GripVertical, Braces } from 'lucide-react'
import { ActiveBadge, PublishBadge } from '../../ui/StatusBadge'
import { PublishDialog } from '../../dialogs/PublishDialog'
import { RawJsonDrawer } from '../popovers/RawJsonDrawer'
import { buildChildUrl, type ExplorerFocus } from '../../parseExplorerPath'
import { copyText } from '../../copyShareLink'
import { usePanelSelection } from '../../context/PanelSelectionContext'
import { entityId } from '../../panel/panelTypes'
import type { PackageDetailSeries } from '@/services/packages.service'

interface SeriesRowProps {
  series: PackageDetailSeries
  parentFocus: ExplorerFocus
  isTheory?: boolean
  onRefresh?: () => void
  selected?: boolean
  onSelect?: (id: string) => void
  dragHandleProps?: React.HTMLAttributes<HTMLElement>
  isDragging?: boolean
}

export function SeriesRow({ series, parentFocus, isTheory, onRefresh, selected, onSelect, dragHandleProps, isDragging }: SeriesRowProps) {
  const navigate = useNavigate()
  const { select, target } = usePanelSelection()
  const drillUrl = buildChildUrl(parentFocus, series._id)
  const [publishOpen, setPublishOpen] = useState(false)
  const [rawJsonOpen, setRawJsonOpen] = useState(false)

  const isPublished = series.publish_status === 'published'
  const isOpen = entityId(target?.entity) === series._id
  const openInPanel = () => select({ kind: 'series', entity: series, ctx: { packageId: series.package_id } })

  return (
    <>
      <div
        className={`flex items-center gap-3 px-3 py-2.5 mx-2 my-0.5 rounded-xl transition-colors cursor-pointer group ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'} ${isOpen ? 'ring-1 ring-blue-300' : ''} ${isDragging ? 'opacity-40' : ''}`}
        onClick={openInPanel}
      >
        {dragHandleProps && (
          <span
            {...dragHandleProps}
            className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </span>
        )}
        {onSelect && (
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={() => onSelect(series._id)}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 w-4 h-4 accent-primary cursor-pointer"
          />
        )}
        <Avatar className="w-9 h-9 rounded-lg shrink-0">
          <AvatarFallback className="rounded-lg bg-violet-100 text-violet-700 text-xs font-semibold">
            S{series.display_order}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{series.name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {series.module_count} modules
            </span>
            {isTheory && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {series.document_count} docs
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {series.publish_status && <PublishBadge status={series.publish_status} />}
          <ActiveBadge active={series.is_active} />
        </div>

        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={openInPanel}>
                <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPublishOpen(true)}>
                {isPublished
                  ? <><EyeOff className="w-3.5 h-3.5 mr-2" /> Unpublish</>
                  : <><Eye className="w-3.5 h-3.5 mr-2" /> Publish</>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyText(series._id, 'Series ID')}>
                <Copy className="w-3.5 h-3.5 mr-2" /> Copy ID
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRawJsonOpen(true)}>
                <Braces className="w-3.5 h-3.5 mr-2" /> View raw JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-300 hover:text-slate-600 hover:bg-slate-100"
            title="Open"
            onClick={() => navigate(drillUrl)}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onSuccess={() => { setPublishOpen(false); onRefresh?.() }}
        entityType="series"
        entityId={series._id}
        entityName={series.name}
        currentStatus={series.publish_status === 'published' ? 'published' : 'draft'}
      />
      <RawJsonDrawer
        open={rawJsonOpen}
        onClose={() => setRawJsonOpen(false)}
        label={series.name}
        data={series}
      />
    </>
  )
}
