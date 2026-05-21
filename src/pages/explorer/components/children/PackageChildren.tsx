import { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Plus, ListTree, FileText, Eye, EyeOff, Power } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import type { DragEndEvent } from '@dnd-kit/core'
import { SeriesRow } from '../rows/SeriesRow'
import { DocumentRow, type DocRowData } from '../rows/DocumentRow'
import { SortableItem } from '../SortableItem'
import { ExplorerEmptyState } from '../ExplorerEmptyState'
import { ChildrenListSkeleton } from '../ExplorerSkeleton'
import { ExplorerSelectionBar } from '../ExplorerSelectionBar'
import { CreateDocumentDialog } from '../../forms/CreateDocumentDialog'
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

export function PackageChildren({ packageDetail, loading, focus, onRefresh }: PackageChildrenProps) {
  const [search, setSearch] = useState('')
  const [docSearch, setDocSearch] = useState('')
  const [docAddSeries, setDocAddSeries] = useState<{ id: string; name: string } | null>(null)
  const [localSeries, setLocalSeries] = useState<PackageDetailSeries[]>([])
  const selection = useSelection()
  const { select } = usePanelSelection()

  const series = packageDetail?.series ?? []
  const packageId = focus.level === 'package' ? focus.packageId : packageDetail?._id ?? ''
  const subjectId = 'subjectId' in focus ? focus.subjectId : undefined
  const newSeries = () => select({ kind: 'series', entity: null, ctx: { packageId } })

  useEffect(() => { setLocalSeries([]) }, [packageId])

  const displaySeries = localSeries.length > 0 ? localSeries : series
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // Documents grouped by their series (mirrors the old Package Detail page),
  // each row tagged with the series name. Empty series still render so an
  // admin can add the first document.
  const totalDocs = useMemo(() => series.reduce((n, s) => n + (s.documents?.length ?? 0), 0), [series])
  const docGroups = useMemo(
    () =>
      series.map((s) => ({
        series: s,
        docs: (s.documents ?? [])
          .filter((d) => (docSearch.length < 1 ? true : d.title.toLowerCase().includes(docSearch.toLowerCase())))
          .map((d) => ({ ...d, series_id: { _id: s._id, name: s.name } }) as DocRowData),
      })),
    [series, docSearch],
  )
  const anyMatch = docGroups.some((g) => g.docs.length > 0)

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
      <Tabs defaultValue="series" className="flex flex-col flex-1">
        <div className="border-b border-slate-100">
          <TabsList className="h-auto rounded-none bg-transparent border-b-0 px-4 sm:px-6 pt-1 gap-4">
            <TabsTrigger
              value="series"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 gap-1.5 text-sm"
            >
              <ListTree className="w-3.5 h-3.5" />
              Series {series.length > 0 && `(${series.length})`}
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 gap-1.5 text-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              Documents {totalDocs > 0 && `(${totalDocs})`}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Series */}
        <TabsContent value="series" className="mt-0 flex-1">
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
              <Input className="pl-9 h-8 text-sm" placeholder="Search series…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
              description={search ? `No results for "${search}".` : 'Add your first series to this package.'}
              action={search ? undefined : { label: 'Create series', onClick: newSeries }}
            />
          )}
        </TabsContent>

        {/* Documents grouped by series, each with its own Add */}
        <TabsContent value="documents" className="mt-0 flex-1">
          <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-slate-100">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9 h-8 text-sm" placeholder="Search documents…" value={docSearch} onChange={(e) => setDocSearch(e.target.value)} />
            </div>
          </div>

          {series.length === 0 ? (
            <ExplorerEmptyState
              icon={FileText}
              title="No series yet"
              description="Add a series first — documents are attached to a series."
            />
          ) : docSearch && !anyMatch ? (
            <ExplorerEmptyState icon={FileText} title="No documents match" description={`No results for "${docSearch}".`} />
          ) : (
            <div className="py-2">
              {docGroups
                .filter((g) => !docSearch || g.docs.length > 0)
                .map(({ series: s, docs }) => (
                  <div key={s._id} className="mb-1">
                    <div className="flex items-center justify-between px-4 sm:px-5 py-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate">{s.name}</span>
                        <span className="text-[11px] text-slate-300">{docs.length}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1.5 text-xs text-slate-500 hover:text-slate-800"
                        onClick={() => setDocAddSeries({ id: s._id, name: s.name })}
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Document
                      </Button>
                    </div>
                    {docs.length > 0 ? (
                      docs.map((d) => <DocumentRow key={d._id} document={d} onRefresh={onRefresh} />)
                    ) : (
                      <p className="px-4 sm:px-5 pb-2 text-xs text-slate-300">No documents in this series.</p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateDocumentDialog
        open={!!docAddSeries}
        onClose={() => setDocAddSeries(null)}
        onSuccess={() => { setDocAddSeries(null); onRefresh?.() }}
        seriesId={docAddSeries?.id}
        seriesName={docAddSeries?.name}
        subjectId={subjectId}
      />

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
