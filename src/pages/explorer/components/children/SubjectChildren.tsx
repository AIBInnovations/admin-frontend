import { FileText, Package, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { ErrorState } from '@/components/common/detail'
import { useActions } from '../../actions/ActionsContext'
import { useExplorerAccess } from '../../access'
import { usePanelSelection } from '../../context/PanelSelectionContext'
import type { ExplorerData } from '../../hooks/useExplorerData'
import { useSelection } from '../../hooks/useSelection'
import { useUrlState } from '../../hooks/useUrlState'
import type { ExplorerFocus } from '../../parseExplorerPath'
import { ExplorerEmptyState, NoAccess } from '../ExplorerEmptyState'
import { ExplorerSelectionBar } from '../ExplorerSelectionBar'
import { ChildrenListSkeleton } from '../ExplorerSkeleton'
import { ListToolbar } from '../ListToolbar'
import { DocumentRow, PackageRow } from '../rows/rows'
import { FolderTabs, matches, readableTabs, selectAllProps, useBulkActions } from './shared'

export function SubjectChildren({ data, focus }: { data: ExplorerData; focus: Extract<ExplorerFocus, { level: 'subject' }> }) {
  const { can } = useExplorerAccess()
  const { create } = usePanelSelection()
  const { open } = useActions()
  const [tab, setTab] = useUrlState('tab', 'packages')
  const [search, setSearch] = useUrlState('q')
  const [docSearch, setDocSearch] = useUrlState('dq')
  const { packages, subjectDocuments } = data
  const docs = subjectDocuments ?? []
  const selection = useSelection(docs)
  const bulk = useBulkActions('document', selection, docs.map((d) => ({ id: d._id, name: d.title })))

  const seePackages = can('package', 'read')
  const seeDocs = can('document', 'read')
  const filtered = (packages ?? []).filter((p) => matches(p.name, search))
  const filteredDocs = docs.filter((d) => matches(d.title, docSearch))
  const addDocument = () => open({ type: 'newDocument', place: { subjectId: focus.subjectId, packageOptions: (packages ?? []).map((p) => ({ _id: p._id, name: p.name })) } })
  const canAddDocument = can('document', 'create') && can('series', 'read')

  const tabs = readableTabs([
    { value: 'packages', label: 'Packages', count: packages?.length, icon: Package, hidden: !seePackages },
    { value: 'documents', label: 'Documents', count: subjectDocuments?.length, icon: FileText, hidden: !seeDocs },
  ])
  const current = tabs.some((t) => t.value === tab) ? tab : tabs[0].value

  return (
    <Tabs value={current} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
      <FolderTabs tabs={tabs} label="What is in this subject" />

      <TabsContent value="packages" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
        {!seePackages ? <NoAccess what="packages" /> : (
          <>
            <ListToolbar search={search} onSearch={setSearch} placeholder="Search packages">
              {can('package', 'create') && <Button size="sm" className="h-9" onClick={() => create('package')}><Plus className="h-4 w-4" /> New Package</Button>}
            </ListToolbar>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {data.packagesError ? <Failed what="packages" error={data.packagesError} onRetry={data.refetch} /> : !packages ? <ChildrenListSkeleton /> : filtered.length > 0 ? (
                <ul aria-label="Packages" className="py-1.5">{filtered.map((p) => <li key={p._id}><PackageRow pkg={p} parentFocus={focus} /></li>)}</ul>
              ) : packages.length > 0 ? (
                <ExplorerEmptyState icon={Package} title="No packages match" description={`Nothing here is called "${search}".`} action={{ label: 'Clear search', onClick: () => setSearch('') }} />
              ) : (
                <ExplorerEmptyState icon={Package} title="No packages yet" description="Add the first package of this subject. Series, modules and videos go inside it." action={can('package', 'create') ? { label: 'Create package', onClick: () => create('package') } : undefined} />
              )}
            </div>
          </>
        )}
      </TabsContent>

      <TabsContent value="documents" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
        {!seeDocs ? <NoAccess what="documents" /> : (
          <>
            <ListToolbar
              search={docSearch}
              onSearch={setDocSearch}
              placeholder="Search documents"
              selectAll={bulk.length > 0 && filteredDocs.length > 0 ? selectAllProps(selection, filteredDocs.map((d) => d._id), 'documents') : undefined}
            >
              {canAddDocument && <Button size="sm" className="h-9" onClick={addDocument}><Plus className="h-4 w-4" /> Add Document</Button>}
            </ListToolbar>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {data.documentsError ? <Failed what="documents" error={data.documentsError} onRetry={data.refetch} /> : !subjectDocuments ? <ChildrenListSkeleton /> : filteredDocs.length > 0 ? (
                <ul aria-label="Documents" className="py-1.5">
                  {filteredDocs.map((d) => <li key={d._id}><DocumentRow document={d} selected={selection.isSelected(d._id)} onSelect={bulk.length > 0 ? selection.toggle : undefined} /></li>)}
                </ul>
              ) : docs.length > 0 ? (
                <ExplorerEmptyState icon={FileText} title="No documents match" description={`Nothing here is called "${docSearch}".`} action={{ label: 'Clear search', onClick: () => setDocSearch('') }} />
              ) : (
                <ExplorerEmptyState icon={FileText} title="No documents yet" description="Documents of this subject, including those inside its series, appear here." action={canAddDocument ? { label: 'Add document', onClick: addDocument } : undefined} />
              )}
            </div>
            <ExplorerSelectionBar count={selection.count} onClear={selection.clear} actions={bulk} />
          </>
        )}
      </TabsContent>
    </Tabs>
  )
}

function Failed({ what, error, onRetry }: { what: string; error: { status?: number; message: string }; onRetry: () => Promise<void> }) {
  if (error.status === 403) return <NoAccess what={what} />
  return <div className="p-4"><ErrorState title={`The ${what} could not be loaded`} message={error.message} onRetry={() => void onRetry()} /></div>
}
