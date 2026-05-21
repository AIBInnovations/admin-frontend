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
import { usePanelSelection } from '../../context/PanelSelectionContext'
import { useSelection } from '../../hooks/useSelection'
import { useExplorerMutation } from '../../hooks/useExplorerMutation'
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
                  : 'Subject-level documents attached to this subject appear here.'
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
