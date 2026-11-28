import { Clock, CopyPlus, FolderInput, Plus, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { videosService } from '@/services/videos.service'
import { useActions } from '../../actions/ActionsContext'
import { useExplorerAccess } from '../../access'
import { usePanelSelection } from '../../context/PanelSelectionContext'
import type { ExplorerData } from '../../hooks/useExplorerData'
import { useReorder } from '../../hooks/useReorder'
import { useSelection } from '../../hooks/useSelection'
import { useClearUrl, useUrlState } from '../../hooks/useUrlState'
import type { ExplorerFocus } from '../../parseExplorerPath'
import { ExplorerEmptyState, NoAccess } from '../ExplorerEmptyState'
import { ExplorerSelectionBar, type BulkAction } from '../ExplorerSelectionBar'
import { ChildrenListSkeleton } from '../ExplorerSkeleton'
import { ListToolbar } from '../ListToolbar'
import { SortableList } from '../SortableList'
import { VideoRow } from '../rows/rows'
import { matches, selectAllProps, useBulkActions } from './shared'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'ready', label: 'Ready' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'processing', label: 'Processing' },
  { value: 'uploading', label: 'Uploading' },
  { value: 'failed', label: 'Failed' },
]
const NONE: never[] = []

export function ModuleChildren({ data, focus }: { data: ExplorerData; focus: Extract<ExplorerFocus, { level: 'module' }> }) {
  const { can } = useExplorerAccess()
  const { create } = usePanelSelection()
  const { open } = useActions()
  const [search, setSearch] = useUrlState('q')
  const [status, setStatus] = useUrlState('status', 'all')
  const clearUrl = useClearUrl()
  const module = data.currentModule
  const videos = module?.videos ?? NONE

  const { ordered, sensors, onDragEnd } = useReorder(videos, (ids) => videosService.reorder(ids), data.refetch, 'videos')
  const selection = useSelection(videos)
  const shared = useBulkActions('video', selection, videos.map((v) => ({ id: v._id, name: v.title })))
  // Move or copy the selected videos to any module (full-page picker)
  const pickSelected = (kind: 'video-move' | 'video-copy') => open({
    type: 'moveContent',
    kind,
    items: videos.filter((v) => selection.isSelected(v._id)).map((v) => ({ id: v._id, name: v.title, parentId: focus.moduleId })),
    onDone: selection.clear,
  })
  const bulk: BulkAction[] = can('video', 'update')
    ? [
        { label: 'Move to…', icon: <FolderInput className="h-3.5 w-3.5" />, onClick: () => pickSelected('video-move') },
        { label: 'Copy to…', icon: <CopyPlus className="h-3.5 w-3.5" />, onClick: () => pickSelected('video-copy') },
        ...shared,
      ]
    : shared
  if (!can('video', 'read')) return <NoAccess what="videos" />

  const filtered = ordered.filter((v) => matches(v.title, search) && (status === 'all' || v.processing_status === status))
  const counts = new Map<string, number>()
  videos.forEach((v) => counts.set(v.processing_status, (counts.get(v.processing_status) ?? 0) + 1))
  const canCreate = can('video', 'create')
  const upload = () => open({ type: 'uploadVideo', moduleId: focus.moduleId })
  const isFiltered = !!search || status !== 'all'

  return (
    <>
      <ListToolbar
        search={search}
        onSearch={setSearch}
        placeholder="Search videos"
        selectAll={bulk.length > 0 && filtered.length > 0 ? selectAllProps(selection, filtered.map((v) => v._id), 'videos') : undefined}
      >
        {canCreate && (
          <>
            <Button size="sm" variant="outline" className="h-9" onClick={upload} disabled={!module}><Plus className="h-4 w-4" /> Upload Video</Button>
            <Button size="sm" className="h-9" onClick={() => create('upcoming')} disabled={!module}><Clock className="h-4 w-4" /> Add Upcoming</Button>
          </>
        )}
      </ListToolbar>
      <div role="group" aria-label="Show" className="flex shrink-0 gap-1.5 overflow-x-auto overscroll-x-contain border-b border-border px-4 py-2">
        {FILTERS.map((f) => {
          const n = counts.get(f.value) ?? 0
          const on = status === f.value
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={on}
              onClick={() => setStatus(f.value)}
              className={cn(
                'flex h-7 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-medium transition-colors',
                on ? 'bg-primary text-primary-foreground' : f.value === 'failed' && n > 0 ? 'bg-danger-soft text-danger' : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}{f.value !== 'all' && n > 0 && <span className="tabular-nums">({n})</span>}
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {!module ? <ChildrenListSkeleton /> : filtered.length > 0 ? (
          <SortableList
            items={filtered}
            label="Videos"
            sensors={sensors}
            onDragEnd={onDragEnd}
            disabled={!can('video', 'update')}
            render={(v, drag) => <VideoRow video={v} parentFocus={focus} onRefresh={data.refetch} selected={selection.isSelected(v._id)} onSelect={bulk.length > 0 ? selection.toggle : undefined} {...drag} />}
          />
        ) : videos.length > 0 && isFiltered ? (
          <ExplorerEmptyState icon={Video} title="No videos match" description="Nothing fits this search and filter." action={{ label: 'Clear filters', onClick: () => clearUrl(['q', 'status']) }} />
        ) : (
          <ExplorerEmptyState icon={Video} title="No videos yet" description="Upload the first video of this module, or add an upcoming one." action={canCreate ? { label: 'Upload video', onClick: upload } : undefined} />
        )}
      </div>
      <ExplorerSelectionBar count={selection.count} onClear={selection.clear} actions={bulk} />
    </>
  )
}
