import { Boxes, FileText, FolderInput, ListTree, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { seriesService } from '@/services/series.service'
import { useActions } from '../../actions/ActionsContext'
import { useExplorerAccess } from '../../access'
import { usePanelSelection } from '../../context/PanelSelectionContext'
import type { ExplorerData } from '../../hooks/useExplorerData'
import { useReorder } from '../../hooks/useReorder'
import { useSelection } from '../../hooks/useSelection'
import { useUrlState } from '../../hooks/useUrlState'
import { BundledRow, describeContents } from '../../panel/BundleEditor'
import type { ExplorerFocus } from '../../parseExplorerPath'
import { plural } from '../../ui/text'
import { ExplorerEmptyState, NoAccess } from '../ExplorerEmptyState'
import { ExplorerSelectionBar, type BulkAction } from '../ExplorerSelectionBar'
import { ChildrenListSkeleton } from '../ExplorerSkeleton'
import { ListToolbar } from '../ListToolbar'
import { SortableList } from '../SortableList'
import { DocumentRow, SeriesRow, type DocRowData } from '../rows/rows'
import { FolderTabs, matches, readableTabs, selectAllProps, useBulkActions, type FolderTab } from './shared'

const NONE: never[] = []

export function PackageChildren({ data, focus }: { data: ExplorerData; focus: Extract<ExplorerFocus, { level: 'package' }> }) {
  const { can } = useExplorerAccess()
  const { create } = usePanelSelection()
  const { open } = useActions()
  const pkg = data.packageDetail
  const series = pkg?.series ?? NONE
  const bundle = pkg?.bundle ?? null
  // A combo usually has no series of its own: open on what it includes.
  const fallback = bundle && series.length === 0 ? 'included' : 'series'
  const [tab, setTab] = useUrlState('tab', fallback)
  const [search, setSearch] = useUrlState('q')
  const [docSearch, setDocSearch] = useUrlState('dq')

  const { ordered, sensors, onDragEnd } = useReorder(series, (ids) => seriesService.reorder(ids), data.refetch, 'series')
  const selection = useSelection(series)
  const shared = useBulkActions('series', selection, series.map((s) => ({ id: s._id, name: s.name })))
  const bulk: BulkAction[] = can('series', 'update')
    ? [{
        label: 'Move to package…',
        icon: <FolderInput className="h-3.5 w-3.5" />,
        onClick: () => open({
          type: 'moveContent',
          kind: 'series-move',
          items: series.filter((s) => selection.isSelected(s._id)).map((s) => ({ id: s._id, name: s.name, parentId: focus.packageId })),
          onDone: selection.clear,
        }),
      }, ...shared]
    : shared
  const filtered = ordered.filter((s) => matches(s.name, search))

  const totalDocs = series.reduce((n, s) => n + (s.documents?.length ?? 0), 0)
  const groups = series
    .map((s) => ({ series: s, docs: (s.documents ?? []).filter((d) => matches(d.title, docSearch)) as unknown as DocRowData[] }))
    .filter((g) => !docSearch || g.docs.length > 0)

  const tabs: FolderTab[] = readableTabs([
    ...(bundle ? [{ value: 'included', label: 'Included packages', count: bundle.packages.length, icon: Boxes }] : []),
    { value: 'series', label: 'Series', count: pkg ? series.length : undefined, icon: ListTree, hidden: !can('series', 'read') },
    { value: 'documents', label: 'Documents', count: pkg ? totalDocs : undefined, icon: FileText, hidden: !can('document', 'read') || !can('series', 'read') },
  ])
  const current = tabs.some((t) => t.value === tab) ? tab : tabs[0].value

  return (
    <Tabs value={current} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
      <FolderTabs tabs={tabs} label="What is in this package" />

      {bundle && (
        <TabsContent value="included" className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain data-[state=inactive]:hidden">
          <p className="border-b border-border px-4 py-3 text-[13px] text-muted-foreground">
            Buying this combo gives access to {plural(bundle.packages.length, 'package')}: {describeContents(pkg?.content_summary)} in all.
          </p>
          {bundle.missing_count > 0 && <p className="px-4 pt-3 text-[13px] text-warning">{plural(bundle.missing_count, 'included package')} no longer {bundle.missing_count === 1 ? 'exists' : 'exist'}. Save the combo to clear {bundle.missing_count === 1 ? 'it' : 'them'}.</p>}
          {bundle.packages.length > 0
            ? <ul aria-label="Included packages" className="divide-y divide-border">{bundle.packages.map((p) => <BundledRow key={p._id} pkg={p} />)}</ul>
            : <ExplorerEmptyState icon={Boxes} title="Nothing left inside" description="Every package this combo included was deleted. Add packages in the editor." />}
        </TabsContent>
      )}

      <TabsContent value="series" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
        {!can('series', 'read') ? <NoAccess what="series" /> : (
          <>
            <ListToolbar
              search={search}
              onSearch={setSearch}
              placeholder="Search series"
              selectAll={bulk.length > 0 && filtered.length > 0 ? selectAllProps(selection, filtered.map((s) => s._id), 'series') : undefined}
            >
              {can('series', 'create') && <Button size="sm" className="h-9" onClick={() => create('series')}><Plus className="h-4 w-4" /> New Series</Button>}
            </ListToolbar>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {!pkg ? <ChildrenListSkeleton /> : filtered.length > 0 ? (
                <SortableList
                  items={filtered}
                  label="Series"
                  sensors={sensors}
                  onDragEnd={onDragEnd}
                  disabled={!can('series', 'update')}
                  render={(s, drag) => <SeriesRow series={s} parentFocus={focus} selected={selection.isSelected(s._id)} onSelect={bulk.length > 0 ? selection.toggle : undefined} {...drag} />}
                />
              ) : series.length > 0 ? (
                <ExplorerEmptyState icon={ListTree} title="No series match" description={`Nothing here is called "${search}".`} action={{ label: 'Clear search', onClick: () => setSearch('') }} />
              ) : (
                <ExplorerEmptyState
                  icon={ListTree}
                  title={bundle ? 'No series of its own' : 'No series yet'}
                  description={bundle ? 'Its content comes from the included packages.' : 'Add the first series. Modules and documents go inside it.'}
                  action={can('series', 'create') ? { label: 'Create series', onClick: () => create('series') } : undefined}
                />
              )}
            </div>
            <ExplorerSelectionBar count={selection.count} onClear={selection.clear} actions={bulk} />
          </>
        )}
      </TabsContent>

      <TabsContent value="documents" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
        {!can('document', 'read') ? <NoAccess what="documents" /> : (
          <>
            <ListToolbar search={docSearch} onSearch={setDocSearch} placeholder="Search documents" />
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {!pkg ? <ChildrenListSkeleton /> : series.length === 0 ? (
                <ExplorerEmptyState icon={FileText} title={bundle ? 'No documents of its own' : 'No series yet'} description={bundle ? 'Its documents come from the included packages.' : 'Documents belong to a series. Add a series first.'} />
              ) : groups.length === 0 ? (
                <ExplorerEmptyState icon={FileText} title="No documents match" description={`Nothing here is called "${docSearch}".`} action={{ label: 'Clear search', onClick: () => setDocSearch('') }} />
              ) : groups.map(({ series: s, docs }) => (
                <section key={s._id} aria-label={s.name} className="py-1.5">
                  <div className="flex items-center justify-between gap-3 px-4 py-1">
                    <h3 className="min-w-0 truncate text-[13px] font-semibold text-foreground">{s.name} <span className="font-normal tabular-nums text-muted-foreground">({docs.length})</span></h3>
                    {can('document', 'create') && (
                      <Button size="sm" variant="ghost" className="h-8 shrink-0" onClick={() => open({ type: 'newDocument', place: { subjectId: focus.subjectId, seriesId: s._id, seriesName: s.name } })}><Plus className="h-3.5 w-3.5" /> Add Document</Button>
                    )}
                  </div>
                  {docs.length > 0
                    ? <ul aria-label={`Documents in ${s.name}`}>{docs.map((d) => <li key={d._id}><DocumentRow document={d} /></li>)}</ul>
                    : <p className="px-4 pb-2 text-[13px] text-muted-foreground">No documents in this series.</p>}
                </section>
              ))}
            </div>
          </>
        )}
      </TabsContent>
    </Tabs>
  )
}
