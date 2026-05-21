import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChevronRight, MoreHorizontal, Pencil, Video, Clock, Copy, Eye, EyeOff, GripVertical, Braces } from 'lucide-react'
import { ActiveBadge, PublishBadge } from '../../ui/StatusBadge'
import { PublishDialog } from '../../dialogs/PublishDialog'
import { RawJsonDrawer } from '../popovers/RawJsonDrawer'
import { buildChildUrl, type ExplorerFocus } from '../../parseExplorerPath'
import { copyText } from '../../copyShareLink'
import { usePanelSelection } from '../../context/PanelSelectionContext'
import { entityId } from '../../panel/panelTypes'
import type { PackageDetailModule } from '@/services/packages.service'

interface ModuleRowProps {
  module: PackageDetailModule
  parentFocus: ExplorerFocus
  onRefresh?: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLElement>
  isDragging?: boolean
  selected?: boolean
  onSelect?: (id: string) => void
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function ModuleRow({ module, parentFocus, onRefresh, dragHandleProps, isDragging, selected, onSelect }: ModuleRowProps) {
  const navigate = useNavigate()
  const { select, target } = usePanelSelection()
  const drillUrl = buildChildUrl(parentFocus, module._id)
  const [publishOpen, setPublishOpen] = useState(false)
  const [rawJsonOpen, setRawJsonOpen] = useState(false)

  const isPublished = module.publish_status === 'published'
  const isOpen = entityId(target?.entity) === module._id
  const openInPanel = () => select({ kind: 'module', entity: module, ctx: { seriesId: module.series_id } })

  return (
    <>
      <div
        className={`flex items-center gap-3 px-3 py-2.5 mx-2 my-0.5 rounded-xl transition-colors cursor-pointer group select-none ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'} ${isOpen ? 'ring-1 ring-blue-300' : ''} ${isDragging ? 'opacity-40' : ''}`}
        onClick={openInPanel}
        onDoubleClick={() => navigate(drillUrl)}
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
            onChange={() => onSelect(module._id)}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 w-4 h-4 accent-primary cursor-pointer"
          />
        )}
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-blue-600">{module.display_order}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{module.name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Video className="w-3 h-3" />
              {module.lesson_count} lessons
            </span>
            {module.estimated_duration_minutes > 0 && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(module.estimated_duration_minutes)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {module.publish_status && <PublishBadge status={module.publish_status} />}
          <ActiveBadge active={module.is_active} />
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
              <DropdownMenuItem onClick={() => copyText(module._id, 'Module ID')}>
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
        entityType="module"
        entityId={module._id}
        entityName={module.name}
        currentStatus={module.publish_status === 'published' ? 'published' : 'draft'}
      />
      <RawJsonDrawer
        open={rawJsonOpen}
        onClose={() => setRawJsonOpen(false)}
        label={module.name}
        data={module}
      />
    </>
  )
}
