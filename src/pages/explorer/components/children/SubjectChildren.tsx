import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Plus, Package, FileText, Eye, EyeOff, Archive } from 'lucide-react'
import { PackageRow } from '../rows/PackageRow'
import { DocumentRow } from '../rows/DocumentRow'
import { ExplorerEmptyState } from '../ExplorerEmptyState'
import { ChildrenListSkeleton } from '../ExplorerSkeleton'
import { ExplorerSelectionBar } from '../ExplorerSelectionBar'
import { CreateDocumentDialog } from '../../forms/CreateDocumentDialog'
import { BulkImpactDialog } from '../../dialogs/BulkImpactDialog'
import { classifyPublish, classifyUnpublish, classifyArchive } from '../../dialogs/bulkImpact'
import { usePanelSelection } from '../../context/PanelSelectionContext'
import { useSelection } from '../../hooks/useSelection'
import { documentsService } from '@/services/documents.service'
import { publishService } from '@/services/publish.service'
import type { Package as PkgType } from '@/services/packages.service'
import type { Document } from '@/services/documents.service'
import type { ExplorerFocus } from '../../parseExplorerPath'

interface SubjectChildrenProps {
  packages: PkgType[] | undefined
  loading: boolean
  focus: ExplorerFocus
  onRefresh?: () => void
  subjectDocuments?: Document[]
}

export function SubjectChildren({ packages, loading, focus, onRefresh, subjectDocuments }: SubjectChildrenProps) {
  const [search, setSearch] = useState('')
  const [docSearch, setDocSearch] = useState('')
  const [docCreateOpen, setDocCreateOpen] = useState(false)
  const docSelection = useSelection()
  const { select } = usePanelSelection()

  const subjectId = focus.level === 'subject' ? focus.subjectId : ''
  const newPackage = () => select({ kind: 'package', entity: null, ctx: { subjectId } })

  const filtered = packages?.filter((p) =>
    search.length < 1 ? true : p.name.toLowerCase().includes(search.toLowerCase()),
  )

  const filteredDocs = (subjectDocuments ?? []).filter((d) =>
    docSearch.length < 1 ? true : d.title.toLowerCase().includes(docSearch.toLowerCase()),
  )
  const filteredDocIds = filteredDocs.map((d) => d._id)

  const [docBulkOp, setDocBulkOp] = useState<'publish' | 'unpublish' | 'archive' | null>(null)
  const selectedDocItems = filteredDocs.filter((d) => docSelection.isSelected(d._id)).map((d) => ({ id: d._id, name: d.title }))

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
      <Tabs defaultValue="packages" className="flex flex-col flex-1">
        <div className="border-b border-slate-100">
          <TabsList className="h-auto rounded-none bg-transparent border-b-0 px-4 sm:px-6 pt-1 gap-4">
            <TabsTrigger
              value="packages"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 gap-1.5 text-sm"
            >
              <Package className="w-3.5 h-3.5" />
              Packages {packages && `(${packages.length})`}
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 gap-1.5 text-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              Documents {(subjectDocuments?.length ?? 0) > 0 && `(${subjectDocuments!.length})`}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="packages" className="mt-0 flex-1">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-slate-100">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 h-8 text-sm"
                placeholder="Search packages…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button size="sm" className="gap-1.5 shrink-0" onClick={newPackage}>
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Package</span>
            </Button>
          </div>

          {loading && !packages ? (
            <ChildrenListSkeleton />
          ) : filtered && filtered.length > 0 ? (
            <div className="py-1.5">
              {filtered.map((pkg) => (
                <PackageRow
                  key={pkg._id}
                  pkg={pkg}
                  parentFocus={focus}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          ) : (
            <ExplorerEmptyState
              icon={Package}
              title={search ? 'No packages match' : 'No packages yet'}
              description={
                search
                  ? `No results for "${search}".`
                  : 'Add your first package to this subject.'
              }
              action={search ? undefined : { label: 'Create package', onClick: newPackage }}
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

          {loading && !subjectDocuments ? (
            <ChildrenListSkeleton />
          ) : filteredDocs.length > 0 ? (
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
                docSearch
                  ? `No results for "${docSearch}".`
                  : 'Documents under this subject (including those inside its series) appear here.'
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
        subjectId={subjectId}
        packageOptions={(packages ?? []).map((p) => ({ _id: p._id, name: p.name }))}
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
