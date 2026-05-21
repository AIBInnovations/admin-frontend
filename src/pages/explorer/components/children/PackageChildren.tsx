import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus, ListTree, Eye, EyeOff, Power } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import type { DragEndEvent } from '@dnd-kit/core'
import { SeriesRow } from '../rows/SeriesRow'
import { SortableItem } from '../SortableItem'
import { ExplorerEmptyState } from '../ExplorerEmptyState'
import { ChildrenListSkeleton } from '../ExplorerSkeleton'
import { ExplorerSelectionBar } from '../ExplorerSelectionBar'
import { usePanelSelection } from '../../context/PanelSelectionContext'
import { useSelection } from '../../hooks/useSelection'
import { useExplorerMutation } from '../../hooks/useExplorerMutation'
import { seriesService } from '@/services/series.service'
import { publishService } from '@/services/publish.service'
import { toast } from 'sonner'
import type { PackageDetail, PackageDetailSeries } from '@/services/packages.service'
import type { ExplorerFocus } from '../../parseExplorerPath'

interface PackageChildrenProps {
  packageDetail: PackageDetail | undefined
  loading: boolean
  focus: ExplorerFocus
  onRefresh?: () => void
}

function isTheoryPackage(pkg: PackageDetail): boolean {
  if (!pkg.package_type_id) return false
  if (typeof pkg.package_type_id === 'object') {
    return pkg.package_type_id.name?.toLowerCase().includes('theory') ?? false
  }
  return false
}

export function PackageChildren({ packageDetail, loading, focus, onRefresh }: PackageChildrenProps) {
  const [search, setSearch] = useState('')
  const [localSeries, setLocalSeries] = useState<PackageDetailSeries[]>([])
  const selection = useSelection()
  const { select } = usePanelSelection()

  const series = packageDetail?.series ?? []
  const isTheory = packageDetail ? isTheoryPackage(packageDetail) : false
  const packageId = focus.level === 'package' ? focus.packageId : packageDetail?._id ?? ''
  const newSeries = () => select({ kind: 'series', entity: null, ctx: { packageId } })

  useEffect(() => { setLocalSeries([]) }, [packageId])

  const displaySeries = localSeries.length > 0 ? localSeries : series
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = displaySeries.findIndex((s) => s._id === active.id)
    const newIndex = displaySeries.findIndex((s) => s._id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(displaySeries, oldIndex, newIndex)
    setLocalSeries(reordered)
    try {
      await seriesService.reorder(reordered.map((s) => s._id))
      toast.success('Order updated')
      onRefresh?.()
    } catch {
      setLocalSeries(displaySeries)
      toast.error('Failed to reorder')
    }
  }

  const bulkPublishMutation = useExplorerMutation({
    name: 'Bulk publish series',
    fn: async () => {
      const ids = [...selection.selected]
      const results = await Promise.allSettled(ids.map((id) => publishService.publish('series', id)))
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) throw new Error(`${ids.length - failed} published, ${failed} failed`)
    },
    onSuccess: () => { selection.clear(); onRefresh?.() },
    successMessage: `${selection.count} series published`,
  })

  const bulkUnpublishMutation = useExplorerMutation({
    name: 'Bulk unpublish series',
    fn: async () => {
      const ids = [...selection.selected]
      const results = await Promise.allSettled(ids.map((id) => publishService.unpublish('series', id)))
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) throw new Error(`${ids.length - failed} unpublished, ${failed} failed`)
    },
    onSuccess: () => { selection.clear(); onRefresh?.() },
    successMessage: `${selection.count} series unpublished`,
  })

  const bulkActivateMutation = useExplorerMutation({
    name: 'Bulk toggle active',
    fn: async () => {
      const ids = [...selection.selected]
      const results = await Promise.allSettled(ids.map((id) => seriesService.toggleActive(id, true)))
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) throw new Error(`${ids.length - failed} activated, ${failed} failed`)
    },
    onSuccess: () => { selection.clear(); onRefresh?.() },
    successMessage: `${selection.count} series activated`,
  })

  const filtered = displaySeries.filter((s) =>
    search.length < 1 ? true : s.name.toLowerCase().includes(search.toLowerCase()),
  )

  const filteredIds = filtered.map((s) => s._id)

  return (
    <>
      <div>
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-slate-100">
          {filtered.length > 0 && (
            <input
              type="checkbox"
              checked={filteredIds.length > 0 && filteredIds.every((id) => selection.isSelected(id))}
              onChange={() => selection.toggleAll(filteredIds)}
              className="w-4 h-4 accent-primary cursor-pointer shrink-0"
            />
          )}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 h-8 text-sm"
              placeholder="Search series…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button size="sm" className="gap-1.5 shrink-0" onClick={newSeries}>
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Series</span>
          </Button>
        </div>

        {loading && !packageDetail ? (
          <ChildrenListSkeleton />
        ) : filtered.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filtered.map((s) => s._id)} strategy={verticalListSortingStrategy}>
              <div className="py-1.5">
                {filtered.map((s) => (
                  <SortableItem key={s._id} id={s._id}>
                    {({ dragHandleProps, isDragging }) => (
                      <SeriesRow
                        series={s}
                        parentFocus={focus}
                        isTheory={isTheory}
                        onRefresh={onRefresh}
                        selected={selection.isSelected(s._id)}
                        onSelect={selection.toggle}
                        dragHandleProps={dragHandleProps}
                        isDragging={isDragging}
                      />
                    )}
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <ExplorerEmptyState
            icon={ListTree}
            title={search ? 'No series match' : 'No series yet'}
            description={
              search ? `No results for "${search}".` : 'Add your first series to this package.'
            }
            action={search ? undefined : { label: 'Create series', onClick: newSeries }}
          />
        )}
      </div>

      <ExplorerSelectionBar
        count={selection.count}
        onClear={selection.clear}
        actions={[
          {
            label: 'Publish',
            icon: <Eye className="w-3.5 h-3.5" />,
            onClick: bulkPublishMutation.execute,
            loading: bulkPublishMutation.loading,
          },
          {
            label: 'Unpublish',
            icon: <EyeOff className="w-3.5 h-3.5" />,
            onClick: bulkUnpublishMutation.execute,
            loading: bulkUnpublishMutation.loading,
            variant: 'amber',
          },
          {
            label: 'Activate',
            icon: <Power className="w-3.5 h-3.5" />,
            onClick: bulkActivateMutation.execute,
            loading: bulkActivateMutation.loading,
          },
        ]}
      />
    </>
  )
}
