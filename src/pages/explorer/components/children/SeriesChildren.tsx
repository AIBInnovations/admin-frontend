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
import { CreateDocumentDialog } from '../../forms/CreateDocumentDialog'
import { BulkImpactDialog } from '../../dialogs/BulkImpactDialog'
import { classifyPublish, classifyUnpublish, classifyArchive } from '../../dialogs/bulkImpact'
import { usePanelSelection } from '../../context/PanelSelectionContext'
import { useSelection } from '../../hooks/useSelection'
import { modulesService } from '@/services/modules.service'
import { documentsService } from '@/services/documents.service'
import { publishService } from '@/services/publish.service'
import { toast } from 'sonner'
import type { PackageDetailDocument, PackageDetailModule, PackageDetailSeries } from '@/services/packages.service'
import type { ExplorerFocus } from '../../parseExplorerPath'

interface SeriesChildrenProps {
  series: PackageDetailSeries | undefined
  loading: boolean
  focus: ExplorerFocus
  isTheory?: boolean
  onRefresh?: () => void
}

export function SeriesChildren({ series, loading, focus, onRefresh }: SeriesChildrenProps) {
  const [moduleSearch, setModuleSearch] = useState('')
  const [docSearch, setDocSearch] = useState('')
  const [docCreateOpen, setDocCreateOpen] = useState(false)
  const [localModules, setLocalModules] = useState<PackageDetailModule[]>([])
  const [localDocuments, setLocalDocuments] = useState<PackageDetailDocument[]>([])
  const moduleSelection = useSelection()
  const docSelection = useSelection()
  const { select } = usePanelSelection()

  const modules = series?.modules ?? []
  useEffect(() => { setLocalModules([]); setLocalDocuments([]) }, [series?._id])
  const documents = series?.documents ?? []
  const seriesId = series?._id ?? (focus.level === 'series' ? focus.seriesId : '')
  const newModule = () => select({ kind: 'module', entity: null, ctx: { seriesId } })

  const displayModules = localModules.length > 0 ? localModules : modules
  const displayDocuments = localDocuments.length > 0 ? localDocuments : documents

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
      await modulesService.reorder(reordered.map((m) => m._id))
      toast.success('Order updated')
      onRefresh?.()
    } catch {
      setLocalModules(displayModules)
      toast.error('Failed to reorder')
    }
  }

  async function handleDocumentDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = displayDocuments.findIndex((d) => d._id === active.id)
    const newIndex = displayDocuments.findIndex((d) => d._id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(displayDocuments, oldIndex, newIndex)
    setLocalDocuments(reordered)

    try {
      await documentsService.reorder(reordered.map((d) => d._id))
      toast.success('Order updated')
      onRefresh?.()
    } catch {
      setLocalDocuments(displayDocuments)
      toast.error('Failed to reorder')
    }
  }

  const filteredModules = displayModules.filter((m) =>
    moduleSearch.length < 1 ? true : m.name.toLowerCase().includes(moduleSearch.toLowerCase()),
  )
  const filteredModuleIds = filteredModules.map((m) => m._id)

  const filteredDocs = displayDocuments.filter((d) =>
    docSearch.length < 1 ? true : d.title.toLowerCase().includes(docSearch.toLowerCase()),
  )
  const filteredDocIds = filteredDocs.map((d) => d._id)

  const [moduleBulkOp, setModuleBulkOp] = useState<'publish' | 'unpublish' | 'activate' | null>(null)
  const [docBulkOp, setDocBulkOp] = useState<'publish' | 'unpublish' | 'archive' | null>(null)

  const selectedModuleItems = filteredModules.filter((m) => moduleSelection.isSelected(m._id)).map((m) => ({ id: m._id, name: m.name }))
  const selectedDocItems = filteredDocs.filter((d) => docSelection.isSelected(d._id)).map((d) => ({ id: d._id, name: d.title }))

  const moduleCfg =
    moduleBulkOp === 'publish'
      ? { title: 'Publish modules', actionLabel: 'Publish', destructive: false, classify: (id: string) => classifyPublish('module', id), runOne: (id: string) => publishService.publish('module', id) }
      : moduleBulkOp === 'unpublish'
      ? { title: 'Unpublish modules', actionLabel: 'Unpublish', destructive: true, classify: (id: string) => classifyUnpublish('module', id), runOne: (id: string) => publishService.unpublish('module', id) }
      : moduleBulkOp === 'activate'
      ? { title: 'Activate modules', actionLabel: 'Activate', destructive: false, classify: undefined, runOne: (id: string) => modulesService.toggleActive(id, true) }
      : null

  const docCfg =
    docBulkOp === 'publish'
      ? { title: 'Publish documents', actionLabel: 'Publish', destructive: false, classify: (id: string) => classifyPublish('document', id), runOne: (id: string) => publishService.publish('document', id) }
      : docBulkOp === 'unpublish'
      ? { title: 'Unpublish documents', actionLabel: 'Unpublish', destructive: true, classify: (id: string) => classifyUnpublish('document', id), runOne: (id: string) => publishService.unpublish('document', id) }
      : docBulkOp === 'archive'
      ? { title: 'Archive documents', actionLabel: 'Archive', destructive: true, classify: (id: string) => classifyArchive(documentsService.getDeleteImpact.bind(documentsService), id), runOne: (id: string) => documentsService.archive(id) }
      : null

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
            <TabsTrigger
              value="documents"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 gap-1.5 text-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              Documents {documents.length > 0 && `(${documents.length})`}
            </TabsTrigger>
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
            <Button size="sm" className="gap-1.5 shrink-0" onClick={newModule}>
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
              action={moduleSearch ? undefined : { label: 'Create module', onClick: newModule }}
            />
          )}
        </TabsContent>

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
              <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setDocCreateOpen(true)}>
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Document</span>
              </Button>
            </div>

            {filteredDocs.length > 0 ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDocumentDragEnd}>
                <SortableContext items={filteredDocs.map((d) => d._id)} strategy={verticalListSortingStrategy}>
                  <div className="py-1.5">
                    {filteredDocs.map((d) => (
                      <SortableItem key={d._id} id={d._id}>
                        {({ dragHandleProps, isDragging }) => (
                          <DocumentRow
                            document={d}
                            onRefresh={onRefresh}
                            selected={docSelection.isSelected(d._id)}
                            onSelect={docSelection.toggle}
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
                icon={FileText}
                title={docSearch ? 'No documents match' : 'No documents yet'}
                description={
                  docSearch ? `No results for "${docSearch}".` : 'Add study material to this series.'
                }
                action={docSearch ? undefined : { label: 'Add document', onClick: () => setDocCreateOpen(true) }}
              />
            )}
          </TabsContent>
      </Tabs>

      <CreateDocumentDialog
        open={docCreateOpen}
        onClose={() => setDocCreateOpen(false)}
        onSuccess={() => { setDocCreateOpen(false); onRefresh?.() }}
        seriesId={seriesId}
        seriesName={series?.name}
        subjectId={'subjectId' in focus ? focus.subjectId : undefined}
      />

      <ExplorerSelectionBar
        count={moduleSelection.count}
        onClear={moduleSelection.clear}
        actions={[
          { label: 'Publish', icon: <Eye className="w-3.5 h-3.5" />, onClick: () => setModuleBulkOp('publish') },
          { label: 'Unpublish', icon: <EyeOff className="w-3.5 h-3.5" />, onClick: () => setModuleBulkOp('unpublish'), variant: 'amber' },
          { label: 'Activate', icon: <Power className="w-3.5 h-3.5" />, onClick: () => setModuleBulkOp('activate') },
        ]}
      />

      <ExplorerSelectionBar
        count={docSelection.count}
        onClear={docSelection.clear}
        actions={[
          { label: 'Publish', icon: <Eye className="w-3.5 h-3.5" />, onClick: () => setDocBulkOp('publish') },
          { label: 'Unpublish', icon: <EyeOff className="w-3.5 h-3.5" />, onClick: () => setDocBulkOp('unpublish'), variant: 'amber' },
          { label: 'Archive', icon: <Archive className="w-3.5 h-3.5" />, onClick: () => setDocBulkOp('archive'), variant: 'amber' },
        ]}
      />

      {moduleCfg && (
        <BulkImpactDialog
          open={!!moduleBulkOp}
          onClose={() => setModuleBulkOp(null)}
          onSuccess={() => { setModuleBulkOp(null); moduleSelection.clear(); onRefresh?.() }}
          items={selectedModuleItems}
          title={moduleCfg.title}
          actionLabel={moduleCfg.actionLabel}
          destructive={moduleCfg.destructive}
          classify={moduleCfg.classify}
          runOne={moduleCfg.runOne}
        />
      )}

      {docCfg && (
        <BulkImpactDialog
          open={!!docBulkOp}
          onClose={() => setDocBulkOp(null)}
          onSuccess={() => { setDocBulkOp(null); docSelection.clear(); onRefresh?.() }}
          items={selectedDocItems}
          title={docCfg.title}
          actionLabel={docCfg.actionLabel}
          destructive={docCfg.destructive}
          classify={docCfg.classify}
          runOne={docCfg.runOne}
        />
      )}
    </>
  )
}
