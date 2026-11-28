import { FileText, FolderInput, Layers, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { documentsService } from '@/services/documents.service'
import { modulesService } from '@/services/modules.service'
import { useActions } from '../../actions/ActionsContext'
import { useExplorerAccess } from '../../access'
import { usePanelSelection } from '../../context/PanelSelectionContext'
import type { ExplorerData } from '../../hooks/useExplorerData'
import { useReorder } from '../../hooks/useReorder'
import { useSelection } from '../../hooks/useSelection'
import { useUrlState } from '../../hooks/useUrlState'
import type { ExplorerFocus } from '../../parseExplorerPath'
import { ExplorerEmptyState, NoAccess } from '../ExplorerEmptyState'
import { ExplorerSelectionBar, type BulkAction } from '../ExplorerSelectionBar'
import { ChildrenListSkeleton } from '../ExplorerSkeleton'
import { ListToolbar } from '../ListToolbar'
import { SortableList } from '../SortableList'
import { DocumentRow, ModuleRow, type DocRowData } from '../rows/rows'
import { FolderTabs, matches, readableTabs, selectAllProps, useBulkActions } from './shared'

const NONE: never[] = []

export function SeriesChildren({ data, focus }: { data: ExplorerData; focus: Extract<ExplorerFocus, { level: 'series' }> }) {
  const { can } = useExplorerAccess()
  const { create } = usePanelSelection()
  const { open } = useActions()
  const [tab, setTab] = useUrlState('tab', 'modules')
  const [search, setSearch] = useUrlState('q')
  const [docSearch, setDocSearch] = useUrlState('dq')
  const series = data.currentSeries
  const modules = series?.modules ?? NONE
  const documents = (series?.documents ?? NONE) as unknown as DocRowData[]

  const moduleOrder = useReorder(modules, (ids) => modulesService.reorder(ids), data.refetch, 'modules')
  const docOrder = useReorder(documents, (ids) => documentsService.reorder(ids), data.refetch, 'documents')
  const moduleSelection = useSelection(modules)
  const docSelection = useSelection(documents)
  const moduleShared = useBulkActions('module', moduleSelection, modules.map((m) => ({ id: m._id, name: m.name })))
  const moduleBulk: BulkAction[] = can('module', 'update')
    ? [{
        label: 'Move to series…',
        icon: <FolderInput className="h-3.5 w-3.5" />,
        onClick: () => open({
          type: 'moveContent',
          kind: 'module-move',
          items: modules.filter((m) => moduleSelection.isSelected(m._id)).map((m) => ({ id: m._id, name: m.name, parentId: focus.seriesId })),
          onDone: moduleSelection.clear,
        }),
      }, ...moduleShared]
    : moduleShared
  const docBulk = useBulkActions('document', docSelection, documents.map((d) => ({ id: d._id, name: d.title })))

  const filteredModules = moduleOrder.ordered.filter((m) => matches(m.name, search))
  const filteredDocs = docOrder.ordered.filter((d) => matches(d.title, docSearch))
  const addDocument = () => open({ type: 'newDocument', place: { subjectId: focus.subjectId, seriesId: focus.seriesId, seriesName: series?.name } })

  const tabs = readableTabs([
    { value: 'modules', label: 'Modules', count: series ? modules.length : undefined, icon: Layers, hidden: !can('module', 'read') },
    { value: 'documents', label: 'Documents', count: series ? documents.length : undefined, icon: FileText, hidden: !can('document', 'read') },
  ])
  const current = tabs.some((t) => t.value === tab) ? tab : tabs[0].value

  return (
    <Tabs value={current} onValueChange={(t) => { moduleSelection.clear(); docSelection.clear(); setTab(t) }} className="flex min-h-0 flex-1 flex-col">
      <FolderTabs tabs={tabs} label="What is in this series" />

      <TabsContent value="modules" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
        {!can('module', 'read') ? <NoAccess what="modules" /> : (
          <>
            <ListToolbar
              search={search}
              onSearch={setSearch}
              placeholder="Search modules"
              selectAll={moduleBulk.length > 0 && filteredModules.length > 0 ? selectAllProps(moduleSelection, filteredModules.map((m) => m._id), 'modules') : undefined}
            >
              {can('module', 'create') && <Button size="sm" className="h-9" onClick={() => create('module')}><Plus className="h-4 w-4" /> New Module</Button>}
            </ListToolbar>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {!series ? <ChildrenListSkeleton /> : filteredModules.length > 0 ? (
                <SortableList
                  items={filteredModules}
                  label="Modules"
                  sensors={moduleOrder.sensors}
                  onDragEnd={moduleOrder.onDragEnd}
                  disabled={!can('module', 'update')}
                  render={(m, drag) => <ModuleRow module={m} parentFocus={focus} selected={moduleSelection.isSelected(m._id)} onSelect={moduleBulk.length > 0 ? moduleSelection.toggle : undefined} {...drag} />}
                />
              ) : modules.length > 0 ? (
                <ExplorerEmptyState icon={Layers} title="No modules match" description={`Nothing here is called "${search}".`} action={{ label: 'Clear search', onClick: () => setSearch('') }} />
              ) : (
                <ExplorerEmptyState icon={Layers} title="No modules yet" description="Add the first module. Videos go inside it." action={can('module', 'create') ? { label: 'Create module', onClick: () => create('module') } : undefined} />
              )}
            </div>
            <ExplorerSelectionBar count={moduleSelection.count} onClear={moduleSelection.clear} actions={moduleBulk} />
          </>
        )}
      </TabsContent>

      <TabsContent value="documents" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
        {!can('document', 'read') ? <NoAccess what="documents" /> : (
          <>
            <ListToolbar
              search={docSearch}
              onSearch={setDocSearch}
              placeholder="Search documents"
              selectAll={docBulk.length > 0 && filteredDocs.length > 0 ? selectAllProps(docSelection, filteredDocs.map((d) => d._id), 'documents') : undefined}
            >
              {can('document', 'create') && <Button size="sm" className="h-9" onClick={addDocument}><Plus className="h-4 w-4" /> Add Document</Button>}
            </ListToolbar>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {!series ? <ChildrenListSkeleton /> : filteredDocs.length > 0 ? (
                <SortableList
                  items={filteredDocs}
                  label="Documents"
                  sensors={docOrder.sensors}
                  onDragEnd={docOrder.onDragEnd}
                  disabled={!can('document', 'update')}
                  render={(d, drag) => <DocumentRow document={{ ...d, series_id: null }} selected={docSelection.isSelected(d._id)} onSelect={docBulk.length > 0 ? docSelection.toggle : undefined} {...drag} />}
                />
              ) : documents.length > 0 ? (
                <ExplorerEmptyState icon={FileText} title="No documents match" description={`Nothing here is called "${docSearch}".`} action={{ label: 'Clear search', onClick: () => setDocSearch('') }} />
              ) : (
                <ExplorerEmptyState icon={FileText} title="No documents yet" description="Add study material to this series." action={can('document', 'create') ? { label: 'Add document', onClick: addDocument } : undefined} />
              )}
            </div>
            <ExplorerSelectionBar count={docSelection.count} onClear={docSelection.clear} actions={docBulk} />
          </>
        )}
      </TabsContent>
    </Tabs>
  )
}
