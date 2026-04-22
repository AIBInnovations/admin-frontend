import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Plus, Layers, FileText, Eye, EyeOff, Power, Archive } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import type { DragEndEvent } from '@dnd-kit/core'
import { ModuleRow } from '../rows/ModuleRow'
import { DocumentRow } from '../rows/DocumentRow'
import { SortableItem } from '../SortableItem'
import { ExplorerEmptyState } from '../ExplorerEmptyState'
import { ChildrenListSkeleton } from '../ExplorerSkeleton'
import { ExplorerSelectionBar } from '../ExplorerSelectionBar'
import { ModuleFormDialog } from '../../forms/ModuleFormDialog'
import { useSelection } from '../../hooks/useSelection'
import { useExplorerMutation } from '../../hooks/useExplorerMutation'
import { modulesService } from '@/services/modules.service'
import { documentsService } from '@/services/documents.service'
import { publishService } from '@/services/publish.service'
import { toast } from 'sonner'
import type { PackageDetailModule, PackageDetailSeries } from '@/services/packages.service'
import type { ExplorerFocus } from '../../parseExplorerPath'

interface SeriesChildrenProps {
  series: PackageDetailSeries | undefined
  loading: boolean
  focus: ExplorerFocus
  isTheory?: boolean
  onRefresh?: () => void
}

export function SeriesChildren({ series, loading, focus, isTheory, onRefresh }: SeriesChildrenProps) {
  const [moduleSearch, setModuleSearch] = useState('')
  const [docSearch, setDocSearch] = useState('')
  const [createModuleOpen, setCreateModuleOpen] = useState(false)
  const [localModules, setLocalModules] = useState<PackageDetailModule[]>([])
  const moduleSelection = useSelection()
  const docSelection = useSelection()

  const modules = series?.modules ?? []
  useEffect(() => { setLocalModules([]) }, [series?._id])
  const documents = series?.documents ?? []
  const seriesId = series?._id ?? (focus.level === 'series' ? focus.seriesId : '')

  const displayModules = localModules.length > 0 ? localModules : modules

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = displayModules.findIndex((m) => m._id === active.id)
    const newIndex = displayModules.findIndex((m) => m._id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(displayModules, oldIndex, newIndex)
    setLocalModules(reordered)

    try {
      await modulesService.update(active.id as string, { display_order: newIndex + 1 })
      toast.success('Order updated')
      onRefresh?.()
    } catch {
      setLocalModules(displayModules)
      toast.error('Failed to reorder')
    }
  }

  const filteredModules = displayModules.filter((m) =>
    moduleSearch.length < 1 ? true : m.name.toLowerCase().includes(moduleSearch.toLowerCase()),
  )
  const filteredModuleIds = filteredModules.map((m) => m._id)

  const filteredDocs = documents.filter((d) =>
    docSearch.length < 1 ? true : d.title.toLowerCase().includes(docSearch.toLowerCase()),
  )
  const filteredDocIds = filteredDocs.map((d) => d._id)

  const bulkPublishModulesMutation = useExplorerMutation({
    name: 'Bulk publish modules',
    fn: async () => {
      const ids = [...moduleSelection.selected]
      const results = await Promise.allSettled(ids.map((id) => publishService.publish('module', id)))
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) throw new Error(`${ids.length - failed} published, ${failed} failed`)
    },
    onSuccess: () => { moduleSelection.clear(); onRefresh?.() },
    successMessage: `${moduleSelection.count} module${moduleSelection.count !== 1 ? 's' : ''} published`,
  })

  const bulkUnpublishModulesMutation = useExplorerMutation({
    name: 'Bulk unpublish modules',
    fn: async () => {
      const ids = [...moduleSelection.selected]
      const results = await Promise.allSettled(ids.map((id) => publishService.unpublish('module', id)))
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) throw new Error(`${ids.length - failed} unpublished, ${failed} failed`)
    },
    onSuccess: () => { moduleSelection.clear(); onRefresh?.() },
    successMessage: `${moduleSelection.count} module${moduleSelection.count !== 1 ? 's' : ''} unpublished`,
  })

  const bulkActivateModulesMutation = useExplorerMutation({
    name: 'Bulk activate modules',
    fn: async () => {
      const ids = [...moduleSelection.selected]
      const results = await Promise.allSettled(ids.map((id) => modulesService.toggleActive(id, true)))
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) throw new Error(`${ids.length - failed} activated, ${failed} failed`)
    },
    onSuccess: () => { moduleSelection.clear(); onRefresh?.() },
    successMessage: `${moduleSelection.count} module${moduleSelection.count !== 1 ? 's' : ''} activated`,
  })

  const bulkPublishDocsMutation = useExplorerMutation({
    name: 'Bulk publish documents',
    fn: async () => {
      const ids = [...docSelection.selected]
      const results = await Promise.allSettled(ids.map((id) => publishService.publish('document', id)))
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) throw new Error(`${ids.length - failed} published, ${failed} failed`)
    },
    onSuccess: () => { docSelection.clear(); onRefresh?.() },
    successMessage: `${docSelection.count} document${docSelection.count !== 1 ? 's' : ''} published`,
  })

  const bulkUnpublishDocsMutation = useExplorerMutation({
    name: 'Bulk unpublish documents',
    fn: async () => {
      const ids = [...docSelection.selected]
      const results = await Promise.allSettled(ids.map((id) => publishService.unpublish('document', id)))
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) throw new Error(`${ids.length - failed} unpublished, ${failed} failed`)
    },
    onSuccess: () => { docSelection.clear(); onRefresh?.() },
    successMessage: `${docSelection.count} document${docSelection.count !== 1 ? 's' : ''} unpublished`,
  })

  const bulkArchiveDocsMutation = useExplorerMutation({
    name: 'Bulk archive documents',
    fn: async () => {
      const ids = [...docSelection.selected]
      const results = await Promise.allSettled(ids.map((id) => documentsService.archive(id)))
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) throw new Error(`${ids.length - failed} archived, ${failed} failed`)
    },
    onSuccess: () => { docSelection.clear(); onRefresh?.() },
    successMessage: `${docSelection.count} document${docSelection.count !== 1 ? 's' : ''} archived`,
  })

  return (
    <>
      <Tabs
        defaultValue="modules"
        className="flex flex-col flex-1"
        onValueChange={(tab) => {
          if (tab === 'modules') docSelection.clear()
          else moduleSelection.clear()
        }}
      >
        <div className="border-b border-slate-100">
          <TabsList className="h-auto rounded-none bg-transparent border-b-0 px-4 sm:px-6 pt-1 gap-4">
            <TabsTrigger
              value="modules"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 gap-1.5 text-sm"
            >
              <Layers className="w-3.5 h-3.5" />
              Modules {modules.length > 0 && `(${modules.length})`}
            </TabsTrigger>
            {isTheory && (
              <TabsTrigger
                value="documents"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 gap-1.5 text-sm"
              >
                <FileText className="w-3.5 h-3.5" />
                Documents {documents.length > 0 && `(${documents.length})`}
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="modules" className="mt-0 flex-1">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-slate-100">
            {filteredModules.length > 0 && (
              <input
                type="checkbox"
                checked={filteredModuleIds.length > 0 && filteredModuleIds.every((id) => moduleSelection.isSelected(id))}
                onChange={() => moduleSelection.toggleAll(filteredModuleIds)}
                className="w-4 h-4 accent-primary cursor-pointer shrink-0"
              />
            )}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 h-8 text-sm"
                placeholder="Search modules…"
                value={moduleSearch}
                onChange={(e) => setModuleSearch(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => setCreateModuleOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Module</span>
            </Button>
          </div>

          {loading && !series ? (
            <ChildrenListSkeleton />
          ) : filteredModules.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredModules.map((m) => m._id)} strategy={verticalListSortingStrategy}>
                <div className="py-1.5">
                  {filteredModules.map((m) => (
                    <SortableItem key={m._id} id={m._id}>
                      {({ dragHandleProps, isDragging }) => (
                        <ModuleRow
                          module={m}
                          parentFocus={focus}
                          onRefresh={onRefresh}
                          dragHandleProps={dragHandleProps}
                          isDragging={isDragging}
                          selected={moduleSelection.isSelected(m._id)}
                          onSelect={moduleSelection.toggle}
                        />
                      )}
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <ExplorerEmptyState
              icon={Layers}
              title={moduleSearch ? 'No modules match' : 'No modules yet'}
              description={
                moduleSearch ? `No results for "${moduleSearch}".` : 'Add your first module to this series.'
              }
              action={
                moduleSearch
                  ? undefined
                  : { label: 'Create module', onClick: () => setCreateModuleOpen(true) }
              }
            />
          )}
        </TabsContent>

        {isTheory && (
          <TabsContent value="documents" className="mt-0 flex-1">
            <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-slate-100">
              {filteredDocs.length > 0 && (
                <input
                  type="checkbox"
                  checked={filteredDocIds.length > 0 && filteredDocIds.every((id) => docSelection.isSelected(id))}
                  onChange={() => docSelection.toggleAll(filteredDocIds)}
                  className="w-4 h-4 accent-primary cursor-pointer shrink-0"
                />
              )}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-8 text-sm"
                  placeholder="Search documents…"
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => toast.info('Upload document — coming soon')}
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Document</span>
              </Button>
            </div>

            {filteredDocs.length > 0 ? (
              <div className="py-1.5">
                {filteredDocs.map((d) => (
                  <DocumentRow
                    key={d._id}
                    document={d}
                    onRefresh={onRefresh}
                    selected={docSelection.isSelected(d._id)}
                    onSelect={docSelection.toggle}
                  />
                ))}
              </div>
            ) : (
              <ExplorerEmptyState
                icon={FileText}
                title={docSearch ? 'No documents match' : 'No documents yet'}
                description={
                  docSearch ? `No results for "${docSearch}".` : 'Add study material to this series.'
                }
                action={
                  docSearch
                    ? undefined
                    : { label: 'Add document', onClick: () => toast.info('Coming soon') }
                }
              />
            )}
          </TabsContent>
        )}
      </Tabs>

      <ModuleFormDialog
        open={createModuleOpen}
        onClose={() => setCreateModuleOpen(false)}
        onSuccess={() => { setCreateModuleOpen(false); onRefresh?.() }}
        seriesId={seriesId}
      />

      <ExplorerSelectionBar
        count={moduleSelection.count}
        onClear={moduleSelection.clear}
        actions={[
          {
            label: 'Publish',
            icon: <Eye className="w-3.5 h-3.5" />,
            onClick: bulkPublishModulesMutation.execute,
            loading: bulkPublishModulesMutation.loading,
          },
          {
            label: 'Unpublish',
            icon: <EyeOff className="w-3.5 h-3.5" />,
            onClick: bulkUnpublishModulesMutation.execute,
            loading: bulkUnpublishModulesMutation.loading,
            variant: 'amber',
          },
          {
            label: 'Activate',
            icon: <Power className="w-3.5 h-3.5" />,
            onClick: bulkActivateModulesMutation.execute,
            loading: bulkActivateModulesMutation.loading,
          },
        ]}
      />

      <ExplorerSelectionBar
        count={docSelection.count}
        onClear={docSelection.clear}
        actions={[
          {
            label: 'Publish',
            icon: <Eye className="w-3.5 h-3.5" />,
            onClick: bulkPublishDocsMutation.execute,
            loading: bulkPublishDocsMutation.loading,
          },
          {
            label: 'Unpublish',
            icon: <EyeOff className="w-3.5 h-3.5" />,
            onClick: bulkUnpublishDocsMutation.execute,
            loading: bulkUnpublishDocsMutation.loading,
            variant: 'amber',
          },
          {
            label: 'Archive',
            icon: <Archive className="w-3.5 h-3.5" />,
            onClick: bulkArchiveDocsMutation.execute,
            loading: bulkArchiveDocsMutation.loading,
            variant: 'amber',
          },
        ]}
      />
    </>
  )
}
